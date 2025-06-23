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
      className={`bg-slate-800 rounded-3xl p-6 border border-slate-700/50 ${className}`}>
      <div className="text-center">
        <div className={`text-3xl font-light mb-2 ${colorClasses[color]}`}>
          {value}
        </div>
        <div className="text-sm text-slate-400 font-light">{title}</div>
      </div>
    </div>
  )
}
