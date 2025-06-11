import { WatchFaceProps } from './types'

export const SimpleWatchFace = ({
  progress,
  timeLeft,
  mode,
  formatTime,
}: WatchFaceProps) => {
  const radius = 180
  const strokeWidth = 20
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90">
        <defs>
          <filter
            id="simpleShadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%">
            <feDropShadow
              dx="2"
              dy="2"
              stdDeviation="4"
              floodColor="rgba(0,0,0,0.1)"
            />
          </filter>
        </defs>
        {/* 背景圆圈 */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-stone-200 dark:text-slate-700"
          filter="url(#simpleShadow)"
        />
        {/* 进度圆圈 */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`transition-all duration-1000 ease-in-out ${
            mode === 'focus'
              ? 'text-amber-400 dark:text-amber-500'
              : 'text-emerald-400 dark:text-emerald-500'
          }`}
          style={{ strokeLinecap: 'round' }}
          filter="url(#simpleShadow)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
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
    </div>
  )
}
