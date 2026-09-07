import { clerkClient, getAuth } from "@clerk/express"
import { Octokit } from "octokit"

import { captureCaughtError } from "./sentry.js"

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

export async function fetchRepoPulls(userId, owner, repo, context = {}) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  try {
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
  } catch (error) {
    captureCaughtError(error, { ...context, step: "github.fetchRepoPulls" })
    throw error
  }
}

export async function fetchPullTitles(userId, owner, repo, prNumbers, context = {}) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return {}
  }

  const uniqueNumbers = [...new Set(prNumbers.filter((number) => Number.isFinite(number)))]
  const titles = {}

  await mapLimit(uniqueNumbers, fetchConcurrency, async (number) => {
    try {
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
      })
      titles[number] = data.title ?? null
    } catch (error) {
      captureCaughtError(error, {
        ...context,
        prNumber: number,
        step: "github.fetchPullTitles",
      })
      titles[number] = null
    }
  })

  return titles
}

export async function fetchRepoSourceFiles(userId, owner, repo, context = {}) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  try {
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
  } catch (error) {
    captureCaughtError(error, { ...context, step: "github.fetchRepoSourceFiles" })
    throw error
  }
}

export async function fetchPullDiff(userId, owner, repo, pullNumber, context = {}) {
  const octokit = await getGithubOctokit(userId)

  if (!octokit) {
    return null
  }

  try {
    const response = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    })

    return typeof response.data === "string" ? response.data : ""
  } catch (error) {
    captureCaughtError(error, {
      ...context,
      prNumber: pullNumber,
      step: "github.fetchPullDiff",
    })

    if (error.status === 404) {
      const notFound = new Error("Pull request not found on GitHub")
      notFound.code = "GITHUB_PR_NOT_FOUND"
      throw notFound
    }

    throw error
  }
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

  try {
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
  } catch (error) {
    captureCaughtError(error, { step: "github.listRepos" })
    res.status(502).json({ error: "Failed to load GitHub repositories" })
  }
}
