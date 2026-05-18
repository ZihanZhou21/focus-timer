'use client'

import React from 'react'
import { formatDuration } from '@/lib/utils'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'

interface TaskProgressTrackerProps {
  durationMinutes: number
  executedMinutes: number
  remainingMinutes: number
  progress: number
  isCheckInTask: boolean
  taskId?: string
}

export default function TaskProgressTracker({
  durationMinutes,
  executedMinutes,
  progress,
  isCheckInTask,
  taskId,
}: TaskProgressTrackerProps) {
  const timer = useSelector((state: RootState) => state.timer)
  const isThisTaskActive = timer.taskId === taskId

  if (isCheckInTask) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="mb-6">
      {/* 核心计时器显示 (如果是当前激活任务) */}
      {isThisTaskActive && (
        <div className="mb-12 flex flex-col items-center justify-center py-20 px-6 bg-[var(--surface-muted)] rounded-[3rem] border border-[var(--border)] shadow-xl relative overflow-hidden group">
          
          <div className="relative z-10 text-[9rem] font-mono font-black text-[var(--accent)] tabular-nums tracking-tight leading-none mb-6">
            {formatTime(timer.timeRemaining)}
          </div>
          
          <div className="relative z-10 flex items-center gap-3 px-6 py-2 bg-[var(--surface)] rounded-full border border-[var(--border)] backdrop-blur-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${timer.isRunning ? 'bg-amber-500 animate-pulse' : 'bg-slate-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'}`}></div>
            <div className="text-[var(--muted-foreground)] text-xs font-black uppercase tracking-[0.4em]">
              {timer.isRunning ? 'Focusing' : 'Paused'}
            </div>
          </div>
        </div>
      )}

      {/* 总时长信息 (仅在非激活状态或作为背景参考显示) */}
      {!isThisTaskActive && durationMinutes > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline gap-6 mb-2">
            <div>
              <div className="text-[var(--muted-foreground)] text-xs font-medium mb-1">
                Total Duration
              </div>
              <div className="text-[var(--foreground)] text-4xl font-light tracking-wide">
                {formatDuration(durationMinutes)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted-foreground)] text-sm">Task Progress</span>
            {executedMinutes > 0 && (
              <span className="text-[var(--muted-foreground)] text-xs">
                Executed {executedMinutes} minutes
              </span>
            )}
          </div>
          <span className="text-[var(--foreground)] text-sm font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-[var(--border)] rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
