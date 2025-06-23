'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavigationProps {
  className?: string
}

export default function AppNavigation({ className = '' }: NavigationProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', key: 'dashboard' },
    { href: '/focus', label: 'Focus', key: 'focus' },
    { href: '/calendar', label: 'History', key: 'history' },
  ]

  return (
    <nav className={`bg-slate-800 rounded-2xl p-1.5 ${className}`}>
      <div className="flex space-x-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`px-6 py-2.5 rounded-xl transition-colors text-base font-medium ${
                isActive
                  ? 'text-white bg-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
