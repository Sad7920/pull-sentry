import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@clerk/react"

import { apiUrl } from "@/lib/api"
import { toastApiError, toastWarning } from "@/lib/app-toast"

const ReviewCreditsContext = createContext({
  reviewCredits: null,
  setReviewCredits: () => {},
  isSynced: false,
})

export function ReviewCreditsProvider({ children }) {
  const { user } = useUser()
  const [reviewCredits, setReviewCredits] = useState(null)
  const [isSynced, setIsSynced] = useState(false)
  const warnedLowCredits = useRef(false)

  useEffect(() => {
    if (reviewCredits === 1 && !warnedLowCredits.current) {
      warnedLowCredits.current = true
      toastWarning("Credits running low", "1 credit left")
    }

    if (typeof reviewCredits === "number" && reviewCredits > 1) {
      warnedLowCredits.current = false
    }
  }, [reviewCredits])

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

    let cancelled = false

    async function syncAccount() {
      try {
        const response = await fetch(apiUrl("/users/sync"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clerkUser),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(data.error ?? "Failed to sync account")
          error.status = response.status
          throw error
        }
        if (cancelled) {
          return
        }
        if (typeof data.reviewCredits === "number") {
          setReviewCredits(data.reviewCredits)
        }
        setIsSynced(true)
      } catch (error) {
        if (!cancelled) {
          toastApiError(error, "Couldn't sync account")
          setIsSynced(true)
        }
      }
    }

    syncAccount()

    return () => {
      cancelled = true
    }
  }, [user])

  const value = useMemo(
    () => ({ reviewCredits, setReviewCredits, isSynced }),
    [reviewCredits, isSynced]
  )

  return (
    <ReviewCreditsContext.Provider value={value}>
      {children}
    </ReviewCreditsContext.Provider>
  )
}

export function useReviewCredits() {
  return useContext(ReviewCreditsContext)
}
