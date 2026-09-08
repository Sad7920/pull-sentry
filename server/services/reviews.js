import { fetchPullTitles } from "../github.js"
import { prisma } from "../db.js"
import { findOwnedRepo } from "../lib/auth.js"
import { AppError } from "../lib/errors.js"
import { parseOwnerRepo } from "../lib/repo-name.js"
import { runPrReview } from "../review-graph.js"
import { captureCaughtError } from "../sentry.js"

function isRetryableDbError(error) {
  return ["P2028", "P2024", "P1001", "P1017"].includes(error.code)
}

async function persistReviewWithCredit({
  userId,
  connectedRepoId,
  prNumber,
  findings,
}) {
  let lastError

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const updated = await prisma.user.updateMany({
        where: { id: userId, reviewCredits: { gt: 0 } },
        data: { reviewCredits: { decrement: 1 } },
      })

      if (updated.count === 0) {
        throw new AppError(
          403,
          "You're out of review credits. Reviews are paused until credits are restored.",
          "NO_REVIEW_CREDITS"
        )
      }

      try {
        const review = await prisma.review.create({
          data: {
            connectedRepoId,
            prNumber,
            findings,
          },
          select: {
            id: true,
            connectedRepoId: true,
            prNumber: true,
            findings: true,
            createdAt: true,
          },
        })
        const refreshed = await prisma.user.findUnique({
          where: { id: userId },
          select: { reviewCredits: true },
        })

        return { review, reviewCredits: refreshed.reviewCredits }
      } catch (error) {
        await prisma.user
          .update({
            where: { id: userId },
            data: { reviewCredits: { increment: 1 } },
          })
          .catch(() => {})
        throw error
      }
    } catch (error) {
      lastError = error
      if (error instanceof AppError || !isRetryableDbError(error)) {
        throw error
      }

      await prisma.$queryRaw`SELECT 1`.catch(() => {})
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }

  throw lastError
}

export async function reviewOwnedPullRequest(user, { repoId, prNumber }) {
  const connectedRepo = await findOwnedRepo(user.id, repoId)
  const parsed = parseOwnerRepo(connectedRepo.repoName)

  if (connectedRepo.provider !== "github") {
    throw new AppError(400, "Reviews are only available for GitHub repos")
  }

  if (!parsed) {
    throw new AppError(400, "Invalid repo name")
  }

  if (user.reviewCredits < 1) {
    throw new AppError(
      403,
      "You're out of review credits. Reviews are paused until credits are restored.",
      "NO_REVIEW_CREDITS"
    )
  }

  try {
    const findings = await runPrReview({
      clerkUserId: user.clerkId,
      repoId: connectedRepo.id,
      owner: parsed.owner,
      repo: parsed.repo,
      prNumber,
    })

    const { review, reviewCredits } = await persistReviewWithCredit({
      userId: user.id,
      connectedRepoId: connectedRepo.id,
      prNumber,
      findings,
    })

    return {
      id: review.id,
      connectedRepoId: review.connectedRepoId,
      prNumber: review.prNumber,
      findings: review.findings,
      createdAt: review.createdAt,
      reviewCredits,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    captureCaughtError(error, {
      userId: user.clerkId,
      repoId,
      prNumber,
      step: "review",
    })

    if (error.code === "GITHUB_UNAUTHORIZED") {
      throw new AppError(401, error.message, error.code)
    }

    if (error.code === "GITHUB_PR_NOT_FOUND") {
      throw new AppError(404, error.message, error.code)
    }

    if (error.code === "GROQ_UNAVAILABLE" || error.code === "GEMINI_UNAVAILABLE") {
      throw new AppError(503, error.message, error.code)
    }

    if (error.code === "GROQ_ERROR" || error.code === "GEMINI_ERROR") {
      throw new AppError(502, error.message, error.code)
    }

    if (isRetryableDbError(error)) {
      throw new AppError(
        503,
        "The review finished, but saving it timed out. Please try again in a moment."
      )
    }

    throw new AppError(502, "Failed to review pull request")
  }
}

export async function listOwnedRepoReviewFindings(user, repoId) {
  const connectedRepo = await findOwnedRepo(user.id, repoId)

  let reviews

  try {
    reviews = await prisma.review.findMany({
      where: { connectedRepoId: connectedRepo.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        prNumber: true,
        findings: true,
        createdAt: true,
      },
    })
  } catch (error) {
    captureCaughtError(error, {
      userId: user.clerkId,
      repoId: connectedRepo.id,
      step: "reviews.list",
    })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }

  const parsed = parseOwnerRepo(connectedRepo.repoName)
  let titles = {}

  if (parsed && connectedRepo.provider === "github") {
    try {
      titles = await fetchPullTitles(
        user.clerkId,
        parsed.owner,
        parsed.repo,
        reviews.map((review) => review.prNumber),
        { userId: user.clerkId, repoId: connectedRepo.id }
      )
    } catch (error) {
      captureCaughtError(error, {
        userId: user.clerkId,
        repoId: connectedRepo.id,
        step: "github.fetchPullTitles",
      })
    }
  }

  const findings = reviews.flatMap((review) => {
    const items = Array.isArray(review.findings) ? review.findings : []

    return items.map((finding) => ({
      ...finding,
      reviewId: review.id,
      prNumber: review.prNumber,
      prTitle: titles[review.prNumber] ?? null,
      createdAt: review.createdAt,
    }))
  })

  return { findings }
}
