import { Link } from "react-router-dom"

export function LegalLayout({ title, updated, children }) {
  return (
    <main className="min-h-svh bg-background px-4 py-10 md:px-6 md:py-16">
      <article className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-medium text-primary">
          <Link to="/" className="hover:underline">
            PullSentry
          </Link>
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <aside className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Placeholder — not a production legal document</p>
          <p className="mt-1 text-muted-foreground">
            PullSentry is a portfolio / demo project. This page is sample copy
            for product design only. It has not been reviewed by a lawyer and
            must be replaced before any real launch.
          </p>
        </aside>
        <div className="mt-10 space-y-10 text-base leading-relaxed text-foreground">
          {children}
        </div>
        <nav className="mt-14 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link className="hover:text-foreground hover:underline" to="/privacy-policy">
            Privacy Policy
          </Link>
          <Link className="hover:text-foreground hover:underline" to="/terms-of-service">
            Terms of Service
          </Link>
          <Link className="hover:text-foreground hover:underline" to="/login">
            Sign in
          </Link>
        </nav>
      </article>
    </main>
  )
}

export function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
