import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatGroq } from "@langchain/groq"
import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import * as Sentry from "@sentry/node"

import { fetchPullDiff } from "./github.js"
import { retrieveRepoContext } from "./indexer.js"
import { captureCaughtError } from "./sentry.js"

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

function getGeminiModel() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    const error = new Error("GOOGLE_API_KEY is not set")
    error.code = "GEMINI_UNAVAILABLE"
    throw error
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    apiKey,
  })
}

function normalizeConfidence(value) {
  const number = Number(value)

  if (Number.isNaN(number)) {
    return null
  }

  if (number > 1 && number <= 100) {
    return Math.round(number) / 100
  }

  return Math.min(1, Math.max(0, number))
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
  } catch (error) {
    captureCaughtError(error, { step: "llm.parseJson" })
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
        confidence: normalizeConfidence(item.confidence),
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

function providerError(provider, code, error) {
  const detail =
    error.error?.error?.message ??
    error.error?.message ??
    error.message ??
    "Unknown error"
  const wrapped = new Error(`${provider}: ${detail}`)
  wrapped.code = code
  wrapped.status = error.status
  return wrapped
}

async function askForFindings(prompt) {
  try {
    const model = getModel()
    const response = await model.invoke(prompt)
    return parseJsonArray(messageText(response.content))
  } catch (error) {
    if (error.code === "GROQ_UNAVAILABLE") {
      throw error
    }

    throw providerError("Groq", "GROQ_ERROR", error)
  }
}

function withReviewStep(step, node) {
  return async (state) => {
    Sentry.setTags({
      repoId: String(state.repoId ?? ""),
      prNumber: String(state.prNumber ?? ""),
      step,
    })

    try {
      return await Sentry.startSpan(
        {
          name: `review.${step}`,
          op: "function",
          attributes: {
            "repo.id": String(state.repoId ?? ""),
            "pr.number": Number(state.prNumber) || 0,
          },
        },
        () => node(state)
      )
    } catch (error) {
      captureCaughtError(error, {
        repoId: state.repoId,
        prNumber: state.prNumber,
        step,
      })
      throw error
    }
  }
}

async function fetchDiffNode(state) {
  const diff = await fetchPullDiff(
    state.clerkUserId,
    state.owner,
    state.repo,
    state.prNumber,
    { repoId: state.repoId, prNumber: state.prNumber }
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

async function sanityCheckNode(state) {
  try {
    const model = getGeminiModel()
    const response = await model.invoke(
      `You are a second-pass reviewer. Sanity-check the synthesized findings against the original pull request diff.
Drop false positives. Add any obvious missed issues. Assign a confidence score from 0 to 1 for each finding.

Return a JSON array only. Each item: {"severity":"high"|"medium"|"low","file":string|null,"line":number|null,"description":string,"confidence":number}.
If nothing remains, return [].

Synthesized findings:
${JSON.stringify(state.findings)}

Diff:
${state.diff}`
    )

    const checked = normalizeFindings(
      parseJsonArray(messageText(response.content)),
      "review"
    ).sort(
      (left, right) =>
        (severityRank[left.severity] ?? 1) - (severityRank[right.severity] ?? 1)
    )

    return { findings: checked }
  } catch (error) {
    if (error.code === "GEMINI_UNAVAILABLE") {
      throw error
    }

    throw providerError("Gemini", "GEMINI_ERROR", error)
  }
}

const reviewGraph = new StateGraph(ReviewState)
  .addNode("fetchDiff", withReviewStep("fetchDiff", fetchDiffNode))
  .addNode("security", withReviewStep("security", securityNode))
  .addNode("style", withReviewStep("style", styleNode))
  .addNode("synthesize", withReviewStep("synthesize", synthesizeNode))
  .addNode("sanityCheck", withReviewStep("sanityCheck", sanityCheckNode))
  .addEdge(START, "fetchDiff")
  .addEdge("fetchDiff", "security")
  .addEdge("security", "style")
  .addEdge("style", "synthesize")
  .addEdge("synthesize", "sanityCheck")
  .addEdge("sanityCheck", END)
  .compile()

export async function runPrReview({
  clerkUserId,
  repoId,
  owner,
  repo,
  prNumber,
}) {
  return Sentry.startSpan(
    {
      name: "pr.review",
      op: "function",
      attributes: {
        "repo.id": String(repoId),
        "pr.number": prNumber,
      },
    },
    async () => {
      Sentry.setTags({
        repoId: String(repoId),
        prNumber: String(prNumber),
        step: "review",
      })

      const result = await reviewGraph.invoke({
        clerkUserId,
        repoId,
        owner,
        repo,
        prNumber,
      })

      return result.findings ?? []
    }
  )
}
