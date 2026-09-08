import "./lib/env.js"

import * as Sentry from "@sentry/node"
import express from "express"

import { apiV1 } from "./api/v1.js"
import { apiErrorHandler } from "./lib/errors.js"

const port = Number(process.env.PORT) || 3001
const app = express()

app.set("trust proxy", 1)
app.use(express.json())

// HTTP API versions live under /api/v{n}. v1 is the current surface.
// Add /api/v2 (and keep v1) only for a breaking change; do not register
// new handlers on unversioned /api/... paths.
app.use("/api/v1", apiV1)

Sentry.setupExpressErrorHandler(app)
app.use(apiErrorHandler)

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://localhost:${port}`)
})
