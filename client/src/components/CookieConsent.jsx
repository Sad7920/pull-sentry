import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const STORAGE_KEY = "pullsentry.cookie-consent.v2"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setVisible(!stored)
    } catch {
      setVisible(true)
    }
  }, [])

  function saveConsent(status) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status, savedAt: new Date().toISOString() })
      )
    } catch {
      // Ignore quota / private-mode failures; hide the banner anyway.
    }
    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center p-4">
      <Card
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        className="pointer-events-auto w-full max-w-lg shadow-lg"
      >
        <CardHeader className="pb-2">
          <CardTitle id="cookie-consent-title">Cookies</CardTitle>
          <CardDescription id="cookie-consent-description">
            We use essential cookies and local storage for sign-in and to
            remember this choice. See our{" "}
            <Link
              to="/privacy-policy"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            for how this demo handles auth, repo metadata, and code sent to LLM
            providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => saveConsent("declined")}>
            Decline
          </Button>
          <Button onClick={() => saveConsent("accepted")}>Accept</Button>
        </CardContent>
      </Card>
    </div>
  )
}
