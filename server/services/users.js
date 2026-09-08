import { prisma } from "../db.js"
import { AppError } from "../lib/errors.js"
import { captureCaughtError } from "../sentry.js"

export async function syncUserAccount({ clerkId, email }) {
  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { email },
      create: { clerkId, email },
      select: {
        id: true,
        clerkId: true,
        email: true,
        reviewCredits: true,
        createdAt: true,
      },
    })

    const connectedRepoCount = await prisma.connectedRepo.count({
      where: { userId: user.id },
    })

    return { ...user, connectedRepoCount }
  } catch (error) {
    captureCaughtError(error, { userId: clerkId, step: "users.sync" })
    throw new AppError(503, "Database unavailable. Try again in a moment.")
  }
}
