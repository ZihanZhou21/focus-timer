'use client'

interface StatsCardProps {
  title: string
  value: string | number
  color?: 'amber' | 'emerald' | 'blue' | 'purple'
  className?: string
}

export default function StatsCard({
  title,
  value,
  color = 'amber',
  className = '',
}: StatsCardProps) {
  const colorClasses = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }

  return (
    <div
      className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm backdrop-blur-xl ${className}`}>
      <div className="text-center">
        <div className={`text-3xl font-light mb-2 ${colorClasses[color]}`}>
          {value}
        </div>
        <div className="text-sm text-[var(--muted-foreground)] font-light">{title}</div>
      </div>
    </div>
  )
}
