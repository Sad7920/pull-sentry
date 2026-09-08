import { useAuth, useUser } from "@clerk/react"
import { LogOutIcon } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { useReviewCredits } from "@/components/ReviewCreditsContext"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initialsFromClerkUser(user) {
  const first = user.firstName?.trim()
  const last = user.lastName?.trim()

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase()
  }

  if (first) {
    return first.slice(0, 2).toUpperCase()
  }

  const fallback =
    user.username ||
    user.primaryEmailAddress?.emailAddress ||
    user.fullName ||
    "?"
  const local = fallback.replace(/@.*/, "")
  const parts = local.split(/[\s._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return local.slice(0, 2).toUpperCase()
}

export function AppNavbar() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const { reviewCredits } = useReviewCredits()
  const navigate = useNavigate()
  const creditsKnown = typeof reviewCredits === "number"
  const creditsLow = creditsKnown && reviewCredits <= 2

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
        <Link
          to="/dashboard"
          className="flex min-w-0 items-center gap-2 text-foreground"
        >
          <img
            src="/logo.svg"
            alt=""
            width={28}
            height={28}
            className="size-7"
          />
          <span className="font-heading truncate text-sm font-semibold tracking-tight">
            PullSentry
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {creditsKnown ? (
            <Badge variant={creditsLow ? "warning" : "success"}>
              {reviewCredits} {reviewCredits === 1 ? "credit" : "credits"} left
            </Badge>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Account menu"
              render={<Button variant="ghost" size="icon" className="rounded-full" />}
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/10 font-medium text-primary">
                  {initialsFromClerkUser(user)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => signOut(() => navigate("/login"))}
                >
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
