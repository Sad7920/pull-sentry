import { useAuth } from "@clerk/react"
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import {
  PullRequestsTableSkeleton,
  RepoDetailPageSkeleton,
  ReviewFindingsSkeleton,
  SecurityFindingsSkeleton,
} from "@/components/page-skeletons"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

function severityVariant(severity) {
  if (severity === "high") {
    return "destructive"
  }
  if (severity === "low") {
    return "success"
  }
  return "warning"
}

function formatConfidence(confidence) {
  if (typeof confidence !== "number") {
    return "No confidence score"
  }

  return `${Math.round(confidence * 100)}% confidence`
}

function highestSeverity(findings) {
  if (findings.some((finding) => finding.severity === "high")) {
    return "high"
  }
  if (findings.some((finding) => finding.severity === "medium")) {
    return "medium"
  }
  return "low"
}

function sortFindings(findings) {
  const rank = { high: 0, medium: 1, low: 2 }

  return [...findings].sort((left, right) => {
    const severityDelta =
      (rank[left.severity] ?? 1) - (rank[right.severity] ?? 1)

    if (severityDelta !== 0) {
      return severityDelta
    }

    return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
  })
}

function FindingList({ findings, showPr = false }) {
  return (
    <ul className="flex flex-col gap-3">
      {sortFindings(findings).map((finding, index) => (
        <li key={`${finding.reviewId}-${finding.file}-${finding.line}-${index}`}>
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <Badge variant={severityVariant(finding.severity)}>
                {finding.severity}
              </Badge>
              <p>{finding.description}</p>
            </div>
            <p className="text-muted-foreground">
              {[
                showPr && finding.prNumber ? `PR #${finding.prNumber}` : null,
                finding.file,
                finding.line ? `line ${finding.line}` : null,
                formatConfidence(finding.confidence),
                finding.createdAt ? formatDate(finding.createdAt) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ReviewFindings({ findings, showPr = false }) {
  const groups = ["high", "medium", "low"]
    .map((severity) => ({
      severity,
      items: findings.filter((finding) => finding.severity === severity),
    }))
    .filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return <RepoEmptyState title="No findings" />
  }

  return (
    <Accordion multiple defaultValue={groups.map((group) => group.severity)}>
      {groups.map((group) => (
        <AccordionItem key={group.severity} value={group.severity}>
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Badge variant={severityVariant(group.severity)}>
                {group.severity}
              </Badge>
              <span>
                {group.items.length}{" "}
                {group.items.length === 1 ? "finding" : "findings"}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <FindingList findings={group.items} showPr={showPr} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function SecurityFindings({ findings }) {
  const pullRequests = []
  const groups = new Map()

  for (const finding of findings) {
    const prNumber = finding.prNumber
    let group = groups.get(prNumber)

    if (!group) {
      group = {
        prNumber,
        title: finding.prTitle,
        createdAt: finding.createdAt,
        findings: [],
      }
      groups.set(prNumber, group)
      pullRequests.push(group)
    }

    group.findings.push(finding)

    if (finding.prTitle) {
      group.title = finding.prTitle
    }

    if (Date.parse(finding.createdAt) > Date.parse(group.createdAt || 0)) {
      group.createdAt = finding.createdAt
    }
  }

  pullRequests.sort(
    (left, right) =>
      (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
  )

  return (
    <Accordion
      multiple
      // defaultValue={pullRequests.map((pull) => String(pull.prNumber))}
    >
      {pullRequests.map((pull) => {
        const severity = highestSeverity(pull.findings)
        const count = pull.findings.length

        return (
          <AccordionItem key={pull.prNumber} value={String(pull.prNumber)}>
            <AccordionTrigger className="hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <span className="shrink-0">{`PR #${pull.prNumber}`}</span>
                <span className="truncate font-medium">
                  {pull.title ?? "Untitled pull request"}
                </span>
                <Badge variant={severityVariant(severity)}>{severity}</Badge>
                <span className="shrink-0 text-muted-foreground self-end">
                  {count} {count === 1 ? "finding" : "findings"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <FindingList findings={pull.findings} />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
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

function PullRequestsTab({ repoId, onReviewed }) {
  const { getToken } = useAuth()
  const [pulls, setPulls] = useState(null)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState({})
  const [reviewingNumber, setReviewingNumber] = useState(null)
  const [reviewErrors, setReviewErrors] = useState({})

  async function handleReview(prNumber) {
    setReviewingNumber(prNumber)
    setReviewErrors((current) => ({ ...current, [prNumber]: null }))

    try {
      const token = await getToken()
      const response = await fetch(`/api/prs/${prNumber}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Review failed")
      }
      setReviews((current) => ({ ...current, [prNumber]: data }))
      onReviewed?.()
    } catch (err) {
      setReviewErrors((current) => ({
        ...current,
        [prNumber]: err.message,
      }))
    } finally {
      setReviewingNumber(null)
    }
  }

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
    return <PullRequestsTableSkeleton />
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
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {pulls.map((pull) => {
          const isReviewing = reviewingNumber === pull.number
          const review = reviews[pull.number]
          const reviewError = reviewErrors[pull.number]

          return (
            <TableRow key={pull.number}>
              <TableCell>#{pull.number}</TableCell>
              <TableCell className="max-w-xs truncate">{pull.title}</TableCell>
              <TableCell>{pull.author ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={prStateVariant(pull.state)}>
                  {pull.state}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(pull.created_at)}</TableCell>
              <TableCell>
                <div className="flex min-w-56 flex-col items-start gap-3">
                  <Button
                    size="sm"
                    disabled={reviewingNumber !== null}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleReview(pull.number)
                    }}
                  >
                    {isReviewing ? <Spinner data-icon="inline-start" /> : null}
                    {isReviewing ? "Reviewing..." : "Review this PR"}
                  </Button>
                  {isReviewing && !review ? <ReviewFindingsSkeleton /> : null}
                  {reviewError ? (
                    <Alert variant="destructive">
                      <AlertCircleIcon />
                      <AlertTitle>Review failed</AlertTitle>
                      <AlertDescription>{reviewError}</AlertDescription>
                    </Alert>
                  ) : null}
                  {review ? (
                    <ReviewFindings
                      findings={
                        Array.isArray(review.findings) ? review.findings : []
                      }
                    />
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function SecurityTab({ repoId, refreshKey }) {
  const { getToken } = useAuth()
  const [findings, setFindings] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) =>
        fetch(`/api/repos/${repoId}/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load security findings")
        }
        return data
      })
      .then((data) => {
        if (!cancelled) {
          setFindings(Array.isArray(data.findings) ? data.findings : [])
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
  }, [getToken, repoId, refreshKey])

  if (!findings && !error) {
    return <SecurityFindingsSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Could not load security findings</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (findings.length === 0) {
    return <RepoEmptyState title="No review findings yet" />
  }

  return <SecurityFindings findings={findings} />
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
  const [reviewsVersion, setReviewsVersion] = useState(0)

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
    return <RepoDetailPageSkeleton />
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
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 bg-background p-6">
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
          <PullRequestsTab
            repoId={id}
            onReviewed={() => setReviewsVersion((current) => current + 1)}
          />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab repoId={id} refreshKey={reviewsVersion} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            repo={repo}
            onIndexed={(indexed) => setRepo((current) => ({ ...current, ...indexed }))}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

