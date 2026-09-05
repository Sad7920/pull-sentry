import { getAuth } from "@clerk/express"

import { prisma } from "./db.js"
import { runPrReview } from "./review-graph.js"

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
    if (error.code === "GITHUB_UNAUTHORIZED") {
      res.status(401).json({ error: error.message })
      return
    }

    if (error.code === "GROQ_UNAVAILABLE") {
      res.status(503).json({ error: error.message })
      return
    }

    if (error.status === 404) {
      res.status(404).json({ error: "Pull request not found" })
      return
    }

    console.error(error)
    res.status(502).json({ error: "Failed to review pull request" })
  }
}
