import { getAuth } from "@clerk/express"

import { fetchPullTitles } from "./github.js"
import { prisma } from "./db.js"
import { runPrReview } from "./review-graph.js"
import { captureCaughtError } from "./sentry.js"

function parseOwnerRepo(repoName) {
  const [owner, ...repoParts] = repoName.split("/")
  const repo = repoParts.join("/")
  return owner && repo ? { owner, repo } : null
}

export async function reviewPullRequest(req, res) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    res.status(404).json({ error: "User not synced" })
    return
  }

  const repoId = req.body?.repoId
  const prNumber = Number.parseInt(req.params.prNumber, 10)

  if (!repoId || Number.isNaN(prNumber)) {
    res.status(400).json({ error: "repoId and a numeric prNumber are required" })
    return
  }

  const connectedRepo = await prisma.connectedRepo.findFirst({
    where: {
      id: repoId,
      userId: user.id,
    },
  })

  if (!connectedRepo) {
    res.status(404).json({ error: "Repo not found" })
    return
  }

  if (connectedRepo.provider !== "github") {
    res.status(400).json({ error: "Reviews are only available for GitHub repos" })
    return
  }

  const parsed = parseOwnerRepo(connectedRepo.repoName)
  if (!parsed) {
    res.status(400).json({ error: "Invalid repo name" })
    return
  }

  if (user.reviewCredits < 1) {
    res.status(403).json({
      error:
        "You're out of review credits. Reviews are paused until credits are restored.",
    })
    return
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

    res.json({
      id: review.id,
      connectedRepoId: review.connectedRepoId,
      prNumber: review.prNumber,
      findings: review.findings,
      createdAt: review.createdAt,
      reviewCredits,
    })
  } catch (error) {
    if (error.code === "NO_REVIEW_CREDITS") {
      res.status(403).json({
        error:
          "You're out of review credits. Reviews are paused until credits are restored.",
      })
      return
    }

    console.error(error)
    captureCaughtError(error, {
      repoId,
      prNumber,
      step: "review",
    })

    if (error.code === "GITHUB_UNAUTHORIZED") {
      res.status(401).json({ error: error.message })
      return
    }

    if (error.code === "GITHUB_PR_NOT_FOUND") {
      res.status(404).json({ error: error.message })
      return
    }

    if (error.code === "GROQ_UNAVAILABLE" || error.code === "GEMINI_UNAVAILABLE") {
      res.status(503).json({ error: error.message })
      return
    }

    if (error.code === "GROQ_ERROR" || error.code === "GEMINI_ERROR") {
      res.status(502).json({ error: error.message })
      return
    }

    if (isRetryableDbError(error)) {
      res.status(503).json({
        error:
          "The review finished, but saving it timed out. Please try again in a moment.",
      })
      return
    }

    res.status(502).json({
      error: error.message || "Failed to review pull request",
    })
  }
}

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
        throw Object.assign(new Error("You're out of review credits."), {
          code: "NO_REVIEW_CREDITS",
        })
      }

      try {
        const review = await prisma.review.create({
          data: {
            connectedRepoId,
            prNumber,
            findings,
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
      if (error.code === "NO_REVIEW_CREDITS" || !isRetryableDbError(error)) {
        throw error
      }

      await prisma.$queryRaw`SELECT 1`.catch(() => {})
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }

  throw lastError
}

export async function listRepoReviews(req, res) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    res.status(404).json({ error: "User not synced" })
    return
  }

  const connectedRepo = await prisma.connectedRepo.findFirst({
    where: {
      id: req.params.id,
      userId: user.id,
    },
  })

  if (!connectedRepo) {
    res.status(404).json({ error: "Repo not found" })
    return
  }

  const reviews = await prisma.review.findMany({
    where: { connectedRepoId: connectedRepo.id },
    orderBy: { createdAt: "desc" },
  })

  const parsed = parseOwnerRepo(connectedRepo.repoName)
  let titles = {}

  if (parsed && connectedRepo.provider === "github") {
    try {
      titles = await fetchPullTitles(
        user.clerkId,
        parsed.owner,
        parsed.repo,
        reviews.map((review) => review.prNumber),
        { repoId: connectedRepo.id }
      )
    } catch (error) {
      captureCaughtError(error, {
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

  res.json({ findings })
}
