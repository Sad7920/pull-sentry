# Contributing to PullSentry

Thanks for being here. PullSentry is an AI-powered review tool for **GitHub** pull requests. Docs fixes, bug reports, small UI tweaks, and larger features are all useful — you don’t need to be an expert on LangGraph to help.

## Getting started

See **[README.md → Getting started](./README.md#getting-started)** for clone, env vars, Prisma, and how to run the client, API, and Chroma.

Short version: `npm install` at the repo root, fill in `client/.env` and `server/.env` from the example files, migrate the database, then `npm run dev`.

To test connecting a repo locally you need **GitHub OAuth working through Clerk** (enable GitHub as an SSO connection in the Clerk dashboard). Production-style setups use your own GitHub OAuth app; Clerk’s development instance can use shared credentials. Without a working GitHub link, the dashboard cannot list or connect repositories.

## How to contribute

1. Check [open issues](https://github.com/Sad7920/pull-sentry/issues). If maintainers add a **good first issue** label, that’s a good place to start. Feel free to ask that a small, well-scoped issue get that label.
2. Comment on the issue you want so work isn’t duplicated.
3. Fork the repo, clone your fork, and create a branch from `master`.
4. Make your change, then open a pull request against this repo.

**Branch names**

- `feature/short-description` — new behavior
- `fix/short-description` — a bug
- `docs/short-description` — README, comments, copy

**Commits**

Keep them small and readable: present tense, one logical change per commit (for example `Add empty state for the Security tab` rather than `stuff`). [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`) are welcome if you already use them; they are **not** required.

Do not commit `.env` files or API keys.

## Code standards

This is an npm workspaces monorepo: **`client/`** (Vite + React) and **`server/`** (Express ESM). GitHub is the only VCS the app talks to.

**Server**

- Routes live in `server/index.js` and stay thin: auth, rate limits, timeouts, then a handler.
- Handlers (`repos.js`, `reviews.js`, `users.js`) parse input and call **`server/services/`**. Shared helpers sit in `server/lib/` (`AppError`, `asyncHandler`, validation, Clerk user lookup).
- GitHub HTTP lives in `github.js`; indexing in `indexer.js`; the LangGraph review pipeline in `review-graph.js`.
- Throw `AppError` with a status and a user-facing message. The API error handler always responds with **`{ "error": string }`**. New routes should do the same — don’t invent a different error JSON shape.
- Prisma schema is `server/prisma/schema.prisma`. Schema changes need a migration under `server/prisma/migrations/`.
- `RepoProvider` is GitHub-only. Don’t add other providers in a PR unless an issue already agreed on the design.

**Client**

- Pages in `client/src/pages/`, feature UI in `client/src/components/`, primitives in `client/src/components/ui/`, helpers in `client/src/lib/` (`authedFetch`, toasts, severity classes).
- Prefer existing **shadcn/ui** pieces (`Button`, `Card`, `Empty`, `Badge`, …) over one-off HTML/CSS when there’s an equivalent.
- Colors should come from the theme tokens (`bg-background`, `text-muted-foreground`, `text-destructive`, …), not one-off hex or `slate-*` unless you’re on a surface that’s already hardcoded (the login brand panel is an exception).
- Talk to the API with `authedFetch` and surface failures with the toast helpers, matching nearby screens (empty / loading / error states).

**Lint**

There is no repo-wide formatter. The client has Oxlint:

```bash
npm run lint -w client
```

Run that before you open a PR that touches `client/`. The server has no lint script today; stay consistent with neighboring files.

## Pull request process

A useful PR description includes:

- **What** changed (files/behavior in plain language)
- **Why** (bug, gap, or issue number)
- **How to test** (commands, screens, or API calls a reviewer can run)

Keep the PR to **one** feature or fix. Don’t mix a review-pipeline change with unrelated dashboard CSS.

Maintainers may ask for edits. That’s normal review, not a rejection. Push more commits to the same branch; don’t open a second PR for the same work unless asked.

## Reporting bugs / suggesting features

**Bugs** — open an issue with:

- What you did (steps)
- What you expected
- What actually happened (UI copy, status code, or stack snippet)
- Environment if it matters (OS, Node version, browser)

**Features** — open an issue and talk it through **before** a large PR. That saves everyone from building something that won’t be merged.

Proposals to add other VCS providers (**GitLab**, **Bitbucket**, etc.) are welcome **as discussion**. They are not supported in the product today. Please don’t open an implementation PR until maintainers agree on scope and design.

## Community

First-time contributors are welcome. Questions are welcome. Typos, clearer empty states, and tighter error messages count. If you’re stuck, ask on the issue or PR — someone will meet you there.
