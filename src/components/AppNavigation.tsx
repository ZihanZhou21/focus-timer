'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'

interface NavigationProps {
  className?: string
  variant?: 'default' | 'dashboard' | 'focus'
}

function NavigationIcon({ name }: { name: 'dashboard' | 'focus' | 'history' }) {
  if (name === 'dashboard') {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true">
        <path
          d="M4 10.5 12 4l8 6.5V20H4v-9.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M9.5 20v-5h5v5" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'focus') {
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.5" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
      <path
        d="M12 7.5V12l3 2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default function AppNavigation({
  className = '',
  variant = 'default',
}: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const timerState = useSelector((state: RootState) => state.timer)

  // 检查是否有正在运行或暂停的计时器
  const checkActiveTimer = () => {
    // 首先检查Redux状态
    if (
      timerState.taskId &&
      (timerState.isRunning || timerState.timeRemaining > 0)
    ) {
      return timerState
    }

    // 如果Redux没有状态，检查localStorage作为fallback
    if (typeof window === 'undefined') return null

    try {
      // 检查所有可能的计时器存储键
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith('focus-timer-')
      )

      for (const key of keys) {
        const savedState = localStorage.getItem(key)
        if (savedState) {
          const state = JSON.parse(savedState)

          // 检查计时器是否已过期（只针对正在运行的计时器）
          if (state.isRunning) {
            const timeDiff = Math.floor(
              (Date.now() - state.lastUpdateTime) / 1000
            )
            const newTimeRemaining = Math.max(0, state.timeRemaining - timeDiff)

            if (newTimeRemaining > 0) {
              return { ...state, timeRemaining: newTimeRemaining }
            }
          } else if (state.timeRemaining > 0) {
            // 如果是暂停状态且还有剩余时间，也返回该状态
            return state
          }
        }
      }
    } catch (error) {
      console.error('检查活跃计时器失败:', error)
    }

    return null
  }

  // 处理focus导航点击
  const handleFocusClick = (e: React.MouseEvent) => {
    e.preventDefault()

    const activeTimer = checkActiveTimer()

    if (activeTimer && activeTimer.taskId) {
      if (activeTimer.isRunning) {
        // 如果有正在运行的任务计时器，跳转到该任务
        // 对于Redux状态，直接使用当前值
        const currentRemaining = activeTimer.timeRemaining
        const currentElapsed = activeTimer.totalElapsed

        const params = new URLSearchParams({
          id: activeTimer.taskId,
          remaining: Math.round(currentRemaining / 60).toString(), // 转换为分钟
          elapsed: Math.round(currentElapsed / 60).toString(), // 转换为分钟
        })
        router.push(`/focus?${params.toString()}`)
      } else {
        // 如果是暂停状态的任务，使用与TaskDetailCard开始按钮相同的逻辑
        const params = new URLSearchParams({
          id: activeTimer.taskId,
          remaining: Math.round(activeTimer.timeRemaining / 60).toString(), // 转换为分钟
          elapsed: Math.round(activeTimer.totalElapsed / 60).toString(), // 转换为分钟
        })
        router.push(`/focus?${params.toString()}`)
      }
    } else {
      // 没有活跃计时器，跳转到默认focus页面
      router.push('/focus')
    }
  }

  const navItems = [
    { href: '/', label: 'Dashboard', key: 'dashboard' },
    { href: '/focus', label: 'Focus', key: 'focus', onClick: handleFocusClick },
    { href: '/calendar', label: 'History', key: 'history' },
  ]
  const isDashboardVariant = variant === 'dashboard'
  const isFocusVariant = variant === 'focus'

  const getItemClassName = (isActive: boolean) => {
    if (isFocusVariant) {
      return `relative flex min-h-11 items-center justify-center px-3 text-sm font-medium transition-colors after:absolute after:inset-x-2 after:-bottom-0.5 after:h-0.5 after:rounded-full after:transition-opacity sm:px-4 sm:text-[15px] ${
        isActive
          ? 'text-[var(--accent)] after:bg-[var(--accent)] after:opacity-100'
          : 'text-[var(--muted-foreground)] after:opacity-0 hover:text-[var(--foreground)]'
      }`
    }

    if (!isDashboardVariant) {
      return `rounded-xl px-6 py-2.5 text-base font-medium transition-colors ${
        isActive
          ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--border)]'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
      }`
    }

    return `relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border-b-2 px-3 py-2 text-xs font-medium transition-colors lg:min-h-0 lg:flex-row lg:rounded-none lg:px-1 lg:py-[1.35rem] lg:text-sm ${
      isActive
        ? 'border-transparent bg-[var(--accent-soft)] text-[var(--accent)] lg:border-[var(--accent)] lg:bg-transparent'
        : 'border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hover:bg-transparent'
    }`
  }

  return (
    <nav
      className={`${
        isDashboardVariant
          ? 'fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-1.5 shadow-[0_12px_36px_rgba(15,23,42,0.12)] lg:static lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none'
          : isFocusVariant
          ? 'w-full sm:w-auto'
          : 'rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm backdrop-blur-xl'
      } ${className}`}>
      <div
        className={
          isDashboardVariant
            ? 'grid grid-cols-3 gap-1 lg:flex lg:items-center lg:gap-8'
            : isFocusVariant
            ? 'grid grid-cols-3 sm:flex sm:items-center sm:gap-5'
            : 'flex space-x-2'
        }>
        {navItems.map((item) => {
          const isActive = pathname === item.href

          if (item.onClick) {
            // 对于有自定义点击处理的按钮
            const activeTimer = item.key === 'focus' ? checkActiveTimer() : null
            const showRunningIndicator = !!(
              activeTimer && activeTimer.isRunning
            )
            const showPausedIndicator = !!(
              activeTimer &&
              !activeTimer.isRunning &&
              activeTimer.taskId
            )

            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className={getItemClassName(isActive)}>
                {isDashboardVariant && (
                  <span className="lg:hidden">
                    <NavigationIcon name="focus" />
                  </span>
                )}
                {item.label}
                {showRunningIndicator && !isFocusVariant && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse">
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                )}
                {showPausedIndicator && !isFocusVariant && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full">
                    <div className="absolute inset-0.5 w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                )}
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={getItemClassName(isActive)}>
              {isDashboardVariant && (
                <span className="lg:hidden">
                  <NavigationIcon
                    name={item.key === 'history' ? 'history' : 'dashboard'}
                  />
                </span>
              )}
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
