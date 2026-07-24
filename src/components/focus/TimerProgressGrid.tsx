'use client'

import React from 'react'

interface TimerProgressGridProps {
  progress: number
  elapsedLabel: string
  remainingLabel: string
}

const TimerProgressGridComponent = ({
  progress,
  elapsedLabel,
  remainingLabel,
}: TimerProgressGridProps) => {
  const safeProgress = Math.min(Math.max(progress, 0), 100)
  const roundedProgress = Math.round(safeProgress)

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-label="Focus session progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={roundedProgress}>
      <div className="mb-3 flex items-center justify-between gap-4 text-xs font-medium tracking-[-0.01em] text-[var(--muted-foreground)] sm:text-sm">
        <span className="tabular-nums">{elapsedLabel} elapsed</span>
        <span className="tabular-nums">{remainingLabel} remaining</span>
      </div>

      <div className="relative h-1 rounded-full bg-[var(--focus-track)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
        <span
          className="absolute top-1/2 h-3 w-3 rounded-full border-[3px] border-[var(--focus-session-bg)] bg-[var(--accent)] shadow-[0_2px_8px_rgba(37,99,235,0.28)] transition-[left] duration-500 ease-out"
          style={{
            left: `${safeProgress}%`,
            transform:
              safeProgress === 0
                ? 'translateY(-50%)'
                : 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 text-sm font-semibold tabular-nums text-[var(--accent)]">
        {roundedProgress}%
      </div>
    </div>
  )
}

const TimerProgressGrid = React.memo(TimerProgressGridComponent)
TimerProgressGrid.displayName = 'TimerProgressGrid'

export default TimerProgressGrid
