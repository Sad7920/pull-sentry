import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useUser } from "@clerk/react"

const ReviewCreditsContext = createContext({
  reviewCredits: null,
  setReviewCredits: () => {},
  isSynced: false,
})

export function ReviewCreditsProvider({ children }) {
  const { user } = useUser()
  const [reviewCredits, setReviewCredits] = useState(null)
  const [isSynced, setIsSynced] = useState(false)

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

    fetch("/api/users/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clerkUser),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to sync account")
        }
        return data
      })
      .then((data) => {
        console.log("users.sync", {
          reviewCredits: data.reviewCredits,
          cancelled,
        })
        if (cancelled) {
          return
        }
        if (typeof data.reviewCredits === "number") {
          setReviewCredits(data.reviewCredits)
        }
        setIsSynced(true)
      })
      .catch((error) => {
        console.error("users.sync failed", error)
        if (!cancelled) {
          setIsSynced(true)
        }
      })

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
