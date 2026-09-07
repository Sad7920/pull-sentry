import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"
import * as Sentry from "@sentry/node"

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env"),
})

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
  ignoreTransactions: ["GET /health"],
})
