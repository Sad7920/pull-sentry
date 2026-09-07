import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function ScreenReaderStatus({ label }) {
  return <span className="sr-only">{label}</span>
}

export function ConnectedReposSkeleton() {
  return (
    <div
      className="flex w-full max-w-4xl flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading connected repositories" />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-5 w-3/4" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-1/2" />
              </CardDescription>
              <Skeleton className="h-5 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AvailableReposSkeleton() {
  return (
    <div
      className="flex w-full max-w-4xl flex-col gap-3"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading repositories to connect" />
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index}>
          <CardHeader className="flex-row items-center gap-3">
            <Skeleton className="h-5 w-32 shrink-0" />
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-5 w-16 shrink-0" />
            <Skeleton className="h-8 w-20 shrink-0" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export function PullRequestsTableSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ScreenReaderStatus label="Loading pull requests" />
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
          {Array.from({ length: 5 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-10" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-7 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function SecurityFindingsSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-live="polite">
      <ScreenReaderStatus label="Loading security findings" />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 border-b py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="h-5 w-14 shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function ReviewFindingsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2" aria-busy="true">
      <ScreenReaderStatus label="Loading review results" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function RepoDetailPageSkeleton() {
  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 bg-background p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading repository" />
      <Skeleton className="h-8 w-20" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-80" />
      <PullRequestsTableSkeleton />
    </main>
  )
}

export function AuthGateSkeleton() {
  return (
    <div
      className="flex min-h-svh flex-col bg-background p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading account" />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-28" />
            </CardDescription>
          </CardHeader>
        </Card>
        <ConnectedReposSkeleton />
      </div>
    </div>
  )
}
