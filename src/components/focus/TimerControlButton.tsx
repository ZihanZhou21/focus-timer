'use client'

import React from 'react'

interface TimerControlButtonProps {
  isRunning: boolean
  onToggle: () => void
}

const TimerControlButtonComponent = ({
  isRunning,
  onToggle,
}: TimerControlButtonProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
    aria-pressed={isRunning}
    className={`group relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 ${
      isRunning
        ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--focus-session-bg)] shadow-[0_10px_28px_rgba(15,23,42,0.16)] hover:opacity-90'
        : 'border-blue-500/20 bg-[var(--accent)] text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] hover:bg-blue-600'
    }`}>
    <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
    <span className="relative z-10 grid place-items-center" aria-hidden="true">
      {isRunning ? (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6.5" y="5" width="4" height="14" rx="1.5" />
          <rect x="13.5" y="5" width="4" height="14" rx="1.5" />
        </svg>
      ) : (
        <svg
          className="ml-0.5 h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24">
          <path d="M8.25 5.6a1.25 1.25 0 0 1 1.9-1.06l9.1 6.4a1.3 1.3 0 0 1 0 2.12l-9.1 6.4a1.25 1.25 0 0 1-1.9-1.06V5.6Z" />
        </svg>
      )}
    </span>
  </button>
)

const TimerControlButton = React.memo(TimerControlButtonComponent)
TimerControlButton.displayName = 'TimerControlButton'

export default TimerControlButton
