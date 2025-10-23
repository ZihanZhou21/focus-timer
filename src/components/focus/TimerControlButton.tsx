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
    onClick={onToggle}
    className={`w-20 h-20 rounded-full transition-all duration-300 flex items-center justify-center text-3xl font-medium shadow-2xl relative overflow-hidden group ${
      isRunning
        ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white border-2 border-slate-600 hover:from-slate-600 hover:to-slate-700'
        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-blue-400 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/25'
    }`}>
    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <span className="relative z-10">
      {isRunning ? (
        <div className="flex items-center justify-center">
          <div className="w-2 h-6 bg-current rounded-sm"></div>
          <div className="w-2 h-6 bg-current rounded-sm ml-1"></div>
        </div>
      ) : (
        '▶'
      )}
    </span>
  </button>
)

const TimerControlButton = React.memo(TimerControlButtonComponent)
TimerControlButton.displayName = 'TimerControlButton'

export default TimerControlButton
