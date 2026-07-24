'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'focus-timer-theme'

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

export default function ThemeToggle() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTheme(getInitialTheme())
  }, [])

  const isDark = theme === 'dark'
  const isDashboard = pathname === '/'
  const isFocus = pathname === '/focus'

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const nextTheme = isDark ? 'light' : 'dark'
        applyTheme(nextTheme)
        setTheme(nextTheme)
      }}
      className={`fixed right-4 z-50 grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
        isDashboard
          ? 'top-2.5 sm:top-3.5'
          : isFocus
          ? 'top-3.5 sm:right-6 sm:top-4'
          : 'bottom-4'
      }`}
      suppressHydrationWarning>
      {mounted && isDark ? (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m15.36-6.36-1.77 1.77M7.41 16.59l-1.77 1.77m12.72 0-1.77-1.77M7.41 7.41 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M21 13.2A7.5 7.5 0 0 1 10.8 3a7.5 7.5 0 1 0 10.2 10.2Z"
          />
        </svg>
      )}
    </button>
  )
}
