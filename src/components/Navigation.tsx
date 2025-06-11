'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '首页', icon: '🏠' },
    { href: '/timer', label: '专注', icon: '⏰' },
    { href: '/stats', label: '统计', icon: '📊' },
    { href: '/calendar', label: '日历', icon: '📅' },
    { href: '/settings', label: '设置', icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-stone-200/50 dark:border-slate-700/50 z-50">
      <div className="flex justify-around items-center px-4 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800/50'
              }`}>
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-light">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
