import { useAuth, useUser } from "@clerk/react"
import { Navigate, Outlet } from "react-router-dom"

import { AppNavbar } from "@/components/AppNavbar"
import { AuthGateSkeleton } from "@/components/page-skeletons"
import { ReviewCreditsProvider } from "@/components/ReviewCreditsContext"

export function ProtectedRoute() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const { isLoaded: isUserLoaded } = useUser()

  if (!isAuthLoaded || !isUserLoaded) {
    return <AuthGateSkeleton />
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <ReviewCreditsProvider>
      <div className="min-h-svh bg-background">
        <AppNavbar />
        <Outlet />
      </div>
    </ReviewCreditsProvider>
  )
}
