'use client'

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useSearchParams } from 'next/navigation'

// 现代化计时器组件
function ModernTimer({
  initialTime = 25,
  onComplete,
  onTick,
}: {
  initialTime: number
  onComplete?: () => void
  onTick?: (remaining: number) => void
}) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime * 60) // 转换为秒
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  // 计算进度百分比
  const progress =
    ((initialTime * 60 - timeRemaining) / (initialTime * 60)) * 100

  // 开始计时器
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [onComplete])

  // 暂停计时器
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 重置计时器
  const resetTimer = useCallback(() => {
    pauseTimer()
    setTimeRemaining(initialTime * 60)
    setIsRunning(false)
  }, [initialTime, pauseTimer])

  // 播放/暂停切换
  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer()
      setIsRunning(false)
    } else {
      startTimer()
      setIsRunning(true)
    }
  }, [isRunning, startTimer, pauseTimer])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggleTimer()
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        resetTimer()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [toggleTimer, resetTimer])

  // 当初始时间改变时更新剩余时间
  useEffect(() => {
    setTimeRemaining(initialTime * 60)
  }, [initialTime])

  // 处理onTick回调，避免在渲染期间调用
  useEffect(() => {
    if (onTick) {
      onTick(timeRemaining)
    }
  }, [timeRemaining, onTick])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col justify-between h-full">
      {/* 上部区域 - 倒计时显示 */}
      <div className="flex flex-col items-center space-y-8">
        {/* 时间显示框 - 更大尺寸 */}
        <div className="bg-gray-900 text-green-400 border-4 border-green-400 p-8 font-mono shadow-lg shadow-green-400/20">
          <div className="text-8xl font-bold tracking-wider text-center">
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* 状态和进度显示 - 水平排列 */}
        {/* <div className="flex items-center space-x-8">
          <div className="bg-gray-800 text-cyan-400 border-2 border-cyan-400 px-6 py-3 font-mono font-bold text-lg">
            {isRunning ? 'STATUS: RUNNING' : 'STATUS: READY'}
          </div>
          <div className="bg-gray-700 text-yellow-400 border-2 border-yellow-400 px-6 py-3 font-mono font-bold text-lg">
            PROGRESS: {Math.round(progress)}%
          </div>
        </div> */}
      </div>

      {/* 中部区域 - 进度条 */}
      <div className="flex-1 flex flex-col justify-center mb-12">
        <div className="relative">
          {/* LOADING文字和百分比 */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-2xl font-mono font-bold text-green-400 tracking-wider">
              LOADING...
            </div>
            <div className="text-2xl font-mono font-bold text-green-400">
              {Math.round(progress)}%
            </div>
          </div>

          {/* 暗色像素化进度条容器 - 更大尺寸 */}
          <div
            className="relative bg-gray-900 p-3 rounded-none shadow-lg shadow-green-400/20"
            style={{ border: '4px solid #15803d' }}>
            {/* 进度条内容区域 */}
            <div className="relative h-12 bg-gray-800 flex gap-1">
              {/* 20个独立方格 */}
              {Array.from({ length: 20 }, (_, i) => {
                const blockStart = i * 5 // 当前格子的起始百分比
                const blockEnd = (i + 1) * 5 // 当前格子的结束百分比

                // 计算当前格子的填充进度
                let blockFillPercentage = 0
                if (progress > blockEnd) {
                  // 如果总进度超过这个格子的范围，格子完全填满
                  blockFillPercentage = 100
                } else if (progress > blockStart) {
                  // 如果总进度在这个格子范围内，计算格子内的填充百分比
                  blockFillPercentage = ((progress - blockStart) / 5) * 100
                }

                return (
                  <div
                    key={i}
                    className="flex-1 h-full relative bg-gray-700 overflow-hidden"
                    style={{ minWidth: '0', border: '2px solid #1f2937' }}>
                    {/* 从底部开始填充的进度 */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-green-400 transition-all duration-500 ease-out"
                      style={{
                        height: `${blockFillPercentage}%`,
                        boxShadow:
                          blockFillPercentage > 0
                            ? '0 0 4px rgba(74, 222, 128, 0.5)'
                            : 'none',
                      }}></div>

                    {/* 格子内的微光效果 */}
                    {blockFillPercentage > 0 && blockFillPercentage < 100 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-300 to-transparent opacity-60 animate-pulse"
                        style={{
                          height: `${Math.min(blockFillPercentage + 10, 100)}%`,
                        }}></div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 关键节点标记 - 暗色像素化风格 */}
          <div className="absolute -bottom-12 w-full flex justify-between items-center">
            {/* 25% 标记 */}
            <div
              className="absolute"
              style={{ left: '25%', transform: 'translateX(-50%)' }}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 border-2 border-cyan-400 ${
                    progress >= 25 ? 'bg-cyan-400' : 'bg-gray-700'
                  } transition-all duration-300`}></div>
                <div className="text-sm font-mono text-cyan-400 mt-2 bg-gray-900 border border-cyan-400 px-2 py-1">
                  25%
                </div>
              </div>
            </div>

            {/* 50% 标记 */}
            <div
              className="absolute"
              style={{ left: '50%', transform: 'translateX(-50%)' }}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 border-2 border-yellow-400 ${
                    progress >= 50 ? 'bg-yellow-400' : 'bg-gray-700'
                  } transition-all duration-300`}></div>
                <div className="text-sm font-mono text-yellow-400 mt-2 bg-gray-900 border border-yellow-400 px-2 py-1">
                  50%
                </div>
              </div>
            </div>

            {/* 75% 标记 */}
            <div
              className="absolute"
              style={{ left: '75%', transform: 'translateX(-50%)' }}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 border-2 border-purple-400 ${
                    progress >= 75 ? 'bg-purple-400' : 'bg-gray-700'
                  } transition-all duration-300`}></div>
                <div className="text-sm font-mono text-purple-400 mt-2 bg-gray-900 border border-purple-400 px-2 py-1">
                  75%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 下部区域 - 控制按钮 */}
      <div className="flex items-center justify-center space-x-10">
        <button
          onClick={toggleTimer}
          className="bg-gray-800 text-green-400 border-4 border-green-400 px-12 py-6 font-mono font-bold text-2xl hover:bg-gray-700 active:bg-gray-900 transition-colors duration-150 shadow-lg shadow-green-400/20">
          {isRunning ? 'PAUSE' : 'START'}
        </button>

        <button
          onClick={resetTimer}
          className="bg-gray-900 text-red-400 border-4 border-red-400 px-10 py-6 font-mono font-bold text-2xl hover:bg-gray-800 active:bg-black transition-colors duration-150 shadow-lg shadow-red-400/20">
          RESET
        </button>
      </div>
    </div>
  )
}

function FocusContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get('id')

  // 定义任务信息类型
  interface TaskInfo {
    id: string
    title: string
    icon: string
    time: string
    duration?: string
    details?: string[]
  }

  // 使用 useState 管理任务信息，避免 hydration 错误
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)

  // 在 useEffect 中加载任务信息
  useEffect(() => {
    try {
      const savedTask = localStorage.getItem('currentTask')
      if (savedTask) {
        const parsed = JSON.parse(savedTask) as TaskInfo
        // 如果URL中有taskId，验证是否匹配
        if (taskId && parsed.id !== taskId) {
          setTaskInfo(null)
        } else {
          setTaskInfo(parsed)
        }
      }
    } catch (error) {
      console.error('获取任务信息失败:', error)
      setTaskInfo(null)
    }
  }, [taskId])

  // 解析时长字符串为分钟数
  const parseDurationToMinutes = useCallback((durationStr: string): number => {
    let totalMinutes = 0
    const hourMatch = durationStr.match(/(\d+)小时/)
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60
    }
    const minuteMatch = durationStr.match(/(\d+)分钟/)
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1])
    }
    return totalMinutes || 25
  }, [])

  const handleTimerComplete = () => {
    // 可以添加完成音效或通知
    console.log('专注时段完成')
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* 顶部区域 - 返回按钮 */}
      <header className="flex items-start justify-between p-8">
        <button
          onClick={() => (window.location.href = '/')}
          className="flex items-center space-x-2 bg-gray-800 text-green-400 border-2 border-green-400 px-4 py-3 font-mono text-sm font-bold hover:bg-gray-700 transition-colors duration-150">
          <div className="text-lg">←</div>
          <span>BACK</span>
        </button>

        {/* 右上角显示任务信息 - 只在客户端渲染后显示 */}
        {taskInfo && (
          <div className="bg-gray-900 text-cyan-400 border-2 border-cyan-400 px-4 py-2 font-mono text-sm">
            TASK: {taskInfo.title}
          </div>
        )}
      </header>

      {/* 主要内容区域 - 全屏布局 */}
      <main className="flex-1 flex flex-col justify-center px-8 space-y-12">
        <ModernTimer
          initialTime={
            taskInfo?.duration ? parseDurationToMinutes(taskInfo.duration) : 25
          }
          onComplete={handleTimerComplete}
        />
      </main>

      {/* 底部区域 - 快捷键提示 */}
      <footer className="p-8">
        <div className="flex items-center justify-center space-x-12 text-sm">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-800 text-green-400 border-2 border-green-400 px-3 py-2 font-mono font-bold">
              SPACE
            </div>
            <span className="font-mono text-gray-300">= START/PAUSE</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-gray-800 text-red-400 border-2 border-red-400 px-3 py-2 font-mono font-bold">
              R
            </div>
            <span className="font-mono text-gray-300">= RESET</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-400">加载专注环境...</div>
          </div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
