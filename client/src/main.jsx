import { ClerkProvider } from "@clerk/react"
import { ui } from "@clerk/ui"
import { shadcn } from "@clerk/ui/themes"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import App from "./App.jsx"
import "./index.css"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY")
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      ui={ui}
      appearance={{
        theme: shadcn,
        options: {
          // Dashboard Legal URLs are for the hosted Account Portal; the
          // embedded SignIn card only shows Help/Privacy/Terms from here.
          termsPageUrl: "/terms-of-service",
          privacyPageUrl: "/privacy-policy",
        },
        elements: {
          socialButtonsBlockButton__gitlab: { display: "none" },
          socialButtonsIconButton__gitlab: { display: "none" },
          socialButtonsProviderIcon__gitlab: { display: "none" },
          providerIcon__gitlab: { display: "none" },
          alternativeMethodsBlockButton__gitlab: { display: "none" },
        },
      }}
      signInUrl="/login"
      signUpUrl="/login"
      afterSignOutUrl="/login"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
)
