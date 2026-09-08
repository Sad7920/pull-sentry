import { getAuth } from "@clerk/express"

import { captureCaughtError } from "../sentry.js"

export class AppError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function withTimeout(ms, fn) {
  return (req, res, next) => {
    req.setTimeout(ms)
    res.setTimeout(ms)
    asyncHandler(fn)(req, res, next)
  }
}

function statusFor(error) {
  if (error.type === "entity.parse.failed") {
    return 400
  }

  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return error.status
  }

  return 500
}

function messageFor(error, status) {
  if (error.type === "entity.parse.failed") {
    return "Invalid JSON body"
  }

  if (error instanceof AppError) {
    return error.message
  }

  if (status >= 400 && status < 500 && error.message) {
    return error.message
  }

  if (status === 502 || status === 503) {
    return error.message || "Request failed"
  }

  return "Internal server error"
}

function clerkUserIdFromRequest(req) {
  try {
    return getAuth(req).userId
  } catch {
    return undefined
  }
}

export function apiErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  const status = statusFor(error)

  if (!(error instanceof AppError)) {
    captureCaughtError(error, {
      userId: clerkUserIdFromRequest(req),
      repoId: req.params?.id ?? req.body?.repoId,
      prNumber: req.params?.prNumber,
      step: req.sentryStep ?? req.route?.path ?? "express",
    })
  }

  res.status(status).json({
    error: messageFor(error, status),
  })
}
