import { AppError } from "./errors.js"

const providers = new Set(["github", "gitlab"])

export function requireNonEmptyString(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, `${name} is required`)
  }

  return value.trim()
}

export function requireIdParam(value, name = "id") {
  return requireNonEmptyString(value, name)
}

export function requirePrNumber(value) {
  const prNumber = Number.parseInt(value, 10)

  if (!Number.isInteger(prNumber) || prNumber < 1) {
    throw new AppError(400, "repoId and a numeric prNumber are required")
  }

  return prNumber
}

export function parseConnectRepoBody(body) {
  const data = body ?? {}
  const { provider, repoName, repoUrl, externalRepoId, isPrivate } = data

  if (
    !providers.has(provider) ||
    typeof repoName !== "string" ||
    !repoName.trim() ||
    typeof repoUrl !== "string" ||
    !repoUrl.trim() ||
    externalRepoId == null ||
    String(externalRepoId).trim() === ""
  ) {
    throw new AppError(
      400,
      "provider, repoName, repoUrl, and externalRepoId are required"
    )
  }

  return {
    provider,
    repoName: repoName.trim(),
    repoUrl: repoUrl.trim(),
    externalRepoId: String(externalRepoId).trim(),
    isPrivate: Boolean(isPrivate),
  }
}

export function parseReviewBody(body) {
  const repoId = body?.repoId

  if (typeof repoId !== "string" || !repoId.trim()) {
    throw new AppError(400, "repoId and a numeric prNumber are required")
  }

  return { repoId: repoId.trim() }
}

export function parseSyncUserBody(body) {
  const clerkUser = body ?? {}
  const clerkId = clerkUser.id ?? clerkUser.clerkId
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    clerkUser.email ??
    null

  if (
    typeof clerkId !== "string" ||
    !clerkId.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    throw new AppError(400, "Clerk user must include id and an email address")
  }

  return { clerkId: clerkId.trim(), email: email.trim() }
}
