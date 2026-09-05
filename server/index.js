import "dotenv/config"
import { clerkMiddleware } from "@clerk/express"
import express from "express"

import { listGithubRepos } from "./github.js"
import {
  connectRepo,
  getConnectedRepo,
  indexConnectedRepo,
  listConnectedRepoPulls,
  listConnectedRepos,
} from "./repos.js"
import { syncUser } from "./users.js"

const port = Number(process.env.PORT) || 3001
const app = express()

app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.post("/api/users/sync", syncUser)
app.get("/api/github/repos", clerkMiddleware(), listGithubRepos)
app.post("/api/repos/connect", clerkMiddleware(), connectRepo)
app.get("/api/repos/connected", clerkMiddleware(), listConnectedRepos)
app.get("/api/repos/:id/prs", clerkMiddleware(), listConnectedRepoPulls)
app.post("/api/repos/:id/index", clerkMiddleware(), (req, res, next) => {
  req.setTimeout(15 * 60 * 1000)
  res.setTimeout(15 * 60 * 1000)
  Promise.resolve(indexConnectedRepo(req, res)).catch(next)
})
app.get("/api/repos/:id", clerkMiddleware(), getConnectedRepo)

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${port}`)
})
