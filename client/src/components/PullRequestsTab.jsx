import { useAuth } from "@clerk/react"
import { useEffect, useState } from "react"

import { PageEmptyState } from "@/components/PageEmptyState"
import { PullRequestsTableSkeleton } from "@/components/page-skeletons"
import { ReviewFindings } from "@/components/ReviewFindings"
import { useReviewCredits } from "@/components/ReviewCreditsContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { authedFetch } from "@/lib/api"
import {
  toastApiError,
  toastError,
  toastSuccess,
  toastWarning,
} from "@/lib/app-toast"
import { formatShortDate } from "@/lib/github-repo-meta"
import { cn } from "@/lib/utils"

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
    <Tooltip delay={0}>
      <TooltipTrigger
        render={
          <span
            className={cn("inline-flex", className)}
            onClick={(event) => {
              event.stopPropagation()
              toastError(
                "No review credits",
                "Reviews are paused until credits are restored."
              )
            }}
          />
        }
      >
        {button}
      </TooltipTrigger>
      <TooltipContent>
        You&apos;re out of review credits. Reviews are paused until credits are
        restored.
      </TooltipContent>
    </Tooltip>
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

export function PullRequestsTab({ repoId, indexed, onReviewed, onViewFindings }) {
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
      const data = await authedFetch(getToken, `/prs/${prNumber}/review`, {
        method: "POST",
        body: { repoId },
        fallback: "Review failed",
      })
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

    async function loadPulls() {
      try {
        const [prsData, reviewsData] = await Promise.all([
          authedFetch(getToken, `/repos/${repoId}/prs`, {
            fallback: "Failed to load pull requests",
          }),
          authedFetch(getToken, `/repos/${repoId}/reviews`, {
            fallback: "Failed to load security findings",
          }).catch(() => ({ findings: [] })),
        ])

        if (cancelled) {
          return
        }

        const reviewed = new Set(
          (Array.isArray(reviewsData.findings) ? reviewsData.findings : [])
            .map((finding) => finding.prNumber)
            .filter((number) => Number.isFinite(number))
        )

        setPulls(Array.isArray(prsData) ? prsData : [])
        setReviewedPrs(reviewed)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          toastApiError(err, "Could not load pull requests")
          setError(err.message)
        }
      }
    }

    loadPulls()

    return () => {
      cancelled = true
    }
  }, [getToken, repoId])

  if (!pulls && !error) {
    return <PullRequestsTableSkeleton />
  }

  if (error) {
    return (
      <PageEmptyState
        icon="pulls"
        title="Couldn't load pull requests"
        description={error}
      />
    )
  }

  if (pulls.length === 0) {
    return (
      <PageEmptyState
        icon="pulls"
        title="No pull requests"
        description="Open or recently closed PRs for this repo will show up here."
      />
    )
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
              <CardContent className="flex flex-col">
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
                    {pull.author ?? "—"} · {formatShortDate(pull.created_at)}
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
                  <TableCell>{formatShortDate(pull.created_at)}</TableCell>
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
