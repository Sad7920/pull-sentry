import * as Sentry from "@sentry/node"

export function captureCaughtError(error, { repoId, prNumber, step, userId } = {}) {
  if (error?.sentryCaptured) {
    return
  }

  Sentry.withScope((scope) => {
    if (userId) {
      scope.setUser({ id: String(userId) })
      scope.setTag("userId", String(userId))
    }

    if (repoId) {
      scope.setTag("repoId", String(repoId))
    }

    if (prNumber != null && !Number.isNaN(Number(prNumber))) {
      scope.setTag("prNumber", String(prNumber))
    }

    if (step) {
      scope.setTag("step", step)
    }

    scope.setContext("pullSentry", {
      userId: userId ?? null,
      repoId: repoId ?? null,
      prNumber: prNumber ?? null,
      step: step ?? null,
    })

    Sentry.captureException(error)
  })

  if (error && typeof error === "object") {
    error.sentryCaptured = true
  }
}
