import { useAuth, useUser } from "@clerk/react"
import { LogOutIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DashboardPage() {
  const { signOut } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
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
    </main>
  )
}
