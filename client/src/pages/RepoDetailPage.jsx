import { useAuth } from "@clerk/react"
import { ArrowLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function RepoEmptyState() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>No data yet</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

export function RepoDetailPage() {
  const { id } = useParams()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [repo, setRepo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) =>
        fetch(`/api/repos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Repo not found")
        }
        return data
      })
      .then((data) => {
        if (!cancelled) {
          setRepo(data)
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
  }, [getToken, id])

  if (!repo && !error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{error}</EmptyTitle>
          </EmptyHeader>
        </Empty>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to dashboard
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 bg-background p-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="font-heading truncate text-xl font-medium">
            {repo.repoName}
          </h1>
          <Badge variant="secondary">{repo.provider}</Badge>
        </div>
      </div>

      <Tabs defaultValue="pull-requests">
        <TabsList>
          <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="pull-requests">
          <RepoEmptyState />
        </TabsContent>
        <TabsContent value="security">
          <RepoEmptyState />
        </TabsContent>
        <TabsContent value="settings">
          <RepoEmptyState />
        </TabsContent>
      </Tabs>
    </main>
  )
}
