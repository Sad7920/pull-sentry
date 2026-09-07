import { Link } from "react-router-dom"

import { LegalLayout, LegalSection } from "@/pages/LegalLayout"

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 7, 2026">
      <LegalSection id="agreement" title="1. Agreement to these terms">
        <p>
          These Terms of Service (“Terms”) are a <strong>placeholder</strong>{" "}
          for the <strong>PullSentry</strong> demo. By accessing or using the
          app, you acknowledge that this is a portfolio project, not a
          commercially offered service, and that these Terms are not a binding
          production contract.
        </p>
      </LegalSection>

      <LegalSection id="the-service" title="2. The service">
        <p>
          PullSentry is a software-as-a-service style demo that can:
        </p>
        <ul>
          <li>Authenticate users (via Clerk) and connect GitHub accounts.</li>
          <li>List and connect repositories you authorize.</li>
          <li>Index source files and store embeddings for retrieval.</li>
          <li>
            Review pull requests using third-party LLM APIs (Groq and Google
            Gemini), which may receive diffs and code excerpts.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Eligibility and accounts">
        <p>
          You must be allowed to use GitHub and to grant the OAuth scopes this
          demo requests. You are responsible for activity under your account
          and for only connecting repositories you have the right to access.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            Connect production systems, secrets, or highly sensitive codebases
            to this demo.
          </li>
          <li>
            Attempt to disrupt, scrape, or abuse the app, APIs, or connected
            third-party services.
          </li>
          <li>
            Use review output as the sole basis for security or compliance
            decisions. LLM findings can be wrong or incomplete.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="third-parties" title="5. Third-party services">
        <p>
          The demo depends on Clerk, GitHub, Neon, Chroma, Groq, Gemini, and
          Sentry. Their terms and privacy policies apply to data they process.
          We are not responsible for outages, retention, or training practices
          of those providers. Details of data flows are described in the{" "}
          <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="6. Your content and our materials">
        <p>
          You retain whatever rights you already have in your repositories. You
          grant this demo a limited permission to fetch, index, and transmit
          code as needed to provide reviews you request. PullSentry branding,
          UI, and demo code remain with their respective owners.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="7. Disclaimer of warranties">
        <p>
          THE DEMO IS PROVIDED “AS IS”, WITHOUT WARRANTIES OF ANY KIND,
          including fitness for a particular purpose, accuracy of AI reviews,
          or uninterrupted availability. Security and style findings are
          experimental.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, the author of this portfolio
          project is not liable for lost data, leaked secrets, incorrect
          reviews, or other damages arising from use of the demo. Do not rely
          on it in production.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="9. Changes and termination">
        <p>
          This demo may change, break, or be taken down at any time without
          notice. Access may be revoked. These placeholder Terms may be
          replaced after legal review before any real launch.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="10. Contact">
        <p>
          Questions about these placeholder Terms can be directed to the
          project maintainer via the PullSentry source repository.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
