import { useAuth } from "@clerk/react"
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  CircleAlertIcon,
  DatabaseIcon,
  FileIcon,
  GaugeIcon,
  GitPullRequestIcon,
  HashIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { useReviewCredits } from "@/components/ReviewCreditsContext"
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
import { formatIndexedAgo } from "@/lib/github-repo-meta"
import {
  toastApiError,
  toastError,
  toastSuccess,
  toastWarning,
} from "@/lib/app-toast"
import { cn } from "@/lib/utils"

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

function SeverityIcon({ severity, ...props }) {
  if (severity === "high") {
    return <AlertTriangleIcon {...props} />
  }
  if (severity === "low") {
    return <CheckCircleIcon {...props} />
  }
  return <AlertCircleIcon {...props} />
}

function SeverityBadge({ severity }) {
  return (
    <Badge variant={severityVariant(severity)}>
      <SeverityIcon severity={severity} data-icon="inline-start" />
      {severity}
    </Badge>
  )
}

function findingTone(severity) {
  if (severity === "high") {
    return "bg-red-50"
  }
  if (severity === "low") {
    return "bg-emerald-50"
  }
  return "bg-amber-50"
}

function FindingMeta({ finding, showPr = false }) {
  const items = [
    showPr && finding.prNumber
      ? {
          key: "pr",
          icon: GitPullRequestIcon,
          label: `PR #${finding.prNumber}`,
        }
      : null,
    finding.file
      ? { key: "file", icon: FileIcon, label: finding.file }
      : null,
    finding.line
      ? { key: "line", icon: HashIcon, label: `line ${finding.line}` }
      : null,
    {
      key: "confidence",
      icon: GaugeIcon,
      label: formatConfidence(finding.confidence),
    },
    finding.createdAt
      ? {
          key: "date",
          icon: CalendarIcon,
          label: formatDate(finding.createdAt),
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.key} className="inline-flex min-w-0 items-center gap-1">
          <item.icon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="wrap-break-word">{item.label}</span>
        </span>
      ))}
    </div>
  )
}

function FindingList({ findings, showPr = false, showSeverity = true, layout = "plain" }) {
  const isCards = layout === "cards"

  return (
    <ul className="flex flex-col gap-3">
      {sortFindings(findings).map((finding, index) => (
        <li key={`${finding.reviewId}-${finding.file}-${finding.line}-${index}`}>
          <div
            className={cn(
              "flex flex-col gap-2",
              isCards &&
                cn(
                  "rounded-lg p-3",
                  findingTone(finding.severity)
                )
            )}
          >
            <div className="flex items-start gap-2">
              {showSeverity ? <SeverityBadge severity={finding.severity} /> : null}
              <p className="min-w-0 flex-1">{finding.description}</p>
            </div>
            {isCards ? (
              <FindingMeta finding={finding} showPr={showPr} />
            ) : (
              <p className="wrap-break-word text-muted-foreground">
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
            )}
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
            <FindingList
              findings={group.items}
              showPr={showPr}
              showSeverity={false}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function SecurityFindings({ findings, openTarget }) {
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

  const [openItems, setOpenItems] = useState(() =>
    openTarget?.prNumber != null ? [String(openTarget.prNumber)] : []
  )

  useEffect(() => {
    if (openTarget?.prNumber == null) {
      return
    }

    const id = String(openTarget.prNumber)
    setOpenItems((current) => [
      id,
      ...current.filter((item) => item !== id),
    ])

    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-pr-number="${id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [openTarget])

  return (
    <Accordion
      multiple
      className="gap-3"
      value={openItems}
      onValueChange={(next) => {
        setOpenItems(Array.isArray(next) ? next : next ? [next] : [])
      }}
    >
      {pullRequests.map((pull) => {
        const count = pull.findings.length
        const severity = count > 0 ? highestSeverity(pull.findings) : null

        if (count === 0) {
          return (
            <div
              key={pull.prNumber}
              data-pr-number={pull.prNumber}
              className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-muted-foreground">{`PR #${pull.prNumber}`}</span>
                <span className="min-w-0 truncate font-medium">
                  {pull.title ?? "Untitled pull request"}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircleIcon aria-hidden="true" className="size-4" />
                No issues found
              </span>
            </div>
          )
        }

        return (
          <AccordionItem
            key={pull.prNumber}
            value={String(pull.prNumber)}
            data-pr-number={pull.prNumber}
            className="rounded-xl border bg-card shadow-sm not-last:border-b-0 transition-shadow hover:shadow-md"
          >
            <AccordionTrigger className="items-center gap-3 px-4 py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-muted-foreground">{`PR #${pull.prNumber}`}</span>
                <span className="min-w-0 truncate font-medium">
                  {pull.title ?? "Untitled pull request"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <SeverityBadge severity={severity} />
                <span className="text-muted-foreground">
                  {count} {count === 1 ? "finding" : "findings"}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 [&_p:not(:last-child)]:mb-0">
              <FindingList findings={pull.findings} layout="cards" />
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

function PullRequestReviewButton({
  isReviewing,
  reviewingNumber,
  onReview,
  className,
  outOfCredits = false,
  hasFindings = false,
  onViewFindings,
}) {
  if (hasFindings) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={(event) => {
          event.stopPropagation()
          onViewFindings?.()
        }}
      >
        View findings
      </Button>
    )
  }

  const disabled = reviewingNumber !== null
  const button = (
    <Button
      size="sm"
      className={outOfCredits ? undefined : className}
      disabled={disabled || outOfCredits}
      onClick={(event) => {
        event.stopPropagation()
        if (outOfCredits) {
          toastError(
            "No review credits",
            "Reviews are paused until credits are restored."
          )
          return
        }
        onReview()
      }}
    >
      {isReviewing ? <Spinner data-icon="inline-start" /> : null}
      {isReviewing ? "Reviewing..." : "Review"}
    </Button>
  )

  if (!outOfCredits) {
    return button
  }

  return (
    <span
      className={cn("inline-flex", className)}
      onClick={(event) => {
        event.stopPropagation()
        toastError(
          "No review credits",
          "Reviews are paused until credits are restored."
        )
      }}
    >
      {button}
    </span>
  )
}

function PullRequestReviewBlock({
  isReviewing,
  reviewingNumber,
  review,
  onReview,
  showButton = true,
  outOfCredits = false,
  hasFindings = false,
  onViewFindings,
}) {
  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-3 lg:min-w-56">
      {showButton ? (
        <PullRequestReviewButton
          isReviewing={isReviewing}
          reviewingNumber={reviewingNumber}
          onReview={onReview}
          outOfCredits={outOfCredits}
          hasFindings={hasFindings}
          onViewFindings={onViewFindings}
        />
      ) : null}
      
      {review && !hasFindings ? (
        <ReviewFindings
          findings={Array.isArray(review.findings) ? review.findings : []}
        />
      ) : null}
    </div>
  )
}

function PullRequestsTab({ repoId, indexed, onReviewed, onViewFindings }) {
  const { getToken } = useAuth()
  const { reviewCredits, setReviewCredits } = useReviewCredits()
  const outOfCredits = reviewCredits === 0
  const [pulls, setPulls] = useState(null)
  const [error, setError] = useState(null)
  const [reviews, setReviews] = useState({})
  const [reviewedPrs, setReviewedPrs] = useState(() => new Set())
  const [reviewingNumber, setReviewingNumber] = useState(null)

  async function handleReview(prNumber) {
    if (outOfCredits) {
      toastError(
        "No review credits",
        "Reviews are paused until credits are restored."
      )
      return
    }

    if (!indexed) {
      toastWarning(
        "Repo not indexed",
        "Index the repo in Settings so reviews can use your full codebase."
      )
    }

    setReviewingNumber(prNumber)

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
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(data.error ?? "Review failed")
        error.status = response.status
        throw error
      }
      if (typeof data.reviewCredits === "number") {
        setReviewCredits(data.reviewCredits)
      }
      setReviews((current) => ({ ...current, [prNumber]: data }))
      setReviewedPrs((current) => {
        const next = new Set(current)
        next.add(prNumber)
        return next
      })
      const findingCount = Array.isArray(data.findings) ? data.findings.length : 0
      toastSuccess(
        "Review complete",
        findingCount === 1
          ? `1 issue flagged in PR #${prNumber}`
          : `${findingCount} issues flagged in PR #${prNumber}`
      )
      onReviewed?.()
    } catch (err) {
      toastApiError(err, "Review failed")
    } finally {
      setReviewingNumber(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) =>
        Promise.all([
          fetch(`/api/repos/${repoId}/prs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/repos/${repoId}/reviews`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
      )
      .then(async ([prsResponse, reviewsResponse]) => {
        const prsData = await prsResponse.json().catch(() => ({}))
        if (!prsResponse.ok) {
          const error = new Error(prsData.error ?? "Failed to load pull requests")
          error.status = prsResponse.status
          throw error
        }

        let reviewed = new Set()
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          reviewed = new Set(
            (Array.isArray(reviewsData.findings) ? reviewsData.findings : [])
              .map((finding) => finding.prNumber)
              .filter((number) => Number.isFinite(number))
          )
        }

        return {
          pulls: Array.isArray(prsData) ? prsData : [],
          reviewed,
        }
      })
      .then((data) => {
        if (!cancelled) {
          setPulls(data.pulls)
          setReviewedPrs(data.reviewed)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastApiError(err, "Could not load pull requests")
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
    return <RepoEmptyState title="No pull requests" />
  }

  if (pulls.length === 0) {
    return <RepoEmptyState title="No pull requests" />
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">
        {pulls.map((pull) => {
          const isReviewing = reviewingNumber === pull.number
          const review = reviews[pull.number]
          const hasFindings =
            reviewedPrs.has(pull.number) || Boolean(review)

          return (
            <Card key={pull.number}>
              <CardContent className="flex flex-col ">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <CardTitle className="min-w-0 truncate text-sm">
                      <span className="text-muted-foreground">
                        #{pull.number}
                      </span>{" "}
                      <span>{pull.title}</span>
                    </CardTitle>
                    <Badge
                      className="shrink-0"
                      variant={prStateVariant(pull.state)}
                    >
                      {pull.state}
                    </Badge>
                  </div>
                  <PullRequestReviewButton
                    className="row-span-2 self-center"
                    isReviewing={isReviewing}
                    reviewingNumber={reviewingNumber}
                    outOfCredits={outOfCredits}
                    hasFindings={hasFindings}
                    onViewFindings={() => onViewFindings?.(pull.number)}
                    onReview={() => handleReview(pull.number)}
                  />
                  <CardDescription>
                    {pull.author ?? "—"} · {formatDate(pull.created_at)}
                  </CardDescription>
                </div>
                <PullRequestReviewBlock
                  showButton={false}
                  isReviewing={isReviewing}
                  reviewingNumber={reviewingNumber}
                  review={review}
                  outOfCredits={outOfCredits}
                  hasFindings={hasFindings}
                  onViewFindings={() => onViewFindings?.(pull.number)}
                  onReview={() => handleReview(pull.number)}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="hidden lg:block">
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
              const hasFindings =
                reviewedPrs.has(pull.number) || Boolean(review)

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
                    <PullRequestReviewBlock
                      isReviewing={isReviewing}
                      reviewingNumber={reviewingNumber}
                      review={review}
                      outOfCredits={outOfCredits}
                      hasFindings={hasFindings}
                      onViewFindings={() => onViewFindings?.(pull.number)}
                      onReview={() => handleReview(pull.number)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function SecurityTab({ repoId, securityRefreshKey, openTarget }) {
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
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(data.error ?? "Failed to load security findings")
          error.status = response.status
          throw error
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
          toastApiError(err, "Could not load security findings")
          setError(err.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [getToken, repoId, securityRefreshKey])

  if (!findings && !error) {
    return <SecurityFindingsSkeleton />
  }

  if (error) {
    return <RepoEmptyState title="No review findings yet" />
  }

  if (findings.length === 0) {
    return <RepoEmptyState title="No review findings yet" />
  }

  return <SecurityFindings findings={findings} openTarget={openTarget} />
}

function SettingsTab({ repo, settingsRefreshKey, onIndexed }) {
  const { getToken } = useAuth()
  const [indexing, setIndexing] = useState(false)

  async function handleIndex() {
    const wasIndexed = Boolean(repo.indexedAt)
    setIndexing(true)

    try {
      const token = await getToken()
      const response = await fetch(`/api/repos/${repo.id}/index`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(data.error ?? "Indexing failed")
        error.status = response.status
        throw error
      }
      onIndexed(data)
      toastSuccess(
        wasIndexed ? "Repository re-indexed" : "Repository indexed",
        repo.repoName
      )
    } catch (err) {
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
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircleIcon aria-hidden="true" className="size-4" />
            {indexedLabel ?? "Indexed"}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CircleAlertIcon aria-hidden="true" className="size-4 text-amber-500" />
            Not indexed yet
          </p>
        )}
        <Button disabled={indexing} onClick={handleIndex}>
          {indexing ? <Spinner data-icon="inline-start" /> : null}
          {indexing ? "Indexing..." : hasIndex ? "Re-index Repo" : "Index Repo"}
        </Button>
        {hasIndex ? (
          <p className="text-xs text-muted-foreground">
            Re-indexing replaces the previous index for this repo.
          </p>
        ) : null}
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
  const [securityRefreshKey, setSecurityRefreshKey] = useState(0)
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0)
  const [tab, setTab] = useState("pull-requests")
  const [openFindingPr, setOpenFindingPr] = useState(null)

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) =>
        fetch(`/api/repos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(data.error ?? "Repo not found")
          error.status = response.status
          throw error
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
          toastApiError(err, "Could not load repository")
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="font-heading min-w-0 truncate text-lg font-medium md:text-xl">
            {repo.repoName}
          </h1>
          <Badge variant="secondary">{repo.provider}</Badge>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList className="h-8 w-full max-w-full justify-start overflow-x-auto md:w-fit">
          <TabsTrigger className="flex-none" value="pull-requests">
            Pull Requests
          </TabsTrigger>
          <TabsTrigger className="flex-none" value="security">
            Security
          </TabsTrigger>
          <TabsTrigger className="relative flex-none pr-3" value="settings">
            Settings
            {!repo.indexedAt ? (
              <span
                aria-label="Repository not indexed"
                className="absolute top-0.5 right-1 size-1.5 rounded-full bg-amber-500"
              />
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent className="min-w-0" value="pull-requests" keepMounted>
          <PullRequestsTab
            repoId={id}
            indexed={Boolean(repo.indexedAt)}
            onReviewed={() =>
              setSecurityRefreshKey((current) => current + 1)
            }
            onViewFindings={(prNumber) => {
              setOpenFindingPr({ prNumber, timestamp: Date.now() })
              setTab("security")
            }}
          />
        </TabsContent>
        <TabsContent value="security" keepMounted>
          <SecurityTab
            repoId={id}
            securityRefreshKey={securityRefreshKey}
            openTarget={openFindingPr}
          />
        </TabsContent>
        <TabsContent value="settings" keepMounted>
          <SettingsTab
            repo={repo}
            settingsRefreshKey={settingsRefreshKey}
            onIndexed={(indexed) => {
              setRepo((current) => ({ ...current, ...indexed }))
              setSettingsRefreshKey((current) => current + 1)
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

