import { getAuth } from "@clerk/express"

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
