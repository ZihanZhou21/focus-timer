'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'

interface NavigationProps {
  className?: string
}

export default function AppNavigation({ className = '' }: NavigationProps) {
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

  return (
    <nav className={`bg-slate-800 rounded-2xl p-1.5 ${className}`}>
      <div className="flex space-x-2">
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
                className={`relative px-6 py-2.5 rounded-xl transition-colors text-base font-medium ${
                  isActive
                    ? 'text-white bg-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}>
                {item.label}
                {showRunningIndicator && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse">
                    <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                )}
                {showPausedIndicator && (
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
