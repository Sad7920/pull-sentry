import { useAuth, useUser } from "@clerk/react"
import { Navigate, Outlet } from "react-router-dom"

import { Spinner } from "@/components/ui/spinner"

export function ProtectedRoute() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || !isUserLoaded) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
