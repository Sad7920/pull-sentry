import { prisma } from "./db.js"

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

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: { email },
    create: { clerkId, email },
  })

  const connectedRepoCount = await prisma.connectedRepo.count({
    where: { userId: user.id },
  })

  res.json({ ...user, connectedRepoCount })
}
