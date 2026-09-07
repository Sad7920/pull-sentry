import { Navigate, Route, Routes } from "react-router-dom"

import { CookieConsent } from "@/components/CookieConsent"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage"
import { RepoDetailPage } from "@/pages/RepoDetailPage"
import { TermsOfServicePage } from "@/pages/TermsOfServicePage"

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login/*" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/repo/:id" element={<RepoDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <CookieConsent />
    </>
  )
}
