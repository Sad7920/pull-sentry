import { Router } from "express"
import { clerkMiddleware } from "@clerk/express"

import { listGithubRepos } from "../github.js"
import { asyncHandler, withTimeout } from "../lib/errors.js"
import { expensiveMutationLimiter } from "../rate-limit.js"
import {
  connectRepo,
  disconnectRepo,
  getConnectedRepo,
  indexConnectedRepo,
  listConnectedRepoPulls,
  listConnectedRepos,
} from "../repos.js"
import { listRepoReviews, reviewPullRequest } from "../reviews.js"
import { syncUser } from "../users.js"

export const apiV1 = Router()

apiV1.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

apiV1.post("/users/sync", asyncHandler(syncUser))
apiV1.get("/github/repos", clerkMiddleware(), asyncHandler(listGithubRepos))
apiV1.post(
  "/repos/connect",
  clerkMiddleware(),
  expensiveMutationLimiter,
  asyncHandler(connectRepo)
)
apiV1.get("/repos/connected", clerkMiddleware(), asyncHandler(listConnectedRepos))
apiV1.delete(
  "/repos/:id",
  clerkMiddleware(),
  expensiveMutationLimiter,
  asyncHandler(disconnectRepo)
)
apiV1.get("/repos/:id/prs", clerkMiddleware(), asyncHandler(listConnectedRepoPulls))
apiV1.get("/repos/:id/reviews", clerkMiddleware(), asyncHandler(listRepoReviews))
apiV1.post(
  "/repos/:id/index",
  clerkMiddleware(),
  expensiveMutationLimiter,
  withTimeout(15 * 60 * 1000, indexConnectedRepo)
)
apiV1.get("/repos/:id", clerkMiddleware(), asyncHandler(getConnectedRepo))
apiV1.post(
  "/prs/:prNumber/review",
  clerkMiddleware(),
  expensiveMutationLimiter,
  withTimeout(10 * 60 * 1000, reviewPullRequest)
)
