import { useAuth, useUser } from "@clerk/react"
import { LogOutIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

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
    const headers = await authHeaders()
    const response = await fetch("/api/repos/connected", { headers })
    const data = await response.json()
    setConnectedRepos(Array.isArray(data) ? data : [])
    setHasLoadedConnections(true)
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
      .then(() => refreshConnectedRepos())
      .catch(() => {
        setHasLoadedConnections(true)
      })
  }, [refreshConnectedRepos, user])

  useEffect(() => {
    if (!showBrowseList) {
      return
    }

    authHeaders()
      .then((headers) => fetch("/api/github/repos", { headers }))
      .then((response) => response.json())
      .then((data) => {
        setAvailableRepos(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setAvailableRepos([])
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

  return (
    <main className="flex min-h-svh flex-col items-center gap-8 bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome, {user.firstName ?? user.username}</CardTitle>
          <CardDescription>You are signed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => signOut(() => navigate("/login"))}
          >
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      {hasLoadedConnections && hasConnectedRepos && !browsingMore ? (
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
          <div className="grid gap-4 sm:grid-cols-2">
            {connectedRepos.map((repo) => (
              <Card
                key={repo.id}
                className="cursor-pointer"
                onClick={() => {}}
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
          {availableRepos
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
                <CardHeader className="flex-row items-center gap-3">
                  <CardTitle className="truncate">{repo.name}</CardTitle>
                  <CardDescription className="min-w-0 flex-1 truncate">
                    {repo.description}
                  </CardDescription>
                  <Badge variant={repo.private ? "secondary" : "outline"}>
                    {repo.private ? "Private" : "Public"}
                  </Badge>
                  <Button
                    disabled={isConnecting}
                    onClick={() => handleConnect(repo)}
                  >
                    {isConnecting ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {isConnecting ? "Connecting..." : "Connect"}
                  </Button>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      ) : !signedInWithGithub && hasLoadedConnections && !hasConnectedRepos ? (
        <div className="flex gap-3">
          <Button>Connect GitHub</Button>
          <Button variant="outline">Connect GitLab</Button>
        </div>
      ) : null}
    </main>
  )
}
