import { useAuth, useUser } from "@clerk/react"
import { LogOutIcon } from "lucide-react"
import { useEffect, useState } from "react"
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

export function DashboardPage() {
  const { getToken, signOut } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()
  const [connectedRepoCount, setConnectedRepoCount] = useState(null)
  const [repos, setRepos] = useState([])

  const signedInWithGithub = user.externalAccounts.some(
    (account) => account.provider === "github"
  )

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
      .then((response) => response.json())
      .then((data) => {
        setConnectedRepoCount(data.connectedRepoCount ?? 0)
      })
      .catch(() => {
        setConnectedRepoCount(0)
      })
  }, [user])

  useEffect(() => {
    if (!signedInWithGithub || connectedRepoCount !== 0) {
      return
    }

    getToken()
      .then((token) =>
        fetch("/api/github/repos", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((response) => response.json())
      .then((data) => {
        setRepos(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setRepos([])
      })
  }, [connectedRepoCount, getToken, signedInWithGithub])

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

      {signedInWithGithub && connectedRepoCount === 0 ? (
        <div className="flex w-full max-w-4xl flex-col gap-3">
          {repos.map((repo) => (
            <Card key={repo.full_name}>
              <CardHeader className="flex-row items-center gap-3">
                <CardTitle className="truncate">{repo.name}</CardTitle>
                <CardDescription className="min-w-0 flex-1 truncate">
                  {repo.description}
                </CardDescription>
                <Badge variant={repo.private ? "secondary" : "outline"}>
                  {repo.private ? "Private" : "Public"}
                </Badge>
                <Button>Connect</Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : !signedInWithGithub ? (
        <div className="flex gap-3">
          <Button>Connect GitHub</Button>
          <Button variant="outline">Connect GitLab</Button>
        </div>
      ) : null}
    </main>
  )
}
