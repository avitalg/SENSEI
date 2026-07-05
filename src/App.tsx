import React, { Suspense, lazy } from 'react'
import { useApp } from './store/AppStore'
import AppShell from './components/layout/AppShell'
import AuthScreens from './pages/auth/AuthScreens'
import ErrorBoundary from './components/shared/ErrorBoundary'

// Route-level code splitting: one chunk per screen.
const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: lazy(() => import('./pages/DashboardPage')),
  patients: lazy(() => import('./pages/PatientsPage')),
  patient: lazy(() => import('./pages/PatientPage')),
  calendar: lazy(() => import('./pages/CalendarPage')),
  sessions: lazy(() => import('./pages/SessionsPage')),
  upload: lazy(() => import('./pages/UploadPage')),
  transcript: lazy(() => import('./pages/TranscriptPage')),
  summary: lazy(() => import('./pages/SummaryPage')),
  timeline: lazy(() => import('./pages/TimelinePage')),
  report: lazy(() => import('./pages/ReportPage')),
  letter: lazy(() => import('./pages/LetterPage')),
  dedup: lazy(() => import('./pages/DedupPage')),
  analytics: lazy(() => import('./pages/AnalyticsPage')),
  tasks: lazy(() => import('./pages/TasksPage')),
  notifications: lazy(() => import('./pages/NotificationsPage')),
  search: lazy(() => import('./pages/SearchPage')),
  documents: lazy(() => import('./pages/DocumentsPage')),
  help: lazy(() => import('./pages/HelpPage')),
  settings: lazy(() => import('./pages/SettingsPage')),
  messages: lazy(() => import('./pages/MessagesPage')),
  resources: lazy(() => import('./pages/ResourcesPage')),
  reports: lazy(() => import('./pages/ReportsPage')),
  outcomes: lazy(() => import('./pages/OutcomesPage')),
}

function PageFallback() {
  return (
    <div aria-hidden="true" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 34, width: 260, borderRadius: 9, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 16, width: 380, borderRadius: 7, marginBottom: 26 }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
    </div>
  )
}

export default function App() {
  const { S, navigate } = useApp()
  if (S.view === 'auth') return <AuthScreens />
  const Page = PAGES[S.route] || PAGES.dashboard
  return (
    <AppShell>
      <ErrorBoundary resetKey={S.route} onReset={() => navigate('dashboard')}>
        <Suspense fallback={<PageFallback />}>
          <Page />
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}
