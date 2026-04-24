import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { useAuth } from './hooks/useAuth'
import { ContainersPage } from './pages/ContainersPage'
import { DeploysPage } from './pages/DeploysPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { HealthPage } from './pages/HealthPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { UsersPage } from './pages/UsersPage'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Visão Geral Operacional',
  '/containers': 'Containers',
  '/deploys': 'Deploys',
  '/health': 'Saúde',
  '/projects': 'Projetos',
  '/users': 'Usuários',
}

function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Plagard Orchestrator'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            user={user}
            onLogout={logout}
            action={
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Cluster online
              </div>
            }
          />
          <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/deploys" element={<DeploysPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
