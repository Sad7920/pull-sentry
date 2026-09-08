import { requireCurrentUser } from "./lib/auth.js"
import { requireIdParam, parseConnectRepoBody } from "./lib/validate.js"
import {
  createConnectedRepo,
  getConnectedRepoDetail,
  indexConnectedGithubRepo,
  listConnectedRepoPullRequests,
  listUserConnectedRepos,
  removeConnectedRepo,
} from "./services/repos.js"

export async function connectRepo(req, res) {
  req.sentryStep = "repos.connect"
  const user = await requireCurrentUser(req)
  const input = parseConnectRepoBody(req.body)
  const connectedRepo = await createConnectedRepo(user.id, input)
  res.status(201).json(connectedRepo)
}

export async function listConnectedRepos(req, res) {
  req.sentryStep = "repos.listConnected"
  const user = await requireCurrentUser(req)
  const summaries = await listUserConnectedRepos(user)
  res.json(summaries)
}

export async function disconnectRepo(req, res) {
  req.sentryStep = "repos.disconnect"
  const user = await requireCurrentUser(req)
  const repoId = requireIdParam(req.params.id)
  await removeConnectedRepo(user.id, repoId)
  res.status(204).end()
}

export async function getConnectedRepo(req, res) {
  req.sentryStep = "repos.getConnected"
  const user = await requireCurrentUser(req)
  const repoId = requireIdParam(req.params.id)
  const repo = await getConnectedRepoDetail(user.id, repoId)
  res.json(repo)
}

export async function listConnectedRepoPulls(req, res) {
  req.sentryStep = "github.listPulls"
  const user = await requireCurrentUser(req)
  const repoId = requireIdParam(req.params.id)
  const pulls = await listConnectedRepoPullRequests(user, repoId)
  res.json(pulls)
}

export async function indexConnectedRepo(req, res) {
  req.sentryStep = "github.indexRepo"
  const user = await requireCurrentUser(req)
  const repoId = requireIdParam(req.params.id)
  const result = await indexConnectedGithubRepo(user, repoId)
  res.json(result)
}
