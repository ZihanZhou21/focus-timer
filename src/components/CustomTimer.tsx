'use client'

import { useState, useEffect, useRef } from 'react'

interface CustomTimerProps {
  duration?: string // 任务时长，如 "30分钟", "1小时30分钟"
  onComplete?: () => void
  onStart?: () => void
  onPause?: () => void
}

export default function CustomTimer({
  duration = '25分钟',
  onComplete,
  onStart,
  onPause,
}: CustomTimerProps) {
  // 解析时长字符串为秒数
  const parseDuration = (durationStr: string): number => {
    let totalSeconds = 0

    // 匹配小时
    const hourMatch = durationStr.match(/(\d+)小时/)
    if (hourMatch) {
      totalSeconds += parseInt(hourMatch[1]) * 3600
    }

    // 匹配分钟
    const minuteMatch = durationStr.match(/(\d+)分钟/)
    if (minuteMatch) {
      totalSeconds += parseInt(minuteMatch[1]) * 60
    }

    // 如果没有匹配到任何时间，默认25分钟
    return totalSeconds || 1500
  }

  const totalSeconds = parseDuration(duration)
  const [timeLeft, setTimeLeft] = useState(totalSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 格式化时间显示
  const formatTime = (
    seconds: number
  ): { minutes: string; seconds: string } => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    }
  }

  // 计算进度百分比
  const getProgress = (): number => {
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }

  // 开始/暂停计时器
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toggleTimer = () => {
    if (isCompleted) {
      // 重置计时器
      setTimeLeft(totalSeconds)
      setIsCompleted(false)
      setIsRunning(false)
      return
    }

    const newIsRunning = !isRunning
    setIsRunning(newIsRunning)

    if (newIsRunning) {
      onStart?.()
    } else {
      onPause?.()
    }
  }

  // 重置计时器
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(totalSeconds)
    setIsCompleted(false)
  }

  // 计时器逻辑
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsCompleted(true)
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft, onComplete])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          toggleTimer()
          break
        case 'KeyR':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault()
            resetTimer()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleTimer, resetTimer])

  const { minutes, seconds } = formatTime(timeLeft)
  const progress = getProgress()
  const circumference = 2 * Math.PI * 120 // 半径120的圆周长
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* 主表盘 */}
      <div className="relative">
        {/* 外圈装饰 */}
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-full blur-xl opacity-60 animate-pulse"></div>

        {/* 表盘容器 */}
        <div className="relative w-80 h-80 bg-slate-800/80 backdrop-blur-xl rounded-full border-4 border-slate-700/50 shadow-2xl">
          {/* SVG 进度环 */}
          <svg
            className="absolute inset-0 w-full h-full transform -rotate-90"
            viewBox="0 0 280 280">
            {/* 背景圆环 */}
            <circle
              cx="140"
              cy="140"
              r="120"
              stroke="rgb(51 65 85)"
              strokeWidth="8"
              fill="none"
              className="opacity-30"
            />

            {/* 进度圆环 */}
            <circle
              cx="140"
              cy="140"
              r="120"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />

            {/* 渐变定义 */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>

          {/* 中心内容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* 时间显示 */}
            <div className="text-center mb-4">
              <div className="text-6xl font-mono font-light text-white mb-2">
                {minutes}
                <span className="text-slate-400 mx-1">:</span>
                {seconds}
              </div>
              <div className="text-slate-400 text-sm font-medium tracking-wider">
                {isCompleted ? '已完成' : isRunning ? '专注中' : '准备开始'}
              </div>
            </div>

            {/* 进度指示器 */}
            <div className="flex items-center space-x-1 mb-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full transition-all duration-300 ${
                    i < (progress / 100) * 12
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* 状态指示 */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isRunning
                    ? 'bg-green-400 animate-pulse shadow-sm shadow-green-400/50'
                    : isCompleted
                    ? 'bg-blue-400 shadow-sm shadow-blue-400/50'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-xs text-slate-400 font-medium">
                {Math.round(progress)}% 完成
              </span>
            </div>
          </div>

          {/* 装饰刻度 */}
          <div className="absolute inset-0">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-0.5 bg-slate-600 origin-bottom ${
                  i % 5 === 0 ? 'h-4' : 'h-2'
                }`}
                style={{
                  left: '50%',
                  top: '8px',
                  transform: `translateX(-50%) rotate(${i * 6}deg)`,
                  transformOrigin: '50% 148px',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center space-x-6">
        <button
          onClick={resetTimer}
          className="w-12 h-12 bg-slate-700/80 hover:bg-slate-600/80 backdrop-blur-xl rounded-full border border-slate-600/50 flex items-center justify-center transition-all duration-300 hover:scale-105 group">
          <svg
            className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <button
          onClick={toggleTimer}
          className={`w-20 h-20 backdrop-blur-xl rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-105 group ${
            isCompleted
              ? 'bg-blue-600/80 hover:bg-blue-500/80 border-blue-500/50 hover:border-blue-400/50'
              : isRunning
              ? 'bg-red-600/80 hover:bg-red-500/80 border-red-500/50 hover:border-red-400/50'
              : 'bg-green-600/80 hover:bg-green-500/80 border-green-500/50 hover:border-green-400/50'
          }`}>
          {isCompleted ? (
            <svg
              className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          ) : isRunning ? (
            <svg
              className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="w-12 h-12 flex items-center justify-center">
          <div className="text-xs text-slate-400 text-center">
            <div>Space</div>
            <div className="text-slate-500">开始</div>
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="text-center text-slate-400 text-sm">
        <div className="flex items-center justify-center space-x-4">
          <span>Space - 开始/暂停</span>
          <span>•</span>
          <span>R - 重置</span>
        </div>
      </div>
    </div>
  )
}
