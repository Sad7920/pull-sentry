import { clerkClient, getAuth } from "@clerk/express"
import { Octokit } from "octokit"

export async function listGithubRepos(req, res) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const oauthTokens = await clerkClient.users.getUserOauthAccessToken(
    userId,
    "github"
  )
  const githubToken = oauthTokens.data[0]?.token

  if (!githubToken) {
    res.status(401).json({ error: "GitHub OAuth access token not found" })
    return
  }

  const octokit = new Octokit({ auth: githubToken })
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "updated",
  })

  res.json(
    data.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      updated_at: repo.updated_at,
    }))
  )
}
