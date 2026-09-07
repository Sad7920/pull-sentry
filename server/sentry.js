import * as Sentry from "@sentry/node"

export function captureCaughtError(error, { repoId, prNumber, step } = {}) {
  if (error?.sentryCaptured) {
    return
  }

  Sentry.withScope((scope) => {
    if (repoId) {
      scope.setTag("repoId", String(repoId))
    }

    if (prNumber != null && !Number.isNaN(prNumber)) {
      scope.setTag("prNumber", String(prNumber))
    }

    if (step) {
      scope.setTag("step", step)
    }

    scope.setContext("pullSentry", {
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
