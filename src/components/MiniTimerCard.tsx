'use client'

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { RootState } from '@/app/store'

export default function MiniTimerCard() {
  const router = useRouter()
  const pathname = usePathname()
  const { isRunning, timeRemaining, totalElapsed, totalEstimated, taskTitle, taskId } = useSelector(
    (state: RootState) => state.timer
  )

  // 如果不在专注页面，且计时器正在运行（或暂停但有任务），显示悬浮卡片
  const shouldShow = useMemo(() => {
    // 如果已经在 focus 页面，不显示悬浮窗
    if (pathname === '/focus') return false
    // 只有在计时器运行中，或者暂停但有未完成任务时显示
    return isRunning || (taskId && timeRemaining > 0)
  }, [pathname, isRunning, taskId, timeRemaining])

  if (!shouldShow) return null

  const progress = totalEstimated > 0 ? Math.min((totalElapsed / totalEstimated) * 100, 100) : 0
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBackToFocus = () => {
    if (taskId) {
      const params = new URLSearchParams({
        id: taskId,
        remaining: Math.round(timeRemaining / 60).toString(),
        elapsed: Math.round(totalElapsed / 60).toString(),
      })
      router.push(`/focus?${params.toString()}`)
    } else {
      router.push('/focus')
    }
  }

  return (
    <div 
      onClick={handleBackToFocus}
      className="fixed bottom-24 right-6 z-[60] group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl p-4 w-64 transition-all hover:scale-105 hover:bg-slate-800 active:scale-95">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-medium text-slate-300 truncate">{taskTitle || '正在专注'}</span>
          </div>
          <span className="text-sm font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/30">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${isRunning ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-600'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Hover Hint */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Click to return to Focus mode
        </div>
      </div>
    </div>
  )
}
