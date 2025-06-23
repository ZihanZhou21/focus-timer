'use client'

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { apiService } from '@/lib/api'

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

          // 保存专注记录到后端
          const today = new Date().toISOString().split('T')[0]
          const now = new Date()
          const startTime = new Date(Date.now() - initialTime * 60 * 1000)

          // 创建专注项目记录
          const focusProject = {
            userId: 'user_001',
            date: today,
            time: `${startTime
              .getHours()
              .toString()
              .padStart(2, '0')}:${startTime
              .getMinutes()
              .toString()
              .padStart(2, '0')}`,
            title: `专注时间 ${initialTime}分钟`,
            durationMinutes: initialTime,
            icon: '🎯',
            iconColor: 'bg-amber-500',
            category: 'focus' as const,
            completed: true,
            details: [
              '番茄钟专注法',
              `完成时间: ${now.getHours().toString().padStart(2, '0')}:${now
                .getMinutes()
                .toString()
                .padStart(2, '0')}`,
            ],
          }

          apiService.saveProject(focusProject).catch((error: unknown) => {
            console.error('Failed to save focus session:', error)
          })

          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [onComplete, initialTime])

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
    <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
      {/* 上部区域 - 倒计时显示 */}
      <div className="flex flex-col items-center space-y-8 mb-16">
        {/* 时间显示框 */}
        <div className="bg-slate-800/80 backdrop-blur-xl text-white p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
          <div className="text-8xl font-light tracking-wider text-center">
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* 中部区域 - 进度条 */}
      <div className="flex flex-col justify-start max-w-4xl mx-auto w-full">
        <div className="relative">
          {/* 进度文字和百分比 */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-2xl font-light text-slate-200 tracking-wider">
              专注进度
            </div>
            <div className="text-2xl font-light text-green-400">
              {Math.round(progress)}%
            </div>
          </div>

          {/* 进度条容器 */}
          <div className="relative bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-slate-700/50">
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
        </div>
      </div>

      {/* 下部区域 - 控制按钮 */}
      <div className="flex items-center justify-center space-x-6 mt-8 mb-8">
        <button
          onClick={toggleTimer}
          className="bg-slate-800/80 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 active:bg-slate-900/80 transition-all duration-200 shadow-lg border border-slate-700/50 hover:border-green-400/30">
          {isRunning ? '暂停' : '开始'}
        </button>

        <button
          onClick={resetTimer}
          className="bg-slate-800/80 backdrop-blur-xl text-slate-300 px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 active:bg-slate-900/80 transition-all duration-200 shadow-lg border border-slate-700/50 hover:border-red-400/30">
          重置
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

    // 保存专注记录到后端
    if (taskInfo) {
      const today = new Date().toISOString().split('T')[0]
      const duration = taskInfo.duration
        ? parseDurationToMinutes(taskInfo.duration)
        : 25

      // 创建专注项目记录
      const now = new Date()
      const startTime = new Date(Date.now() - duration * 60 * 1000)

      const focusProject = {
        userId: 'user_001',
        date: today,
        time: `${startTime.getHours().toString().padStart(2, '0')}:${startTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`,
        title: taskInfo.title || `专注时间 ${duration}分钟`,
        durationMinutes: duration,
        icon: taskInfo.icon || '🎯',
        iconColor: 'bg-amber-500',
        category: 'focus' as const,
        completed: true,
        details: [
          '番茄钟专注法',
          `完成时间: ${now.getHours().toString().padStart(2, '0')}:${now
            .getMinutes()
            .toString()
            .padStart(2, '0')}`,
          ...(taskInfo.details || []),
        ],
      }

      apiService.saveProject(focusProject).catch((error: unknown) => {
        console.error('Failed to save focus session:', error)
      })
    }
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* 顶部导航栏 - 与主页面风格一致 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="text-xl font-bold text-slate-300">FOCUS</div>

        <nav className="bg-slate-800 rounded-2xl p-1.5">
          <div className="flex space-x-2">
            <button
              onClick={() => (window.location.href = '/')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </button>
            <div className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              Focus
            </div>
            <button
              onClick={() => (window.location.href = '/calendar')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              History
            </button>
          </div>
        </nav>

        {/* 右上角显示任务信息 */}
        <div className="flex items-center space-x-4">
          {taskInfo && (
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium">
              {taskInfo.icon} {taskInfo.title}
            </div>
          )}
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <ModernTimer
            initialTime={
              taskInfo?.duration
                ? parseDurationToMinutes(taskInfo.duration)
                : 25
            }
            onComplete={handleTimerComplete}
          />
        </div>
      </main>

      {/* 底部区域 - 快捷键提示 */}
      <footer className="p-8">
        <div className="flex items-center justify-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
              SPACE
            </div>
            <span className="text-slate-400 text-sm">开始/暂停</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
              R
            </div>
            <span className="text-slate-400 text-sm">重置</span>
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
