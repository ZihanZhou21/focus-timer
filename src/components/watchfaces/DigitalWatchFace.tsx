import { WatchFaceProps } from './types'

export const DigitalWatchFace = ({
  progress,
  timeLeft,
  mode,
  formatTime,
}: WatchFaceProps) => {
  const totalBlocks = 100
  const filledBlocks = Math.floor(progress)

  return (
    <div className="relative w-80 h-80 flex flex-col items-center justify-center">
      <div className="grid grid-cols-10 gap-1 mb-6 p-6 bg-stone-50/50 dark:bg-slate-800/30 rounded-2xl backdrop-blur-sm border border-stone-200/50 dark:border-slate-600/30">
        {Array.from({ length: totalBlocks }, (_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-md transition-all duration-300 ${
              i < filledBlocks
                ? mode === 'focus'
                  ? 'bg-amber-400 dark:bg-amber-500 shadow-sm'
                  : 'bg-emerald-400 dark:bg-emerald-500 shadow-sm'
                : 'bg-stone-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      <div className="text-center">
        <div className="text-5xl font-light text-stone-700 dark:text-slate-200 tracking-wider mb-2">
          {formatTime(timeLeft)}
        </div>
        <div
          className={`text-sm font-light tracking-wide ${
            mode === 'focus'
              ? 'text-stone-500 dark:text-slate-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
          {mode === 'focus' ? '专注时间' : '休息时间'}
        </div>
      </div>
    </div>
  )
}
