'use client'

import React, { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

function ModernTimer({
  initialTime = 25,
  originalRemaining = 0,
  originalElapsed = 0,
  taskId,
  onComplete,
}: {
  initialTime: number
  originalRemaining?: number
  originalElapsed?: number
  taskId?: string | null
  onComplete?: () => void
}) {
  // 计算真实的总预估时间和已用时间
  const calculateInitialValues = () => {
    if (originalRemaining > 0 && originalElapsed > 0) {
      // 从任务详情跳转：使用真实的剩余时间和已用时间
      return {
        timeRemaining: originalRemaining * 60, // 剩余时间（秒）
        totalElapsed: originalElapsed * 60, // 已用时间（秒）
        totalEstimated: (originalRemaining + originalElapsed) * 60, // 总预估时间（秒）
      }
    } else {
      // 新任务：使用完整时间
      return {
        timeRemaining: initialTime * 60,
        totalElapsed: 0,
        totalEstimated: initialTime * 60,
      }
    }
  }

  // localStorage存储键
  const getStorageKey = () =>
    taskId ? `focus-timer-${taskId}` : 'focus-timer-practice'

  // 从localStorage恢复状态
  const restoreFromStorage = () => {
    if (typeof window === 'undefined') return null

    try {
      const storageKey = getStorageKey()
      const savedState = localStorage.getItem(storageKey)

      if (savedState) {
        const parsed = JSON.parse(savedState)
        console.log('从localStorage恢复状态:', parsed)

        // 验证数据完整性
        if (
          parsed.timeRemaining !== undefined &&
          parsed.totalElapsed !== undefined &&
          parsed.totalEstimated !== undefined &&
          parsed.lastSaveTime
        ) {
          // 检查数据是否过期（超过24小时）
          const hoursSinceLastSave =
            (Date.now() - parsed.lastSaveTime) / (1000 * 60 * 60)
          if (hoursSinceLastSave < 24) {
            return {
              timeRemaining: parsed.timeRemaining,
              totalElapsed: parsed.totalElapsed,
              totalEstimated: parsed.totalEstimated,
              isRunning: false, // 恢复时总是暂停状态
            }
          } else {
            console.log('localStorage数据已过期，清除')
            localStorage.removeItem(storageKey)
          }
        }
      }
    } catch (error) {
      console.error('恢复localStorage状态失败:', error)
    }

    return null
  }

  // 保存状态到localStorage
  const saveToStorage = (
    timeRemaining: number,
    totalElapsed: number,
    totalEstimated: number
  ) => {
    if (typeof window === 'undefined') return

    try {
      const storageKey = getStorageKey()
      const stateToSave = {
        timeRemaining,
        totalElapsed,
        totalEstimated,
        taskId,
        lastSaveTime: Date.now(),
      }

      localStorage.setItem(storageKey, JSON.stringify(stateToSave))
      console.log('状态已保存到localStorage:', stateToSave)
    } catch (error) {
      console.error('保存状态到localStorage失败:', error)
    }
  }

  // 清除localStorage状态
  const clearStorage = () => {
    if (typeof window === 'undefined') return

    try {
      const storageKey = getStorageKey()
      localStorage.removeItem(storageKey)
      console.log('已清除localStorage状态')
    } catch (error) {
      console.error('清除localStorage状态失败:', error)
    }
  }

  // 优先从localStorage恢复，否则使用计算的初始值
  const getInitialState = () => {
    const restoredState = restoreFromStorage()
    if (restoredState) {
      return restoredState
    }
    return {
      ...calculateInitialValues(),
      isRunning: false,
    }
  }

  const initialState = getInitialState()

  const [timeRemaining, setTimeRemaining] = useState(
    Math.floor(initialState.timeRemaining)
  )
  const [isRunning, setIsRunning] = useState(initialState.isRunning)
  const [totalElapsed, setTotalElapsed] = useState(
    Math.floor(initialState.totalElapsed)
  )
  const totalEstimated = Math.floor(initialState.totalEstimated)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  // 计算当前总进度百分比
  const currentProgress = Math.min((totalElapsed / totalEstimated) * 100, 100)

  // 保存当前会话数据到后端
  const saveSessionData = async () => {
    if (!taskId || !sessionStartTime.current) return

    try {
      const sessionDuration = Math.floor(
        (Date.now() - sessionStartTime.current.getTime()) / 1000
      )

      // 只有当会话时间大于3秒时才更新后端
      if (sessionDuration >= 3) {
        const timeLogEntry = {
          startTime: sessionStartTime.current.toISOString(),
          endTime: new Date().toISOString(),
          duration: sessionDuration,
        }

        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in_progress',
            timeLog: timeLogEntry,
            lastActivityAt: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          console.error('保存会话数据失败:', response.statusText)
        } else {
          console.log(`已保存工作会话: ${sessionDuration}秒`)
        }
      }
    } catch (error) {
      console.error('保存会话数据出错:', error)
    }
  }

  // 保存任务状态到后端
  const saveTaskStatus = async () => {
    if (!taskId) {
      console.log('没有taskId，跳过保存任务状态')
      return
    }

    try {
      // 计算当前剩余时间（分钟）
      const remainingMinutes = Math.floor(timeRemaining / 60)
      const elapsedMinutes = Math.floor(totalElapsed / 60)

      // 根据剩余时间确定任务状态
      const taskStatus = remainingMinutes <= 0 ? 'completed' : 'paused'

      console.log('准备保存任务状态:', {
        taskId,
        remainingMinutes,
        elapsedMinutes,
        taskStatus,
      })

      const updateData: {
        status: string
        lastActivityAt: string
        completedAt?: string
      } = {
        status: taskStatus,
        lastActivityAt: new Date().toISOString(),
      }

      // 如果任务完成，添加完成时间
      if (taskStatus === 'completed') {
        updateData.completedAt = new Date().toISOString()
      }

      console.log(`调用API: PUT /api/tasks/${taskId}`, updateData)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      console.log(`API响应状态: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('保存任务状态失败:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        })
      } else {
        const result = await response.json()
        console.log(`已保存任务状态: ${taskStatus}`, result)
      }
    } catch (error) {
      console.error('保存任务状态出错:', error)
    }
  }

  // 开始计时器
  const startTimer = () => {
    console.log('Starting timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    sessionStartTime.current = new Date()
    setIsRunning(true)

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTimeRemaining = Math.max(0, prev - 1)

        if (newTimeRemaining <= 0) {
          setIsRunning(false)
          setTotalElapsed(totalEstimated)

          // 任务完成时清除localStorage状态
          clearStorage()

          // 任务完成时保存会话数据和任务状态
          Promise.all([saveSessionData(), saveTaskStatus()])
          onComplete?.()
          return 0
        }
        return newTimeRemaining
      })

      setTotalElapsed((prev) => prev + 1)
    }, 1000)
  }

  // 暂停计时器 - 手动暂停时保存数据
  const pauseTimer = async () => {
    console.log('Pausing timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setIsRunning(false)

      // 保存当前状态到localStorage
      saveToStorage(timeRemaining, totalElapsed, totalEstimated)

      // 手动暂停时保存会话数据和任务状态
      await Promise.all([saveSessionData(), saveTaskStatus()])
    }
  }

  // 播放/暂停切换
  const toggleTimer = () => {
    console.log('Toggle timer, current state:', isRunning)

    if (isRunning) {
      pauseTimer()
    } else {
      startTimer()
    }
  }

  // 页面离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        // 保存当前状态到localStorage
        saveToStorage(timeRemaining, totalElapsed, totalEstimated)

        // 页面刷新/关闭时保存会话数据和任务状态
        Promise.all([saveSessionData(), saveTaskStatus()])
        e.preventDefault()
        e.returnValue = '计时器正在运行，确定要离开吗？'
        return '计时器正在运行，确定要离开吗？'
      }
    }

    const handlePopState = async () => {
      if (isRunning) {
        const confirmed = window.confirm('计时器正在运行，确定要离开吗？')
        if (confirmed) {
          // 保存当前状态到localStorage
          saveToStorage(timeRemaining, totalElapsed, totalEstimated)

          // 页面切换时保存会话数据和任务状态并暂停
          await Promise.all([saveSessionData(), saveTaskStatus()])
          setIsRunning(false)
        } else {
          // 阻止导航，恢复当前URL
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    // 防止浏览器后退
    if (isRunning) {
      window.history.pushState(null, '', window.location.href)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isRunning])

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggleTimer()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        // ESC键安全退出
        if (isRunning) {
          const confirmed = window.confirm(
            '计时器正在运行，确定要退出吗？退出后将暂停计时。'
          )
          if (confirmed) {
            // 保存当前状态到localStorage
            saveToStorage(timeRemaining, totalElapsed, totalEstimated)

            // ESC退出时保存会话数据和剩余时间
            await Promise.all([saveSessionData(), saveTaskStatus()])
            setIsRunning(false)
            window.history.back()
          }
        } else {
          window.history.back()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  })

  // 清理定时器 - 组件卸载时保存数据
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 组件卸载时如果正在运行，保存状态和数据
      if (isRunning && sessionStartTime.current) {
        // 保存当前状态到localStorage
        saveToStorage(timeRemaining, totalElapsed, totalEstimated)

        // 保存会话数据和剩余时间
        Promise.all([saveSessionData(), saveTaskStatus()])
      }
    }
  }, [])

  // 在组件挂载时检查是否有恢复的状态
  useEffect(() => {
    const restoredState = restoreFromStorage()
    if (restoredState) {
      console.log('已从localStorage恢复计时器状态')
    }
  }, [])

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
      {/* 上部区域 - 倒计时显示 */}
      <div className="flex flex-col items-center space-y-8 mb-16">
        {/* 时间显示框 */}
        <div className="bg-slate-800/80 backdrop-blur-xl text-white p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative">
          <div className="text-8xl font-light tracking-wider text-center">
            {formatTime(timeRemaining)}
          </div>

          {/* 显示进度信息 */}
          {(originalRemaining > 0 || originalElapsed > 0) && (
            <div className="absolute -top-2 -right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              继续任务
            </div>
          )}
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
      </div>
    </div>
  )
}

function FocusContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get('id')
  const remainingMinutes = Number(searchParams.get('remaining')) || 0
  const elapsedMinutes = Number(searchParams.get('elapsed')) || 0

  // 调试信息
  console.log('Focus页面参数:', {
    taskId,
    remainingMinutes,
    elapsedMinutes,
  })

  // 任务信息状态
  const [taskInfo, setTaskInfo] = useState<{
    title: string
    duration: string
  } | null>(null)
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
            title: task.title,
            duration: task.estimatedDuration
              ? `${Math.round(task.estimatedDuration / 60)}分钟`
              : '25分钟',
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
  const parseDurationToMinutes = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)分钟/)
    return match ? parseInt(match[1]) : 25
  }

  const handleTimerComplete = () => {
    console.log('专注时段完成')
  }

  // 处理导航点击，添加确认逻辑
  const handleNavigation = (url: string) => {
    // 这里可以检查计时器状态，但由于计时器在子组件中，
    // 我们依赖子组件的页面离开确认逻辑
    window.location.href = url
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
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="text-xl font-bold text-slate-300">FOCUS</div>

        <nav className="bg-slate-800 rounded-2xl p-1.5">
          <div className="flex space-x-2">
            <button
              onClick={() => handleNavigation('/')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </button>
            <div className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              Focus
            </div>
            <button
              onClick={() => handleNavigation('/calendar')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              History
            </button>
          </div>
        </nav>

        {/* 右上角显示任务信息 */}
        <div className="flex items-center space-x-4">
          {taskInfo && (
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>📝</span>
              <span>{taskInfo.title}</span>
              <span className="text-slate-400">({taskInfo.duration})</span>
            </div>
          )}

          {!taskId && (
            <div className="bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>🧘</span>
              <span>练习模式</span>
              <span className="text-amber-400">(不会保存进度)</span>
            </div>
          )}

          {/* 显示进度信息 */}
          {(remainingMinutes > 0 || elapsedMinutes > 0) && (
            <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-xs border border-blue-500/30">
              继续进度:{' '}
              {Math.round(
                (elapsedMinutes / (remainingMinutes + elapsedMinutes)) * 100
              )}
              %
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
              remainingMinutes > 0
                ? remainingMinutes
                : taskInfo
                ? parseDurationToMinutes(taskInfo.duration)
                : 25
            }
            originalRemaining={remainingMinutes}
            originalElapsed={elapsedMinutes}
            taskId={taskId}
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
              ESC
            </div>
            <span className="text-slate-400 text-sm">安全退出</span>
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
