import { clerkClient, getAuth } from "@clerk/express"
import { Octokit } from "octokit"

const skipDirPattern =
  /(^|\/)(node_modules|\.git|dist|build|coverage|\.next|out|vendor|__pycache__|\.venv|venv)(\/|$)/
const skipLockPattern =
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lock|bun\.lockb|composer\.lock|Gemfile\.lock|Cargo\.lock|poetry\.lock|uv\.lock)$/i
const binaryExtPattern =
  /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|tar|woff2?|ttf|eot|mp4|mp3|wav|mov|avi|bin|exe|dll|so|dylib|wasm|class|o|obj)$/i
const maxFileBytes = 200_000
const maxFiles = 500
const fetchConcurrency = 6

function shouldSkipPath(path) {
  return (
    skipDirPattern.test(path) ||
    skipLockPattern.test(path) ||
    binaryExtPattern.test(path)
  )
}

async function mapLimit(items, limit, mapper) {
  const results = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  )
  return results
}

export async function getGithubOctokit(userId) {
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

export async function fetchRepoSourceFiles(userId, owner, repo) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  const { data: repository } = await octokit.rest.repos.get({ owner, repo })
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: repository.default_branch,
    recursive: "true",
  })

  const blobs = tree.tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path &&
        entry.sha &&
        !shouldSkipPath(entry.path) &&
        (entry.size ?? 0) <= maxFileBytes
    )
    .slice(0, maxFiles)

  const files = await mapLimit(blobs, fetchConcurrency, async (entry) => {
    const { data } = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: entry.sha,
    })
    const content = Buffer.from(data.content, "base64").toString("utf8")

    if (content.includes("\u0000")) {
      return null
    }

    return { path: entry.path, content }
  })

  return files.filter(Boolean)
}

export async function fetchPullDiff(userId, owner, repo, pullNumber) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  })

  return typeof response.data === "string" ? response.data : ""
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
