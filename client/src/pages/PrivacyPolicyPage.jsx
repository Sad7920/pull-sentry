import { Link } from "react-router-dom"

import { LegalLayout, LegalSection } from "@/pages/LegalLayout"

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 7, 2026">
      <LegalSection id="overview" title="1. Overview">
        <p>
          This Privacy Policy describes how <strong>PullSentry</strong>{" "}
          (“we”, “us”) may collect, use, and share information when you use
          this demo application. PullSentry is an AI-assisted pull request
          review tool that can connect to GitHub repositories and send code
          context to third-party large language model (LLM) APIs.
        </p>
      </LegalSection>

      <LegalSection id="data-collected" title="2. Information we collect">
        <p>Depending on how you use the demo, we may process:</p>
        <ul>
          <li>
            <strong>Account and authentication data</strong> — identifiers from
            our auth provider (Clerk), such as user ID, name, email address,
            profile image, and linked OAuth accounts (for example GitHub).
          </li>
          <li>
            <strong>Repository metadata</strong> — repository name, URL,
            visibility (public/private), provider, connection timestamps, and
            pull request metadata (number, title, author, state, dates).
          </li>
          <li>
            <strong>Code and review content</strong> — diffs, file paths, and
            source snippets retrieved from connected repos so reviews can be
            grounded in your codebase. Review findings we generate (severity,
            descriptions, confidence) may be stored so you can view them later.
          </li>
          <li>
            <strong>Usage and technical data</strong> — basic request logs,
            error reports (including via Sentry), and cookie / localStorage
            preferences such as cookie consent.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-used" title="3. How we use information">
        <p>We use this information to:</p>
        <ul>
          <li>Sign you in and keep your session secure.</li>
          <li>List, connect, and index repositories you choose.</li>
          <li>
            Run security and style reviews on pull requests, including sending
            relevant code snippets to LLM providers.
          </li>
          <li>Store review results and diagnose errors in this demo.</li>
        </ul>
      </LegalSection>

      <LegalSection id="processors" title="4. Third-party processors">
        <p>
          This demo relies on third parties that process data on our behalf or
          when you connect an account. They have their own privacy policies:
        </p>
        <ul>
          <li>
            <strong>Clerk</strong> — authentication and user identity.
          </li>
          <li>
            <strong>GitHub</strong> — OAuth access to repositories, pull
            requests, and file contents you authorize.
          </li>
          <li>
            <strong>Neon</strong> — hosted Postgres for accounts, connected
            repos, and stored review findings.
          </li>
          <li>
            <strong>Chroma</strong> — local/demo vector storage for indexed
            source files used as review context.
          </li>
          <li>
            <strong>Groq</strong> and <strong>Google Gemini</strong> — LLM APIs
            that receive prompts which may include pull request diffs, file
            excerpts, and related metadata in order to produce review findings.
            Do not connect sensitive production repositories to this demo.
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring, which may include
            request context and stack traces.
          </li>
        </ul>
        <p>
          Code snippets sent to Groq or Gemini are processed under those
          providers’ terms. We do not control how long they retain API inputs.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies and local storage">
        <p>
          We use essential cookies and local storage for authentication (Clerk)
          and to remember your cookie preference. See the cookie banner on first
          visit. You can read more in this policy and in our{" "}
          <Link to="/terms-of-service">Terms of Service</Link>.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. Retention">
        <p>
          Demo data may be deleted at any time, including when the project is
          reset or the database is replaced. Do not treat stored reviews or
          embeddings as a durable archive.
        </p>
      </LegalSection>

      <LegalSection id="your-choices" title="7. Your choices">
        <p>
          You can disconnect repositories (where the product allows), sign out,
          and revoke GitHub OAuth access from your GitHub account settings.
          Because this is a demo, there is no formal data-subject request
          process yet.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="8. Contact">
        <p>
          For questions about this placeholder policy, contact the project
          maintainer through the GitHub repository associated with PullSentry.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
