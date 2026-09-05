import { clerkClient, getAuth } from "@clerk/express"
import { Octokit } from "octokit"

async function getGithubOctokit(userId) {
  const oauthTokens = await clerkClient.users.getUserOauthAccessToken(
    userId,
    "github"
  )
  const githubToken = oauthTokens.data[0]?.token

  if (!githubToken) {
    return null
  }

  return new Octokit({ auth: githubToken })
}

function mapPull(pull) {
  return {
    title: pull.title,
    number: pull.number,
    author: pull.user?.login ?? null,
    state: pull.merged_at ? "merged" : pull.state,
    created_at: pull.created_at,
    url: pull.html_url,
  }
}

export async function fetchRepoPulls(userId, owner, repo) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  const [open, closed] = await Promise.all([
    octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      sort: "updated",
      direction: "desc",
      per_page: 30,
    }),
    octokit.rest.pulls.list({
      owner,
      repo,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: 20,
    }),
  ])

  return [...open.data, ...closed.data].map(mapPull)
}

export async function listGithubRepos(req, res) {
  const { isAuthenticated, userId } = getAuth(req)

  if (!isAuthenticated) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    res.status(401).json({ error: "GitHub OAuth access token not found" })
    return
  }
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "updated",
  })

  res.json(
    data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      private: repo.private,
      description: repo.description,
      updated_at: repo.updated_at,
    }))
  )
}
