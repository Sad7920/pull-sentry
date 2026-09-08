import { useAuth, useUser } from "@clerk/react"
import { EllipsisVerticalIcon, FolderGit2Icon, PlusIcon, StarIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  AvailableReposSkeleton,
  ConnectedReposSkeleton,
} from "@/components/page-skeletons"
import { useReviewCredits } from "@/components/ReviewCreditsContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  formatStarCount,
  formatUpdatedAgo,
  languageColor,
} from "@/lib/github-repo-meta"
import {
  apiErrorFromResponse,
  toastApiError,
  toastSuccess,
} from "@/lib/app-toast"
import { cn } from "@/lib/utils"

function formatConnectedDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function LanguageDot({ language }) {
  const color = languageColor(language)

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", !color && "bg-muted-foreground")}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="truncate">{language}</span>
    </span>
  )
}

function stopCardNavigation(event) {
  event.stopPropagation()
}

function severityDotClass(severity) {
  if (severity === "high") {
    return "bg-destructive"
  }
  if (severity === "low") {
    return "bg-emerald-500"
  }
  return "bg-amber-500"
}

function openPrLabel(count) {
  if (typeof count !== "number") {
    return "PR count unavailable"
  }
  if (count === 1) {
    return "1 open PR"
  }
  return `${count} open PRs`
}

function ConnectedRepoCard({ repo, onOpen, onDisconnect }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-shadow hover:shadow-md hover:ring-primary/30"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <CardHeader className="gap-2">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-start gap-2">
            <FolderGit2Icon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <CardTitle className="truncate font-semibold">{repo.repoName}</CardTitle>
          </div>
          <p className="text-sm text-foreground/80">{openPrLabel(repo.openPrCount)}</p>
          {repo.hasReviews ? (
            <p className="flex items-center gap-1.5 text-sm text-foreground/80">
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${severityDotClass(repo.highestSeverity)}`}
              />
              {repo.findingCount === 1
                ? "1 issue flagged"
                : `${repo.findingCount} issues flagged`}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          )}
          <CardDescription className="text-xs">
            Connected {formatConnectedDate(repo.connectedAt)}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{repo.provider}</Badge>
            <Badge variant={repo.isPrivate ? "secondary" : "outline"}>
              {repo.isPrivate ? "Private" : "Public"}
            </Badge>
          </div>
        </div>
        <CardAction
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
          onKeyDown={stopCardNavigation}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${repo.repoName}`}
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-40"
              onClick={stopCardNavigation}
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDisconnect(repo)}
                >
                  Disconnect repo
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

function AvailableRepoCard({ repo, isConnecting, connectingBusy, onConnect }) {
  const updated = formatUpdatedAgo(repo.updated_at)

  return (
    <Card
      size="sm"
      className="transition-shadow hover:shadow-md hover:ring-primary/30"
    >
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <FolderGit2Icon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <CardTitle className="truncate text-sm font-semibold">
                {repo.name}
              </CardTitle>
              {repo.language ? <LanguageDot language={repo.language} /> : null}
              <Badge variant={repo.private ? "secondary" : "outline"}>
                {repo.private ? "Private" : "Public"}
              </Badge>
            </div>
            <div className="mt-1 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              {repo.description ? (
                <CardDescription className="min-w-0 flex-1 truncate text-xs">
                  {repo.description}
                </CardDescription>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <StarIcon aria-hidden="true" className="size-3.5" />
                  <span>{formatStarCount(repo.stargazers_count)}</span>
                </span>
                {updated ? <span>{updated}</span> : null}
              </div>
            </div>
          </div>
        </div>
        <Button
          className="self-end sm:self-center"
          disabled={connectingBusy}
          onClick={() => onConnect(repo)}
        >
          {isConnecting ? <Spinner data-icon="inline-start" /> : null}
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { isSynced } = useReviewCredits()
  const navigate = useNavigate()
  const [connectedRepos, setConnectedRepos] = useState([])
  const [availableRepos, setAvailableRepos] = useState([])
  const [browsingMore, setBrowsingMore] = useState(false)
  const [connectingRepoId, setConnectingRepoId] = useState(null)
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false)
  const [hasLoadedAvailableRepos, setHasLoadedAvailableRepos] = useState(false)
  const [disconnectRepo, setDisconnectRepo] = useState(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const signedInWithGithub = user.externalAccounts.some(
    (account) => account.provider === "github"
  )
  const hasConnectedRepos = connectedRepos.length > 0
  const showBrowseList =
    signedInWithGithub && (!hasConnectedRepos || browsingMore)

  const authHeaders = useCallback(async () => {
    const token = await getToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }, [getToken])

  const refreshConnectedRepos = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const response = await fetch("/api/repos/connected", { headers })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(data.error ?? "Failed to load connected repositories")
        error.status = response.status
        throw error
      }
      setConnectedRepos(Array.isArray(data) ? data : [])
    } catch (error) {
      setConnectedRepos([])
      toastApiError(error, "Could not load repositories")
    } finally {
      setHasLoadedConnections(true)
    }
  }, [authHeaders])

  useEffect(() => {
    if (!isSynced) {
      return
    }

    refreshConnectedRepos()
  }, [isSynced, refreshConnectedRepos])

  useEffect(() => {
    if (!showBrowseList) {
      return
    }

    authHeaders()
      .then((headers) => fetch("/api/github/repos", { headers }))
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(data.error ?? "Failed to load GitHub repositories")
          error.status = response.status
          throw error
        }
        setAvailableRepos(Array.isArray(data) ? data : [])
        setHasLoadedAvailableRepos(true)
      })
      .catch((error) => {
        setAvailableRepos([])
        toastApiError(error, "Could not load GitHub repositories")
        setHasLoadedAvailableRepos(true)
      })
  }, [authHeaders, showBrowseList])

  async function handleConnect(repo) {
    setConnectingRepoId(repo.id)
    try {
      const headers = await authHeaders()
      const response = await fetch("/api/repos/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider: "github",
          repoName: repo.full_name,
          repoUrl: repo.html_url,
          externalRepoId: String(repo.id),
          isPrivate: Boolean(repo.private),
        }),
      })
      if (!response.ok) {
        throw await apiErrorFromResponse(response, "Failed to connect repository")
      }

      toastSuccess("Repository connected", repo.full_name)
      setBrowsingMore(false)
      await refreshConnectedRepos()
    } catch (error) {
      toastApiError(error, "Could not connect repository")
    } finally {
      setConnectingRepoId(null)
    }
  }

  async function handleConfirmDisconnect() {
    if (!disconnectRepo) {
      return
    }

    setDisconnecting(true)
    try {
      const headers = await authHeaders()
      const response = await fetch(`/api/repos/${disconnectRepo.id}`, {
        method: "DELETE",
        headers,
      })
      if (!response.ok) {
        throw await apiErrorFromResponse(
          response,
          "Failed to disconnect repository"
        )
      }

      toastSuccess("Repository disconnected", disconnectRepo.repoName)
      setDisconnectRepo(null)
      await refreshConnectedRepos()
    } catch (error) {
      toastApiError(error, "Could not disconnect repository")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 p-4 md:p-6">
      {!hasLoadedConnections ? (
        <ConnectedReposSkeleton />
      ) : hasConnectedRepos && !browsingMore ? (
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-medium">
              Connected repos
            </h2>
            {signedInWithGithub ? (
              <Button variant="outline" onClick={() => setBrowsingMore(true)}>
                <PlusIcon data-icon="inline-start" />
                Add repo
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {connectedRepos.map((repo) => (
              <ConnectedRepoCard
                key={repo.id}
                repo={repo}
                onOpen={() => navigate(`/repo/${repo.id}`)}
                onDisconnect={(next) => setDisconnectRepo(next)}
              />
            ))}
          </div>
        </div>
      ) : showBrowseList ? (
        <div className="flex w-full flex-col gap-3">
          {hasConnectedRepos ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setBrowsingMore(false)}>
                Back to connected
              </Button>
            </div>
          ) : null}
          {!hasLoadedAvailableRepos ? (
            <AvailableReposSkeleton />
          ) : (
            availableRepos
              .filter(
                (repo) =>
                  !connectedRepos.some(
                    (connected) =>
                      connected.externalRepoId === String(repo.id)
                  )
              )
              .map((repo) => {
                const isConnecting = connectingRepoId === repo.id

                return (
                  <AvailableRepoCard
                    key={repo.full_name}
                    repo={repo}
                    isConnecting={isConnecting}
                    connectingBusy={connectingRepoId !== null}
                    onConnect={handleConnect}
                  />
                )
              })
          )}
        </div>
      ) : !signedInWithGithub && !hasConnectedRepos ? (
        <div className="flex gap-3">
          <Button>Connect GitHub</Button>
          <Button variant="outline">Connect GitLab</Button>
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(disconnectRepo)}
        onOpenChange={(open) => {
          if (!open && !disconnecting) {
            setDisconnectRepo(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect repository?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectRepo
                ? `Disconnect ${disconnectRepo.repoName} from PullSentry? Reviews for this repo will be removed. You can connect it again later.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={disconnecting}
              onClick={() => setDisconnectRepo(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnecting}
              onClick={handleConfirmDisconnect}
            >
              {disconnecting ? <Spinner data-icon="inline-start" /> : null}
              {disconnecting ? "Disconnecting..." : "Disconnect repo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
