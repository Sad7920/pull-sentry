import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  FileIcon,
  GaugeIcon,
  GitPullRequestIcon,
  HashIcon,
} from "lucide-react"
import { useEffect, useState } from "react"

import { PageEmptyState } from "@/components/PageEmptyState"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { formatShortDate } from "@/lib/github-repo-meta"
import { findingTone, highestSeverity, severityVariant } from "@/lib/severity"
import { cn } from "@/lib/utils"

function formatConfidence(confidence) {
  if (typeof confidence !== "number") {
    return "No confidence score"
  }

  return `${Math.round(confidence * 100)}% confidence`
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

export function SeverityBadge({ severity }) {
  return (
    <Badge variant={severityVariant(severity)}>
      <SeverityIcon severity={severity} data-icon="inline-start" />
      {severity}
    </Badge>
  )
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
          label: formatShortDate(finding.createdAt),
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
              isCards && cn("rounded-lg p-3", findingTone(finding.severity))
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
                  finding.createdAt ? formatShortDate(finding.createdAt) : null,
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

export function ReviewFindings({ findings, showPr = false }) {
  const groups = ["high", "medium", "low"]
    .map((severity) => ({
      severity,
      items: findings.filter((finding) => finding.severity === severity),
    }))
    .filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return (
      <PageEmptyState
        icon="findings"
        title="No findings"
        description="This review did not flag any issues."
      />
    )
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

export function SecurityFindings({ findings, openTarget }) {
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
    setOpenItems((current) => [id, ...current.filter((item) => item !== id)])

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
              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-success">
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
