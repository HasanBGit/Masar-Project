import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { LanguageProvider } from './lib/i18n'
import { ToastProvider } from './components/ui/Toast'
import { LoginPage } from './features/auth/LoginPage'
import { LandingPage } from './features/landing/LandingPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { NewProjectForm } from './components/NewProjectForm'
import { DashboardPage } from './features/owner-dashboard/DashboardPage'
import { DecisionDetailPage } from './features/approvals-workflow/DecisionDetailPage'
import { TrustEvidencePage } from './features/trust-evidence/TrustEvidencePage'
import { ContractPaymentsPage } from './features/contract-payments/ContractPaymentsPage'
import { EmailIntegrationsPage } from './features/email-integrations/EmailIntegrationsPage'
import { RfiChangeControlPage } from './features/rfi-change-control/RfiChangeControlPage'
import { HandoverPage } from './features/handover-closeout/HandoverPage'
import { AccessControlPage } from './features/access-control-admin/AccessControlPage'
import { ObservabilityPage } from './features/observability/ObservabilityPage'
import { PlatformApiPage } from './features/platform-api/PlatformApiPage'
import { GettingStartedPage } from './features/docs/pages/GettingStarted'
import { ConceptsPage } from './features/docs/pages/Concepts'
import { ModulesPage } from './features/docs/pages/Modules'
import { ApiReferencePage } from './features/docs/pages/ApiReference'
import { WebhooksPage } from './features/docs/pages/Webhooks'
import { ErrorBoundary } from './components/ErrorBoundary'
import type { Project } from './lib/types'

// Lazy-loaded: pulls in three.js, which is otherwise dead weight on every
// other page's initial bundle.
const DrawingsStudioPage = lazy(() =>
  import('./features/drawings-studio/DrawingsStudioPage').then((m) => ({ default: m.DrawingsStudioPage })),
)

function Workspace() {
  const { projects, me } = useAuth()
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  // Auto-select the first project, and re-validate the selection whenever the
  // membership list changes so a removed project doesn't stay active.
  useEffect(() => {
    if (activeProject && !projects.some((p) => p.id === activeProject.id)) {
      setActiveProject(projects[0] ?? null)
      return
    }
    if (!activeProject && projects.length > 0) {
      setActiveProject(projects[0])
    }
  }, [projects, activeProject])

  if (!activeProject) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-cream text-navy/60">
        <p>No project memberships found for this account.</p>
        <NewProjectForm onCreated={setActiveProject} />
      </div>
    )
  }

  return (
    <AppLayout activeProject={activeProject} onProjectChange={setActiveProject} showObservability={!!me?.is_staff}>
      <ErrorBoundary fallbackTitle="Application Error">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage project={activeProject} />} />
          <Route path="/email-integrations" element={<EmailIntegrationsPage project={activeProject} />} />
          <Route path="/decisions/:id" element={<DecisionDetailPage />} />
          <Route path="/trust-evidence" element={<TrustEvidencePage project={activeProject} />} />
          <Route path="/contract-payments" element={<ContractPaymentsPage project={activeProject} />} />
          <Route path="/rfi-change-control" element={<RfiChangeControlPage project={activeProject} />} />
          <Route path="/handover" element={<HandoverPage project={activeProject} />} />
          <Route
            path="/drawings-studio"
            element={
              <ErrorBoundary fallbackTitle="3D Drawings Studio Error">
                <Suspense fallback={<div className="p-6 text-sm text-navy/50">Loading 3D Studio...</div>}>
                  <DrawingsStudioPage project={activeProject} />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="/access-control" element={<AccessControlPage project={activeProject} />} />
          <Route path="/platform-api" element={<PlatformApiPage project={activeProject} />} />
          {me?.is_staff && <Route path="/observability" element={<ObservabilityPage />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </AppLayout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProviders>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Documentation is public - no login required, matching how real
              developer docs work - even though it also links back into the
              authenticated app. */}
          <Route path="/docs" element={<GettingStartedPage />} />
          <Route path="/docs/concepts" element={<ConceptsPage />} />
          <Route path="/docs/modules" element={<ModulesPage />} />
          <Route path="/docs/api" element={<ApiReferencePage />} />
          <Route path="/docs/webhooks" element={<WebhooksPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppProviders>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Language needs the profile (preferred_language) so it sits inside AuthProvider.
function AppProviders({ children }: { children: ReactNode }) {
  const { me } = useAuth()
  return (
    <LanguageProvider initialLang={me?.preferred_language ?? null}>
      <ToastProvider>{children}</ToastProvider>
    </LanguageProvider>
  )
}

export default App
