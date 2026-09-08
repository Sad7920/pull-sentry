import "./lib/env.js"

import { clerkMiddleware } from "@clerk/express"
import * as Sentry from "@sentry/node"
import express from "express"

import { listGithubRepos } from "./github.js"
import { asyncHandler, apiErrorHandler, withTimeout } from "./lib/errors.js"
import {
  connectRepo,
  disconnectRepo,
  getConnectedRepo,
  indexConnectedRepo,
  listConnectedRepoPulls,
  listConnectedRepos,
} from "./repos.js"
import { expensiveMutationLimiter } from "./rate-limit.js"
import { listRepoReviews, reviewPullRequest } from "./reviews.js"
import { syncUser } from "./users.js"

const port = Number(process.env.PORT) || 3001
const app = express()

app.set("trust proxy", 1)
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.post("/api/users/sync", asyncHandler(syncUser))
app.get("/api/github/repos", clerkMiddleware(), asyncHandler(listGithubRepos))
app.post(
  "/api/repos/connect",
  clerkMiddleware(),
  expensiveMutationLimiter,
  asyncHandler(connectRepo)
)
app.get("/api/repos/connected", clerkMiddleware(), asyncHandler(listConnectedRepos))
app.delete(
  "/api/repos/:id",
  clerkMiddleware(),
  expensiveMutationLimiter,
  asyncHandler(disconnectRepo)
)
app.get("/api/repos/:id/prs", clerkMiddleware(), asyncHandler(listConnectedRepoPulls))
app.get("/api/repos/:id/reviews", clerkMiddleware(), asyncHandler(listRepoReviews))
app.post(
  "/api/repos/:id/index",
  clerkMiddleware(),
  expensiveMutationLimiter,
  withTimeout(15 * 60 * 1000, indexConnectedRepo)
)
app.get("/api/repos/:id", clerkMiddleware(), asyncHandler(getConnectedRepo))
app.post(
  "/api/prs/:prNumber/review",
  clerkMiddleware(),
  expensiveMutationLimiter,
  withTimeout(10 * 60 * 1000, reviewPullRequest)
)

Sentry.setupExpressErrorHandler(app)
app.use(apiErrorHandler)

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${port}`)
})
