import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
})

const required = [
  "DATABASE_URL",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GROQ_API_KEY",
]

export function validateEnv() {
  const missing = required.filter((name) => !process.env[name]?.trim())

  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.GOOGLE_API_KEY?.trim()) {
    missing.push("GEMINI_API_KEY")
  }

  if (missing.length > 0) {
    const label = missing.length === 1 ? "variable" : "variables"
    throw new Error(
      `Missing required environment ${label}: ${missing.join(", ")}`
    )
  }
}

validateEnv()
