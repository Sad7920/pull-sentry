export function parseOwnerRepo(repoName) {
  if (typeof repoName !== "string") {
    return null
  }

  const [owner, ...repoParts] = repoName.split("/")
  const repo = repoParts.join("/")
  return owner && repo ? { owner, repo } : null
}
