import { Link } from "react-router-dom"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <img
          src="/logo.svg"
          alt="PullSentry"
          width={48}
          height={48}
          className="size-12"
        />
        <p className="mt-6 text-sm font-medium tracking-wide text-primary">
          404
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          This page failed review
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Not found — and there&apos;s no pull request that can merge a missing
          URL.
        </p>
        <Link
          to="/dashboard"
          className={cn(buttonVariants({ size: "lg" }), "mt-8")}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
