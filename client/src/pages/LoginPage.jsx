import { SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-lg bg-primary font-heading text-lg font-medium text-primary-foreground"
          >
            PS
          </div>
          <CardTitle>Pull Sentry</CardTitle>
          <CardDescription>
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            withSignUp
            fallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            appearance={{
              options: {
                socialButtonsVariant: "blockButton",
                socialButtonsPlacement: "top",
              },
            }}
          />
        </CardContent>
      </Card>
    </main>
  )
}
