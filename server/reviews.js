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

  try {
    const findings = await runPrReview({
      clerkUserId: user.clerkId,
      repoId: connectedRepo.id,
      owner: parsed.owner,
      repo: parsed.repo,
      prNumber,
    })

    const review = await prisma.review.create({
      data: {
        connectedRepoId: connectedRepo.id,
        prNumber,
        findings,
      },
    })

    res.json({
      id: review.id,
      connectedRepoId: review.connectedRepoId,
      prNumber: review.prNumber,
      findings: review.findings,
      createdAt: review.createdAt,
    })
  } catch (error) {
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

    res.status(502).json({
      error: error.message || "Failed to review pull request",
    })
  }
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
