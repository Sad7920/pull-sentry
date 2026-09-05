import { ChatGroq } from "@langchain/groq"
import { Annotation, END, START, StateGraph } from "@langchain/langgraph"

import { fetchPullDiff } from "./github.js"
import { retrieveRepoContext } from "./indexer.js"

const maxDiffChars = 40_000
const severityRank = { high: 0, medium: 1, low: 2 }

const ReviewState = Annotation.Root({
  clerkUserId: Annotation(),
  repoId: Annotation(),
  owner: Annotation(),
  repo: Annotation(),
  prNumber: Annotation(),
  diff: Annotation(),
  securityFindings: Annotation({
    reducer: (_current, next) => next,
    default: () => [],
  }),
  styleFindings: Annotation({
    reducer: (_current, next) => next,
    default: () => [],
  }),
  findings: Annotation({
    reducer: (_current, next) => next,
    default: () => [],
  }),
})

function getModel() {
  if (!process.env.GROQ_API_KEY) {
    const error = new Error("GROQ_API_KEY is not set")
    error.code = "GROQ_UNAVAILABLE"
    throw error
  }

  return new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY,
  })
}

function messageText(content) {
  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : (part.text ?? "")))
      .join("")
  }

  return String(content ?? "")
}

function parseJsonArray(text) {
  const trimmed = String(text ?? "").trim()
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
  const start = unfenced.indexOf("[")
  const end = unfenced.lastIndexOf("]")

  if (start === -1 || end === -1) {
    return []
  }

  try {
    const parsed = JSON.parse(unfenced.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeFindings(items, category) {
  return items
    .map((item) => {
      const severity = String(item.severity ?? "medium").toLowerCase()
      return {
        severity: severityRank[severity] === undefined ? "medium" : severity,
        file: item.file ?? null,
        line:
          typeof item.line === "number"
            ? item.line
            : Number.parseInt(item.line, 10) || null,
        description: String(item.description ?? "").trim(),
        category,
      }
    })
    .filter((item) => item.description)
}

function diffSearchQuery(diff) {
  const added = diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n")

  return (added || diff).slice(0, 4000)
}

async function askForFindings(prompt) {
  const model = getModel()
  const response = await model.invoke(prompt)
  return parseJsonArray(messageText(response.content))
}

async function fetchDiffNode(state) {
  const diff = await fetchPullDiff(
    state.clerkUserId,
    state.owner,
    state.repo,
    state.prNumber
  )

  if (diff == null) {
    const error = new Error("GitHub OAuth access token not found")
    error.code = "GITHUB_UNAUTHORIZED"
    throw error
  }

  return { diff: diff.slice(0, maxDiffChars) }
}

async function securityNode(state) {
  const context = await retrieveRepoContext(
    state.repoId,
    diffSearchQuery(state.diff)
  )
  const items = await askForFindings(
    `You are a security reviewer. Flag only concrete issues in the pull request diff: SQL injection, leaked secrets, and auth/authorization problems.

Use the retrieved repository context only to judge whether the change is risky in this codebase.

Return a JSON array only. Each item: {"severity":"high"|"medium"|"low","file":string|null,"line":number|null,"description":string}.
If nothing is wrong, return [].

Repository context:
${context}

Diff:
${state.diff}`
  )

  return { securityFindings: normalizeFindings(items, "security") }
}

async function styleNode(state) {
  const context = await retrieveRepoContext(
    state.repoId,
    diffSearchQuery(state.diff)
  )
  const items = await askForFindings(
    `You are a style reviewer. Compare the pull request diff to similar code from this repository and flag convention inconsistencies (naming, error handling, structure, imports, comments).

Return a JSON array only. Each item: {"severity":"high"|"medium"|"low","file":string|null,"line":number|null,"description":string}.
If the change matches existing patterns, return [].

Similar code from the index:
${context}

Diff:
${state.diff}`
  )

  return { styleFindings: normalizeFindings(items, "style") }
}

async function synthesizeNode(state) {
  const items = await askForFindings(
    `Merge these security and style findings into one ranked list.
Drop duplicates and weak/speculative items. Keep the most important issues first (high, then medium, then low).

Return a JSON array only. Each item: {"severity":"high"|"medium"|"low","file":string|null,"line":number|null,"description":string}.
If there are no findings, return [].

Security findings:
${JSON.stringify(state.securityFindings)}

Style findings:
${JSON.stringify(state.styleFindings)}`
  )

  const merged = normalizeFindings(items, "review")
  const findings = (merged.length > 0
    ? merged
    : [...state.securityFindings, ...state.styleFindings]
  ).sort(
    (left, right) =>
      (severityRank[left.severity] ?? 1) - (severityRank[right.severity] ?? 1)
  )

  return { findings }
}

const reviewGraph = new StateGraph(ReviewState)
  .addNode("fetchDiff", fetchDiffNode)
  .addNode("security", securityNode)
  .addNode("style", styleNode)
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "fetchDiff")
  .addEdge("fetchDiff", "security")
  .addEdge("security", "style")
  .addEdge("style", "synthesize")
  .addEdge("synthesize", END)
  .compile()

export async function runPrReview({
  clerkUserId,
  repoId,
  owner,
  repo,
  prNumber,
}) {
  const result = await reviewGraph.invoke({
    clerkUserId,
    repoId,
    owner,
    repo,
    prNumber,
  })

  return result.findings ?? []
}
