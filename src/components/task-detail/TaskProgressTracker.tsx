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
        <div className="mb-12 flex flex-col items-center justify-center py-20 px-6 bg-slate-800/60 rounded-[3rem] border border-amber-500/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
          {/* 动态背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent opacity-30"></div>
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] animate-pulse"></div>
          
          <div className="relative z-10 text-[9rem] font-mono font-black text-amber-400 tabular-nums tracking-[-0.05em] leading-none mb-6 drop-shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            {formatTime(timer.timeRemaining)}
          </div>
          
          <div className="relative z-10 flex items-center gap-3 px-6 py-2 bg-slate-900/50 rounded-full border border-slate-700/50 backdrop-blur-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${timer.isRunning ? 'bg-amber-500 animate-pulse' : 'bg-slate-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'}`}></div>
            <div className="text-slate-300 text-xs font-black uppercase tracking-[0.4em]">
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
              <div className="text-slate-400 text-xs font-medium mb-1">
                Total Duration
              </div>
              <div className="text-white text-4xl font-light tracking-wide">
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
            <span className="text-slate-400 text-sm">Task Progress</span>
            {executedMinutes > 0 && (
              <span className="text-slate-500 text-xs">
                Executed {executedMinutes} minutes
              </span>
            )}
          </div>
          <span className="text-white text-sm font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
