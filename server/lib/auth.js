import { getAuth } from "@clerk/express"

import { prisma } from "../db.js"
import { AppError } from "./errors.js"
import { captureCaughtError } from "../sentry.js"

export function requireClerkUserId(req) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated || !userId) {
    throw new AppError(401, "Unauthorized")
  }

  return userId
}

export async function requireCurrentUser(req) {
  const clerkId = requireClerkUserId(req)

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        reviewCredits: true,
      },
    })

    if (!user) {
      throw new AppError(404, "User not synced")
    }

    return user
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    captureCaughtError(error, { userId: clerkId, step: "auth.requireCurrentUser" })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }
}

const repoScalarSelect = {
  id: true,
  userId: true,
  provider: true,
  repoName: true,
  repoUrl: true,
  externalRepoId: true,
  isPrivate: true,
  connectedAt: true,
  indexedAt: true,
}

export async function findOwnedRepo(userId, repoId, select = repoScalarSelect) {
  if (typeof repoId !== "string" || !repoId.trim()) {
    throw new AppError(400, "Repo id is required")
  }

  try {
    const connectedRepo = await prisma.connectedRepo.findFirst({
      where: { id: repoId.trim(), userId },
      select,
    })

    if (!connectedRepo) {
      throw new AppError(404, "Repo not found")
    }

    return connectedRepo
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    captureCaughtError(error, {
      userId,
      repoId,
      step: "auth.findOwnedRepo",
    })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }
}
