import { useAuth } from "@clerk/react"
import { useEffect, useState } from "react"

import { PageEmptyState } from "@/components/PageEmptyState"
import { SecurityFindingsSkeleton } from "@/components/page-skeletons"
import { SecurityFindings } from "@/components/ReviewFindings"
import { authedFetch } from "@/lib/api"
import { toastApiError } from "@/lib/app-toast"

export function SecurityTab({ repoId, securityRefreshKey, openTarget }) {
  const { getToken } = useAuth()
  const [findings, setFindings] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadFindings() {
      try {
        const data = await authedFetch(getToken, `/api/repos/${repoId}/reviews`, {
          fallback: "Failed to load security findings",
        })
        if (!cancelled) {
          setFindings(Array.isArray(data.findings) ? data.findings : [])
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          toastApiError(err, "Could not load security findings")
          setError(err.message)
        }
      }
    }

    loadFindings()

    return () => {
      cancelled = true
    }
  }, [getToken, repoId, securityRefreshKey])

  if (!findings && !error) {
    return <SecurityFindingsSkeleton />
  }

  if (error) {
    return (
      <PageEmptyState
        icon="findings"
        title="Couldn't load review findings"
        description={error}
      />
    )
  }

  if (findings.length === 0) {
    return (
      <PageEmptyState
        icon="findings"
        title="No review findings yet"
        description="Run a review from the Pull Requests tab to see issues here."
      />
    )
  }

  return <SecurityFindings findings={findings} openTarget={openTarget} />
}
