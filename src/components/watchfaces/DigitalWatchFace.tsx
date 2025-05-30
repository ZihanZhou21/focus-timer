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
      <div className="grid grid-cols-10 gap-1 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg">
        {Array.from({ length: totalBlocks }, (_, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded transition-all duration-300 ${
              i < filledBlocks
                ? mode === 'focus'
                  ? 'bg-red-500 shadow-md'
                  : 'bg-green-500 shadow-md'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
      <div className="text-center">
        <div className="text-4xl font-mono font-bold text-gray-800 dark:text-white">
          {formatTime(timeLeft)}
        </div>
        <div
          className={`text-sm font-medium ${
            mode === 'focus'
              ? 'text-gray-600 dark:text-gray-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
          {mode === 'focus' ? '专注时间' : '休息时间'}
        </div>
      </div>
    </div>
  )
}
