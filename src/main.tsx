import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import InspectorApp from './App.tsx'
import { AccessibilityPage } from './pages/AccessibilityPage.tsx'
import { DevelopersPage } from './pages/DevelopersPage.tsx'
import { LegalLayout } from './pages/LegalLayout.tsx'
import { PrivacyPage } from './pages/PrivacyPage.tsx'
import { TermsPage } from './pages/TermsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InspectorApp />} />
        <Route
          path="/terms"
          element={
            <LegalLayout>
              <TermsPage />
            </LegalLayout>
          }
        />
        <Route
          path="/privacy"
          element={
            <LegalLayout>
              <PrivacyPage />
            </LegalLayout>
          }
        />
        <Route
          path="/accessibility"
          element={
            <LegalLayout>
              <AccessibilityPage />
            </LegalLayout>
          }
        />
        <Route
          path="/developers"
          element={
            <LegalLayout>
              <DevelopersPage />
            </LegalLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
