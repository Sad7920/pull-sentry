import { prisma } from "./db.js"
import { captureCaughtError } from "./sentry.js"

function emailFromClerkUser(clerkUser) {
  return (
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    clerkUser?.email ??
    null
  )
}

export async function syncUser(req, res) {
  const clerkUser = req.body
  const clerkId = clerkUser?.id ?? clerkUser?.clerkId
  const email = emailFromClerkUser(clerkUser)

  if (!clerkId || !email) {
    res.status(400).json({
      error: "Clerk user must include id and an email address",
    })
    return
  }

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { email },
      create: { clerkId, email },
    })

    const connectedRepoCount = await prisma.connectedRepo.count({
      where: { userId: user.id },
    })

    res.json({ ...user, connectedRepoCount })
  } catch (error) {
    captureCaughtError(error, { step: "users.sync" })
    console.error("users.sync failed:", error.message)
    res.status(503).json({
      error: "Database unavailable. Try again in a moment.",
    })
  }
}
