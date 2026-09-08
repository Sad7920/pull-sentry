import {
  Card,
  CardContent,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader className="gap-2">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                  <CardTitle className="flex-1">
                    <Skeleton className="h-5 w-3/4" />
                  </CardTitle>
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <CardDescription>
                  <Skeleton className="h-3 w-28" />
                </CardDescription>
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
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
      className="flex w-full flex-col gap-3"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading repositories to connect" />
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index} size="sm">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 gap-3">
              <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-32 shrink-0" />
                </div>
              </div>
            </div>
            <Skeleton className="h-8 w-20 shrink-0 self-end sm:self-center" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PullRequestsTableSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <ScreenReaderStatus label="Loading pull requests" />
      <div className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-14 shrink-0" />
              </div>
              <Skeleton className="row-span-2 h-7 w-16 shrink-0 self-center" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
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
    </div>
  )
}

export function SecurityFindingsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <ScreenReaderStatus label="Loading security findings" />
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
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

export function RepoDetailPageSkeleton() {
  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 bg-background p-4 md:p-6"
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
      className="flex min-h-svh flex-col bg-background p-4 md:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <ScreenReaderStatus label="Loading account" />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="flex w-full items-center justify-between md:hidden">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <Card className="hidden w-full max-w-sm md:flex">
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
