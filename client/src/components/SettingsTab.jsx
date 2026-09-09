import { useAuth } from "@clerk/react"
import {
  CheckCircleIcon,
  CircleAlertIcon,
  DatabaseIcon,
} from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { authedFetch } from "@/lib/api"
import { toastApiError, toastSuccess } from "@/lib/app-toast"
import { formatIndexedAgo } from "@/lib/github-repo-meta"

export function SettingsTab({ repo, onIndexed }) {
  const { getToken } = useAuth()
  const [indexing, setIndexing] = useState(false)
  const [indexError, setIndexError] = useState(null)

  async function handleIndex() {
    const wasIndexed = Boolean(repo.indexedAt)
    setIndexing(true)
    setIndexError(null)

    try {
      const data = await authedFetch(getToken, `/repos/${repo.id}/index`, {
        method: "POST",
        fallback: "Indexing failed",
      })
      onIndexed(data)
      toastSuccess(
        wasIndexed ? "Repository re-indexed" : "Repository indexed",
        repo.repoName
      )
    } catch (err) {
      const message = err.message || "Something went wrong. Try again."
      setIndexError(message)
      toastApiError(err, "Indexing failed")
    } finally {
      setIndexing(false)
    }
  }

  const hasIndex = Boolean(repo.indexedAt)
  const indexedLabel = hasIndex ? formatIndexedAgo(repo.indexedAt) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          Repository index
        </CardTitle>
        <CardDescription>
          PullSentry reads your repo&apos;s code so review feedback is grounded
          in your actual codebase — catching things like duplicated logic or
          broken conventions, not just issues visible in the diff alone. Index
          once, then re-index anytime your code changes significantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        {hasIndex ? (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircleIcon aria-hidden="true" className="size-4" />
            {indexedLabel ?? "Indexed"}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleAlertIcon aria-hidden="true" className="size-4 text-warning" />
            Not indexed yet
          </p>
        )}
        <Button disabled={indexing} onClick={handleIndex}>
          {indexing ? <Spinner data-icon="inline-start" /> : null}
          {indexing ? "Indexing..." : hasIndex ? "Re-index Repo" : "Index Repo"}
        </Button>
        {indexError ? (
          <Alert variant="destructive" className="w-full">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Indexing failed</AlertTitle>
            <AlertDescription>{indexError}</AlertDescription>
          </Alert>
        ) : null}
        {hasIndex ? (
          <p className="text-xs text-muted-foreground">
            Re-indexing replaces the previous index for this repo.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
