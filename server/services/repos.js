import {
  fetchConnectedRepoGithubSummaries,
  fetchRepoPulls,
  fetchRepoSourceFiles,
} from "../github.js"
import { indexSourceFiles } from "../indexer.js"
import { prisma } from "../db.js"
import { findOwnedRepo } from "../lib/auth.js"
import { AppError } from "../lib/errors.js"
import { parseOwnerRepo } from "../lib/repo-name.js"
import { captureCaughtError } from "../sentry.js"

function summarizeReviewFindings(reviews) {
  const rank = { high: 3, medium: 2, low: 1 }
  let findingCount = 0
  let highestSeverity = null

  for (const review of reviews) {
    const items = Array.isArray(review.findings) ? review.findings : []
    findingCount += items.length

    for (const item of items) {
      const nextRank = rank[item.severity] ?? 0
      const currentRank = rank[highestSeverity] ?? 0
      if (nextRank > currentRank) {
        highestSeverity = item.severity
      }
    }
  }

  return {
    hasReviews: reviews.length > 0,
    findingCount,
    highestSeverity,
  }
}

function requireGithubRepo(connectedRepo, unsupportedMessage) {
  if (connectedRepo.provider !== "github") {
    throw new AppError(400, unsupportedMessage)
  }

  const parsed = parseOwnerRepo(connectedRepo.repoName)
  if (!parsed) {
    throw new AppError(400, "Invalid repo name")
  }

  return parsed
}

export async function createConnectedRepo(userId, input) {
  try {
    return await prisma.connectedRepo.create({
      data: {
        userId,
        provider: input.provider,
        repoName: input.repoName,
        repoUrl: input.repoUrl,
        externalRepoId: input.externalRepoId,
        isPrivate: input.isPrivate,
      },
      select: {
        id: true,
        userId: true,
        provider: true,
        repoName: true,
        repoUrl: true,
        externalRepoId: true,
        isPrivate: true,
        connectedAt: true,
        indexedAt: true,
      },
    })
  } catch (error) {
    captureCaughtError(error, { userId, step: "repos.connect" })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }
}

export async function listUserConnectedRepos(user) {
  let connectedRepos

  try {
    connectedRepos = await prisma.connectedRepo.findMany({
      where: { userId: user.id },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true,
        userId: true,
        provider: true,
        repoName: true,
        repoUrl: true,
        externalRepoId: true,
        isPrivate: true,
        connectedAt: true,
        indexedAt: true,
        reviews: {
          select: { findings: true },
        },
      },
    })
  } catch (error) {
    captureCaughtError(error, { userId: user.clerkId, step: "repos.listConnected" })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }

  const githubLookups = connectedRepos.flatMap((repo) => {
    if (repo.provider !== "github") {
      return []
    }

    const parsed = parseOwnerRepo(repo.repoName)
    if (!parsed) {
      return []
    }

    return [{ id: repo.id, owner: parsed.owner, name: parsed.repo }]
  })

  const githubSummaries = await fetchConnectedRepoGithubSummaries(
    user.clerkId,
    githubLookups,
    { userId: user.clerkId, step: "repos.listConnected" }
  )

  return connectedRepos.map((repo) => {
    const github = githubSummaries.get(repo.id)

    return {
      id: repo.id,
      userId: repo.userId,
      provider: repo.provider,
      repoName: repo.repoName,
      repoUrl: repo.repoUrl,
      externalRepoId: repo.externalRepoId,
      isPrivate: github?.isPrivate ?? repo.isPrivate,
      connectedAt: repo.connectedAt,
      indexedAt: repo.indexedAt,
      openPrCount: github?.openPrCount ?? null,
      ...summarizeReviewFindings(repo.reviews),
    }
  })
}

export async function removeConnectedRepo(userId, repoId) {
  const connectedRepo = await findOwnedRepo(userId, repoId, { id: true })

  try {
    await prisma.connectedRepo.delete({
      where: { id: connectedRepo.id },
    })
  } catch (error) {
    captureCaughtError(error, {
      userId,
      repoId: connectedRepo.id,
      step: "repos.disconnect",
    })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }
}

export async function getConnectedRepoDetail(userId, repoId) {
  const connectedRepo = await findOwnedRepo(userId, repoId, {
    id: true,
    userId: true,
    provider: true,
    repoName: true,
    repoUrl: true,
    externalRepoId: true,
    isPrivate: true,
    connectedAt: true,
    indexedAt: true,
    reviews: {
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, findings: true },
    },
  })

  const { reviews, ...repo } = connectedRepo
  const securityIssueCount = reviews.reduce((count, review) => {
    const items = Array.isArray(review.findings) ? review.findings : []
    return count + items.filter((item) => item.severity === "high").length
  }, 0)

  return {
    ...repo,
    prCount: 0,
    securityIssueCount,
    lastReviewedAt: reviews[0]?.createdAt ?? null,
  }
}

export async function listConnectedRepoPullRequests(user, repoId) {
  const connectedRepo = await findOwnedRepo(user.id, repoId)
  const parsed = requireGithubRepo(
    connectedRepo,
    "Pull requests are only available for GitHub repos"
  )

  try {
    const pulls = await fetchRepoPulls(user.clerkId, parsed.owner, parsed.repo, {
      userId: user.clerkId,
      repoId: connectedRepo.id,
    })

    if (!pulls) {
      throw new AppError(401, "GitHub OAuth access token not found")
    }

    return pulls
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    captureCaughtError(error, {
      userId: user.clerkId,
      repoId: connectedRepo.id,
      step: "github.listPulls",
    })
    throw new AppError(502, "Failed to load pull requests from GitHub")
  }
}

export async function indexConnectedGithubRepo(user, repoId) {
  const connectedRepo = await findOwnedRepo(user.id, repoId)
  const parsed = requireGithubRepo(
    connectedRepo,
    "Indexing is only available for GitHub repos"
  )

  try {
    const files = await fetchRepoSourceFiles(
      user.clerkId,
      parsed.owner,
      parsed.repo,
      { userId: user.clerkId, repoId: connectedRepo.id }
    )

    if (!files) {
      throw new AppError(401, "GitHub OAuth access token not found")
    }

    const { fileCount, chunkCount } = await indexSourceFiles(
      connectedRepo.id,
      files
    )
    const indexedRepo = await prisma.connectedRepo.update({
      where: { id: connectedRepo.id },
      data: { indexedAt: new Date() },
      select: {
        id: true,
        userId: true,
        provider: true,
        repoName: true,
        repoUrl: true,
        externalRepoId: true,
        isPrivate: true,
        connectedAt: true,
        indexedAt: true,
      },
    })

    return {
      ...indexedRepo,
      fileCount,
      chunkCount,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    captureCaughtError(error, {
      userId: user.clerkId,
      repoId: connectedRepo.id,
      step: "github.indexRepo",
    })

    if (error.code === "CHROMA_UNAVAILABLE") {
      throw new AppError(503, error.message, error.code)
    }

    throw new AppError(502, "Failed to index repository")
  }
}
