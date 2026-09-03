import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function App() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch("/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (!cancelled) {
          setStatus(data.status ?? "unknown")
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Server health</CardTitle>
          <CardDescription>Status from GET /health</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Badge variant="destructive">{error}</Badge>
          ) : status ? (
            <Badge>{status}</Badge>
          ) : (
            <Spinner />
          )}
        </CardContent>
      </Card>
    </main>
  )
}
