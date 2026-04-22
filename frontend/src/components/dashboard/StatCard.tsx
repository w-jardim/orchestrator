import type { ReactNode } from 'react'
import { Card } from '../ui/Card'

interface StatCardProps {
  label: string
  value: string
  helper: string
  icon: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

const toneClasses = {
  default: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300',
  success: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300',
  warning: 'border-amber-400/20 bg-amber-400/5 text-amber-300',
  danger: 'border-rose-400/20 bg-rose-400/5 text-rose-300',
}

export function StatCard({ label, value, helper, icon, tone = 'default' }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-slate-800/80 bg-slate-900/70">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-4 truncate text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 break-words text-sm text-slate-400">{helper}</p>
        </div>
        <div className={`shrink-0 rounded-2xl border p-3 ${toneClasses[tone]}`}>{icon}</div>
      </div>
    </Card>
  )
}
