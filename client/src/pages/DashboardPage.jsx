import { useAuth, useUser } from "@clerk/react"
import { AlertCircleIcon, LogOutIcon, MenuIcon, PlusIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  AvailableReposSkeleton,
  ConnectedReposSkeleton,
} from "@/components/page-skeletons"
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
import { Spinner } from "@/components/ui/spinner"

function formatConnectedDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function DashboardPage() {
  const { getToken, signOut } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()
  const [connectedRepos, setConnectedRepos] = useState([])
  const [availableRepos, setAvailableRepos] = useState([])
  const [browsingMore, setBrowsingMore] = useState(false)
  const [connectingRepoId, setConnectingRepoId] = useState(null)
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false)
  const [hasLoadedAvailableRepos, setHasLoadedAvailableRepos] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectionsError, setConnectionsError] = useState(null)
  const [availableError, setAvailableError] = useState(null)

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
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load connected repositories")
      }
      setConnectedRepos(Array.isArray(data) ? data : [])
      setConnectionsError(null)
    } catch (error) {
      setConnectedRepos([])
      setConnectionsError(error.message)
    } finally {
      setHasLoadedConnections(true)
    }
  }, [authHeaders])

  useEffect(() => {
    if (!user) {
      return
    }

    const clerkUser = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      primaryEmailAddress: user.primaryEmailAddress
        ? { emailAddress: user.primaryEmailAddress.emailAddress }
        : null,
      emailAddresses: user.emailAddresses.map((address) => ({
        emailAddress: address.emailAddress,
      })),
    }

    fetch("/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clerkUser),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to sync account")
        }
      })
      .catch((error) => {
        setConnectionsError(error.message)
      })
      .finally(() => {
        refreshConnectedRepos()
      })
  }, [refreshConnectedRepos, user])

  useEffect(() => {
    if (!showBrowseList) {
      return
    }

    authHeaders()
      .then((headers) => fetch("/api/github/repos", { headers }))
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load GitHub repositories")
        }
        setAvailableRepos(Array.isArray(data) ? data : [])
        setAvailableError(null)
        setHasLoadedAvailableRepos(true)
      })
      .catch((error) => {
        setAvailableRepos([])
        setAvailableError(error.message)
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
        }),
      })

      if (!response.ok) {
        return
      }

      setBrowsingMore(false)
      await refreshConnectedRepos()
    } finally {
      setConnectingRepoId(null)
    }
  }

  function handleSignOut() {
    setMenuOpen(false)
    signOut(() => navigate("/login"))
  }

  return (
    <main className="flex min-h-svh flex-col items-center gap-8 bg-background p-4 md:p-6">
      <header className="relative flex w-full max-w-4xl items-center justify-between md:hidden">
        <div className="min-w-0">
          <p className="font-heading text-base font-medium">PullSentry</p>
          <p className="truncate text-sm text-muted-foreground">
            Welcome, {user.firstName ?? user.username}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </Button>
        {menuOpen ? (
          <div className="absolute top-full right-0 z-20 mt-2 w-44 rounded-xl bg-card p-1 shadow-md ring-1 ring-border">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        ) : null}
      </header>

      <Card className="hidden w-full max-w-sm md:flex">
        <CardHeader>
          <CardTitle>Welcome, {user.firstName ?? user.username}</CardTitle>
          <CardDescription>You are signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      {connectionsError ? (
        <Alert variant="destructive" className="w-full max-w-4xl">
          <AlertCircleIcon />
          <AlertTitle>Could not load repositories</AlertTitle>
          <AlertDescription>{connectionsError}</AlertDescription>
        </Alert>
      ) : null}

      {!hasLoadedConnections ? (
        <ConnectedReposSkeleton />
      ) : hasConnectedRepos && !browsingMore ? (
        <div className="flex w-full max-w-4xl flex-col gap-4">
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
              <Card
                key={repo.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => navigate(`/repo/${repo.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    navigate(`/repo/${repo.id}`)
                  }
                }}
              >
                <CardHeader>
                  <CardTitle className="truncate">{repo.repoName}</CardTitle>
                  <CardDescription>
                    Connected {formatConnectedDate(repo.connectedAt)}
                  </CardDescription>
                  <Badge variant="secondary">{repo.provider}</Badge>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : showBrowseList ? (
        <div className="flex w-full max-w-4xl flex-col gap-3">
          {hasConnectedRepos ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setBrowsingMore(false)}>
                Back to connected
              </Button>
            </div>
          ) : null}
          {!hasLoadedAvailableRepos ? (
            <AvailableReposSkeleton />
          ) : availableError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Could not load GitHub repositories</AlertTitle>
              <AlertDescription>{availableError}</AlertDescription>
            </Alert>
          ) : (
            availableRepos
              .filter(
                (repo) =>
                  !connectedRepos.some(
                    (connected) => connected.externalRepoId === String(repo.id)
                  )
              )
              .map((repo) => {
                const isConnecting = connectingRepoId === repo.id

                return (
                  <Card key={repo.full_name}>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <CardTitle className="truncate">{repo.name}</CardTitle>
                          <Badge variant={repo.private ? "secondary" : "outline"}>
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </div>
                        {repo.description ? (
                          <CardDescription className="truncate">
                            {repo.description}
                          </CardDescription>
                        ) : null}
                      </div>
                      <Button
                        className="self-end sm:self-center"
                        disabled={connectingRepoId !== null}
                        onClick={() => handleConnect(repo)}
                      >
                        {isConnecting ? (
                          <Spinner data-icon="inline-start" />
                        ) : null}
                        {isConnecting ? "Connecting..." : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
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
    </main>
  )
}
