import { Document } from "@langchain/core/documents"
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers"
import { Chroma } from "@langchain/community/vectorstores/chroma"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { ChromaClient } from "chromadb"

const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000"

function collectionNameForRepo(repoId) {
  return `repo-${repoId}`
}

function chromaClient() {
  const url = new URL(chromaUrl)
  return new ChromaClient({
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
    ssl: url.protocol === "https:",
  })
}

async function getEmbeddings() {
  return new HuggingFaceTransformersEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
    batchSize: 16,
  })
}

export async function searchRepoIndex(repoId, query, k = 6) {
  if (!query?.trim()) {
    return []
  }

  const client = chromaClient()

  try {
    await client.heartbeat()
  } catch {
    return []
  }

  try {
    const embeddings = await getEmbeddings()
    const store = new Chroma(embeddings, {
      index: client,
      collectionName: collectionNameForRepo(repoId),
      numDimensions: 384,
    })
    const vector = await embeddings.embedQuery(query.slice(0, 4000))
    const results = await store.similaritySearchVectorWithScore(vector, k)
    return results.map(([document]) => document)
  } catch {
    return []
  }
}

function formatRetrievedContext(documents) {
  if (documents.length === 0) {
    return "No indexed repository context was available."
  }

  return documents
    .map((document) => {
      const path = document.metadata?.path ?? "unknown"
      return `File: ${path}\n${document.pageContent}`
    })
    .join("\n\n---\n\n")
}

export async function retrieveRepoContext(repoId, query) {
  const documents = await searchRepoIndex(repoId, query)
  return formatRetrievedContext(documents)
}

export async function indexSourceFiles(repoId, files) {
  const client = chromaClient()

  try {
    await client.heartbeat()
  } catch {
    const error = new Error(
      "Chroma is not running. Start it with npm run chroma."
    )
    error.code = "CHROMA_UNAVAILABLE"
    throw error
  }

  const collectionName = collectionNameForRepo(repoId)

  try {
    await client.deleteCollection({ name: collectionName })
  } catch {
    // Collection may not exist yet.
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })
  const documents = await splitter.splitDocuments(
    files.map(
      (file) =>
        new Document({
          pageContent: file.content,
          metadata: { repoId, path: file.path },
        })
    )
  )

  if (documents.length === 0) {
    return { fileCount: files.length, chunkCount: 0 }
  }

  const embeddings = await getEmbeddings()
  await Chroma.fromDocuments(documents, embeddings, {
    index: client,
    collectionName,
    collectionMetadata: { "hnsw:space": "cosine" },
    numDimensions: 384,
  })

  return { fileCount: files.length, chunkCount: documents.length }
}
