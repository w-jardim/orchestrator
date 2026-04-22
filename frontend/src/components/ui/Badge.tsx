import type { ReactNode } from 'react'

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'indigo'

const variantClasses: Record<Variant, string> = {
  green: 'bg-green-500/15 text-green-400 ring-green-500/30',
  red: 'bg-red-500/15 text-red-400 ring-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
  blue: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  gray: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/30',
}

interface BadgeProps {
  variant?: Variant
  children: ReactNode
  dot?: boolean
}

export function Badge({ variant = 'gray', children, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${variant === 'green' ? 'bg-green-400' : variant === 'red' ? 'bg-red-400' : variant === 'yellow' ? 'bg-yellow-400' : variant === 'blue' ? 'bg-blue-400' : 'bg-gray-400'}`}
        />
      )}
      {children}
    </span>
  )
}
