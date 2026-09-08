import { requireCurrentUser } from "./lib/auth.js"
import { requireIdParam, parseReviewBody, requirePrNumber } from "./lib/validate.js"
import {
  listOwnedRepoReviewFindings,
  reviewOwnedPullRequest,
} from "./services/reviews.js"

export async function reviewPullRequest(req, res) {
  req.sentryStep = "review"
  const user = await requireCurrentUser(req)
  const { repoId } = parseReviewBody(req.body)
  const prNumber = requirePrNumber(req.params.prNumber)
  const result = await reviewOwnedPullRequest(user, { repoId, prNumber })
  res.json(result)
}

export async function listRepoReviews(req, res) {
  req.sentryStep = "reviews.list"
  const user = await requireCurrentUser(req)
  const repoId = requireIdParam(req.params.id)
  const result = await listOwnedRepoReviewFindings(user, repoId)
  res.json(result)
}
