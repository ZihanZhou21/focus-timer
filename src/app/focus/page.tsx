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
  initialProgress = 0,
  taskId,
  onComplete,
  onTick,
}: {
  initialTime: number
  initialProgress?: number
  taskId?: string
  onComplete?: () => void
  onTick?: (remaining: number) => void
}) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime * 60) // 转换为秒
  const [isRunning, setIsRunning] = useState(false)
  const [totalElapsed, setTotalElapsed] = useState(
    Math.round((initialProgress / 100) * initialTime * 60)
  ) // 基于初始进度计算已用时间
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  // 计算当前总进度百分比
  const currentProgress = Math.min(
    (totalElapsed / (initialTime * 60)) * 100,
    100
  )

  // 更新任务进度到后端
  const updateTaskProgress = useCallback(
    async (elapsedSeconds: number) => {
      if (!taskId) return

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in_progress',
            // 添加新的时间记录
            timeLog: {
              startTime:
                sessionStartTime.current?.toISOString() ||
                new Date().toISOString(),
              endTime: new Date().toISOString(),
              duration: elapsedSeconds,
            },
          }),
        })

        if (!response.ok) {
          console.error('更新任务进度失败')
        }
      } catch (error) {
        console.error('更新任务进度出错:', error)
      }
    },
    [taskId]
  )

  // 开始计时器
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    sessionStartTime.current = new Date()

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          // 完成时更新总进度
          setTotalElapsed(initialTime * 60)
          // 更新后端进度
          updateTaskProgress(initialTime * 60)
          onComplete?.()
          return 0
        }
        return prev - 1
      })

      // 更新总用时
      setTotalElapsed((prev) => prev + 1)
    }, 1000)
  }, [onComplete, initialTime, updateTaskProgress])

  // 暂停计时器
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null

      // 暂停时更新进度到后端
      if (sessionStartTime.current) {
        updateTaskProgress(totalElapsed)
      }
    }
  }, [totalElapsed, updateTaskProgress])

  // 重置计时器
  const resetTimer = useCallback(() => {
    pauseTimer()
    setTimeRemaining(initialTime * 60)
    setIsRunning(false)
    // 保持已有的总进度，不重置
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
              任务进度
            </div>
            <div className="text-2xl font-light text-green-400">
              {Math.round(currentProgress)}%
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
                if (currentProgress > blockEnd) {
                  // 如果总进度超过这个格子的范围，格子完全填满
                  blockFillPercentage = 100
                } else if (currentProgress > blockStart) {
                  // 如果总进度在这个格子范围内，计算格子内的填充百分比
                  blockFillPercentage =
                    ((currentProgress - blockStart) / 5) * 100
                }

                return (
                  <div
                    key={i}
                    className="relative flex-1 bg-gray-700 border border-gray-600"
                    style={{ minHeight: '48px' }}>
                    {/* 填充部分 */}
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
        </div>
      </div>

      {/* 底部区域 - 控制按钮 */}
      <div className="flex justify-center space-x-6 mt-16">
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
  const initialProgress = Number(searchParams.get('progress')) || 0

  // 定义任务信息类型
  interface TaskInfo {
    id: string
    title: string
    icon: string
    time: string
    duration?: string
    details?: string[]
    type?: string
  }

  // 使用 useState 管理任务信息，避免 hydration 错误
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从API获取任务信息
  useEffect(() => {
    const fetchTaskInfo = async () => {
      if (!taskId) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/tasks/${taskId}`)
        if (response.ok) {
          const task = await response.json()
          setTaskInfo({
            id: task._id,
            title: task.title,
            icon: task.type === 'check-in' ? '💪' : '📝',
            time: task.plannedTime || '09:00',
            duration: task.estimatedDuration
              ? `${Math.round(task.estimatedDuration / 60)}分钟`
              : '25分钟',
            details: Array.isArray(task.content)
              ? task.content
              : [task.content],
            type: task.type,
          })
        }
      } catch (error) {
        console.error('获取任务信息失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaskInfo()
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
    console.log('专注时段完成')

    // 如果有任务ID，完成任务
    if (taskId && taskInfo) {
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString(),
        }),
      }).catch((error) => {
        console.error('完成任务失败:', error)
      })
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-400">加载任务信息...</div>
        </div>
      </div>
    )
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
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>{taskInfo.icon}</span>
              <span>{taskInfo.title}</span>
              <span className="text-slate-400">({taskInfo.duration})</span>
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
            initialProgress={initialProgress}
            taskId={taskId || undefined}
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
