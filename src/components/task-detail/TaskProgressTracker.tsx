'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { formatDuration } from '@/lib/utils'

interface TaskProgressTrackerProps {
  durationMinutes: number
  executedMinutes: number
  progress: number
  isCheckInTask: boolean
  taskId?: string
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const safeProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div className="mb-5 border-b border-[var(--border)] pb-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[var(--foreground)]">
          {Math.round(safeProgress)}% complete
        </span>
        {durationMinutes > 0 && (
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
            {formatDuration(durationMinutes)} planned
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted-foreground)]">
        {executedMinutes > 0 && <span>{executedMinutes}m focused</span>}
        {isThisTaskActive && (
          <div className="flex items-center gap-2 font-medium text-[var(--foreground)]">
            <span
              className={`h-2 w-2 rounded-full ${
                timer.isRunning ? 'animate-pulse bg-amber-400' : 'bg-slate-400'
              }`}
            />
            <span className="tabular-nums">{formatTime(timer.timeRemaining)}</span>
            <span>{timer.isRunning ? 'focusing' : 'paused'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
