import { useAuth } from "@clerk/react"
import { ArrowLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function RepoEmptyState({ title = "No data yet" }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function prStateVariant(state) {
  if (state === "open") {
    return "success"
  }
  if (state === "merged") {
    return "default"
  }
  return "secondary"
}

function PullRequestsTab({ repoId }) {
  const { getToken } = useAuth()
  const [pulls, setPulls] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) =>
        fetch(`/api/repos/${repoId}/prs`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load pull requests")
        }
        return data
      })
      .then((data) => {
        if (!cancelled) {
          setPulls(Array.isArray(data) ? data : [])
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
  }, [getToken, repoId])

  if (!pulls && !error) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return <RepoEmptyState title={error} />
  }

  if (pulls.length === 0) {
    return <RepoEmptyState title="No pull requests" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pulls.map((pull) => (
          <TableRow key={pull.number}>
            <TableCell>#{pull.number}</TableCell>
            <TableCell className="max-w-xs truncate">{pull.title}</TableCell>
            <TableCell>{pull.author ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={prStateVariant(pull.state)}>{pull.state}</Badge>
            </TableCell>
            <TableCell>{formatDate(pull.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SettingsTab({ repo, onIndexed }) {
  const { getToken } = useAuth()
  const [indexing, setIndexing] = useState(false)
  const [error, setError] = useState(null)

  async function handleIndex() {
    setIndexing(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(`/api/repos/${repo.id}/index`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Indexing failed")
      }
      onIndexed(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIndexing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository index</CardTitle>
        <CardDescription>
          Embed source files locally and store vectors in Chroma. Run this once
          per repo when you are ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        {repo.indexedAt ? (
          <p className="text-muted-foreground">
            Indexed {formatDate(repo.indexedAt)}
          </p>
        ) : null}
        {error ? <p className="text-destructive">{error}</p> : null}
        <Button disabled={indexing} onClick={handleIndex}>
          {indexing ? <Spinner data-icon="inline-start" /> : null}
          {indexing ? "Indexing..." : "Index Repo"}
        </Button>
      </CardContent>
    </Card>
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
          <PullRequestsTab repoId={id} />
        </TabsContent>
        <TabsContent value="security">
          <RepoEmptyState />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            repo={repo}
            onIndexed={(indexed) => {
              setRepo((current) => ({ ...current, ...indexed }))
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
