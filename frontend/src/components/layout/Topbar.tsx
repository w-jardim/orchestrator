import { useNavigate } from 'react-router-dom'
import type { User } from '../../types/auth'
import { Button } from '../ui/Button'

interface TopbarProps {
  title: string
  user: User | null
  onLogout: () => void
  action?: React.ReactNode
}

export function Topbar({ title, user, onLogout, action }: TopbarProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/70 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Painel</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-100">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {action}
        {user && (
          <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-2">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-300">{user.name}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{user.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
