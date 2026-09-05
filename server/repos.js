import { getAuth } from "@clerk/express"

import { fetchRepoPulls } from "./github.js"
import { prisma } from "./db.js"

const providers = new Set(["github", "gitlab"])

async function findCurrentUser(req, res) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    res.status(401).json({ error: "Unauthorized" })
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    res.status(404).json({ error: "User not synced" })
    return null
  }

  return user
}

export async function connectRepo(req, res) {
  const user = await findCurrentUser(req, res)
  if (!user) {
    return
  }

  const { provider, repoName, repoUrl, externalRepoId } = req.body ?? {}

  if (!providers.has(provider) || !repoName || !repoUrl || !externalRepoId) {
    res.status(400).json({
      error: "provider, repoName, repoUrl, and externalRepoId are required",
    })
    return
  }

  const connectedRepo = await prisma.connectedRepo.create({
    data: {
      userId: user.id,
      provider,
      repoName,
      repoUrl,
      externalRepoId: String(externalRepoId),
    },
  })

  res.status(201).json(connectedRepo)
}

export async function listConnectedRepos(req, res) {
  const user = await findCurrentUser(req, res)
  if (!user) {
    return
  }

  const connectedRepos = await prisma.connectedRepo.findMany({
    where: { userId: user.id },
    orderBy: { connectedAt: "desc" },
  })

  res.json(connectedRepos)
}

export async function getConnectedRepo(req, res) {
  const user = await findCurrentUser(req, res)
  if (!user) {
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

  res.json({
    ...connectedRepo,
    prCount: 0,
    securityIssueCount: 0,
    lastReviewedAt: null,
  })
}

export async function listConnectedRepoPulls(req, res) {
  const user = await findCurrentUser(req, res)
  if (!user) {
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

  if (connectedRepo.provider !== "github") {
    res.status(400).json({ error: "Pull requests are only available for GitHub repos" })
    return
  }

  const [owner, ...repoParts] = connectedRepo.repoName.split("/")
  const repo = repoParts.join("/")

  if (!owner || !repo) {
    res.status(400).json({ error: "Invalid repo name" })
    return
  }

  try {
    const pulls = await fetchRepoPulls(user.clerkId, owner, repo)

    if (!pulls) {
      res.status(401).json({ error: "GitHub OAuth access token not found" })
      return
    }

    res.json(pulls)
  } catch {
    res.status(502).json({ error: "Failed to load pull requests from GitHub" })
  }
}
