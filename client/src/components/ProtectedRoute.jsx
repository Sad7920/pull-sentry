import { useAuth, useUser } from "@clerk/react"
import { Navigate, Outlet } from "react-router-dom"

import { AuthGateSkeleton } from "@/components/page-skeletons"

export function ProtectedRoute() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || !isUserLoaded) {
    return <AuthGateSkeleton />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
