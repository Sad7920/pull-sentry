import { SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"

const clerkAppearance = {
  variables: {
    colorPrimary: "#4F46E5",
  },
  options: {
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "top",
    logoImageUrl: "/logo.svg",
  },
}

function SignInSkeleton() {
  return (
    <div
      className="w-full max-w-100 space-y-5 rounded-xl bg-card p-8 ring-1 ring-border"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading sign in</span>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-px flex-1" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="mx-auto h-4 w-44" />
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative overflow-hidden bg-slate-950 px-6 py-8 text-slate-50 sm:px-10 md:flex md:min-h-svh md:flex-col md:justify-between md:px-12 md:py-16 lg:px-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(79,70,229,0.32),transparent_55%)]"
      />
      <div className="relative mx-auto w-full max-w-md text-center md:mx-0 md:max-w-lg md:text-left">
        <div className="flex items-center justify-center gap-3 md:justify-start">
          <img src="/logo.svg" alt="" width={40} height={40} className="size-10" />
          <p className="font-heading text-xl font-semibold tracking-tight text-white">
            PullSentry
          </p>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl md:mt-12 md:text-4xl md:leading-tight">
          Catch risky PRs before they land.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base md:mt-4">
          AI-powered PR reviews, grounded in your codebase. Security and style
          findings with the context of the repo you actually ship.
        </p>
      </div>

      <figure className="relative mx-auto mt-8 hidden w-full max-w-md text-left md:mt-12 md:block md:max-w-lg">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl ring-1 ring-indigo-600/20">
          <figcaption className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 font-mono text-xs text-slate-500">
            <span className="size-2 rounded-full bg-indigo-600" />
            pr-184.diff · review
          </figcaption>
          <div className="space-y-2 overflow-x-auto p-4 font-mono text-[13px] leading-6">
            <p>
              <span className="text-emerald-400">+</span>
              <span className="text-slate-300"> const rows = db.query(input)</span>
            </p>
            <p className="rounded-md bg-red-500/10 px-2 py-1 text-red-400">
              HIGH  unsanitized query in users.ts
            </p>
            <p className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-400">
              MED   unused import in review.ts
            </p>
            <p className="text-slate-500">✓ grounded · 12 files indexed</p>
          </div>
        </div>
      </figure>
    </aside>
  )
}

export function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="grid min-h-svh md:grid-cols-2">
      <BrandPanel />
      <section className="flex items-center justify-center bg-background px-6 py-10 lg:px-12">
        {!isLoaded ? (
          <SignInSkeleton />
        ) : (
          <SignIn
            routing="path"
            path="/login"
            withSignUp
            fallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
            fallback={<SignInSkeleton />}
            appearance={clerkAppearance}
          />
        )}
      </section>
    </main>
  )
}
