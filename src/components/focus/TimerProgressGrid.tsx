'use client'

import React from 'react'

interface TimerProgressGridProps {
  progress: number
}

const TOTAL_BLOCKS = 20
const BLOCK_SPAN = 5

const TimerProgressGridComponent = ({ progress }: TimerProgressGridProps) => {
  return (
    <div className="relative bg-slate-800/60 backdrop-blur-xl p-3 rounded-xl shadow-2xl border border-slate-700/50">
      <div className="relative h-8 bg-gray-800 flex gap-1">
        {Array.from({ length: TOTAL_BLOCKS }, (_, index) => {
          const blockStart = index * BLOCK_SPAN
          const blockEnd = (index + 1) * BLOCK_SPAN

          let blockFillPercentage = 0
          if (progress > blockEnd) {
            blockFillPercentage = 100
          } else if (progress > blockStart) {
            blockFillPercentage =
              ((progress - blockStart) / BLOCK_SPAN) * 100
          }

          return (
            <div
              key={index}
              className="relative flex-1 bg-gray-700 border border-gray-600"
              style={{ minHeight: '32px' }}>
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-200 ease-out"
                style={{
                  width: `${blockFillPercentage}%`,
                  height: '100%',
                }}></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TimerProgressGrid = React.memo(TimerProgressGridComponent)
TimerProgressGrid.displayName = 'TimerProgressGrid'

export default TimerProgressGrid
