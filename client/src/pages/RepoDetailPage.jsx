import { useAuth } from "@clerk/react"
import { ArrowLeftIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { PageEmptyState } from "@/components/PageEmptyState"
import { PullRequestsTab } from "@/components/PullRequestsTab"
import { RepoDetailPageSkeleton } from "@/components/page-skeletons"
import { SecurityTab } from "@/components/SecurityTab"
import { SettingsTab } from "@/components/SettingsTab"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authedFetch } from "@/lib/api"
import { toastApiError } from "@/lib/app-toast"

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

    async function loadRepo() {
      try {
        const data = await authedFetch(getToken, `/repos/${id}`, {
          fallback: "Repo not found",
        })
        if (!cancelled) {
          setRepo(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          toastApiError(err, "Could not load repository")
          setError(err.message)
        }
      }
    }

    loadRepo()

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
        <PageEmptyState
          icon="repo"
          title="Couldn't load repository"
          description={error}
        />
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
                className="absolute top-0.5 right-1 size-1.5 rounded-full bg-warning"
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
