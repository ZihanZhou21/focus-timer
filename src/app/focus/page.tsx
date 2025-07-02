'use client'

import React, {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
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
    // 确保最短时间为30秒
    const minTimeInMinutes = 0.5 // 30秒 = 0.5分钟

    if (originalRemaining > 0 && originalElapsed > 0) {
      // 从任务详情跳转：使用真实的剩余时间和已用时间
      const adjustedRemaining = Math.max(originalRemaining, minTimeInMinutes)
      return {
        timeRemaining: adjustedRemaining * 60, // 剩余时间（秒）
        totalElapsed: originalElapsed * 60, // 已用时间（秒）
        totalEstimated: (adjustedRemaining + originalElapsed) * 60, // 总预估时间（秒）
      }
    } else {
      // 新任务：使用完整时间，确保不少于30秒
      const adjustedInitialTime = Math.max(initialTime, minTimeInMinutes)
      return {
        timeRemaining: adjustedInitialTime * 60,
        totalElapsed: 0,
        totalEstimated: adjustedInitialTime * 60,
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
  const saveToStorage = useCallback(
    (timeRemaining: number, totalElapsed: number, totalEstimated: number) => {
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
    },
    [taskId]
  )

  // 清除localStorage状态
  const clearStorage = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const storageKey = getStorageKey()
      localStorage.removeItem(storageKey)
      console.log('已清除localStorage状态')
    } catch (error) {
      console.error('清除localStorage状态失败:', error)
    }
  }, [taskId])

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

  // 保存当前会话数据到后端（优化版本）
  const saveSessionData = useCallback(async (): Promise<boolean> => {
    if (!taskId || !sessionStartTime.current) {
      console.log('🚫 无taskId或会话开始时间，跳过保存')
      return false
    }

    const sessionDuration = Math.floor(
      (Date.now() - sessionStartTime.current.getTime()) / 1000
    )

    const timeLogEntry = {
      startTime: sessionStartTime.current.toISOString(),
      endTime: new Date().toISOString(),
      duration: sessionDuration,
    }

    console.log(`📝 保存工作会话: ${sessionDuration}秒`)

    // 尝试多个API端点
    const apiEndpoints = [
      `/api/tasks/${taskId}/session-v2`,
      `/api/tasks/${taskId}/session`,
    ]

    for (const endpoint of apiEndpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeLog: timeLogEntry,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ ${result.message || '会话保存成功'}`)
          return result.saved !== false // 默认认为保存成功
        } else {
          console.warn(
            `⚠️ API ${endpoint} 失败: ${response.status} ${response.statusText}`
          )

          // 404说明任务不存在，不需要重试
          if (response.status === 404) {
            console.log('📝 任务不存在，跳过会话保存')
            return false
          }
        }
      } catch (error) {
        console.warn(`⚠️ 会话保存请求失败 ${endpoint}:`, error)

        // 继续尝试下一个端点
        continue
      }
    }

    // 所有端点都失败，尝试本地备份
    try {
      const backupKey = `session-backup-${taskId}-${Date.now()}`
      localStorage.setItem(backupKey, JSON.stringify(timeLogEntry))
      console.log('💾 已保存会话到本地备份')
    } catch (storageError) {
      console.warn('⚠️ 本地备份失败:', storageError)
    }

    return false
  }, [taskId])

  // 专门处理任务完成的函数（优化版本 + 错误处理）
  const completeTask = useCallback(async () => {
    if (!taskId) {
      console.log('🎮 练习模式完成，无需保存任务数据')
      return
    }

    // 简单的网络连接检查
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('🌐 检测到离线状态，尝试本地保存')

      // 离线时直接保存到本地备份
      try {
        const finalTimeLog = sessionStartTime.current
          ? {
              startTime: sessionStartTime.current.toISOString(),
              endTime: new Date().toISOString(),
              duration: Math.floor(
                (Date.now() - sessionStartTime.current.getTime()) / 1000
              ),
            }
          : null

        if (finalTimeLog) {
          const backupKey = `task-completion-backup-${taskId}-${Date.now()}`
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              taskId,
              finalTimeLog,
              completedAt: new Date().toISOString(),
              totalMinutes: Math.floor(totalEstimated / 60),
            })
          )
          console.log('💾 离线状态下已保存完成数据到本地备份')
        }
      } catch (error) {
        console.warn('⚠️ 离线备份失败:', error)
      }

      alert(
        '⚠️ 网络连接不可用，任务完成数据已保存到本地。\n请稍后在有网络时重新打开应用同步数据。'
      )
      return
    }

    // 准备最终的时间日志条目（如果有正在进行的会话）
    let finalTimeLog = null
    if (sessionStartTime.current) {
      const sessionDuration = Math.floor(
        (Date.now() - sessionStartTime.current.getTime()) / 1000
      )

      if (sessionDuration > 0) {
        finalTimeLog = {
          startTime: sessionStartTime.current.toISOString(),
          endTime: new Date().toISOString(),
          duration: sessionDuration,
        }
        console.log(`📝 准备保存最终会话: ${sessionDuration}秒`)
      }
    }

    // 尝试多个API端点和重试机制
    const apiEndpoints = [
      `/api/tasks/${taskId}/complete-v2`,
      `/api/tasks/${taskId}/complete`,
    ]

    let lastError = null
    let success = false

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🎯 尝试完成任务: ${taskId} (${endpoint})`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            finalTimeLog,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          console.log(`🎉 任务完成成功: ${result.title || taskId}`)

          // 计算总执行时间用于显示
          const totalMinutes = Math.floor(totalEstimated / 60)
          console.log(`⏰ 总专注时间: ${totalMinutes}分钟`)

          // 浏览器通知功能已删除

          success = true
          break
        } else {
          const errorData = await response.json().catch(() => ({}))
          lastError = {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
          }

          console.warn(`⚠️ API ${endpoint} 失败:`, lastError)

          // 404错误说明任务不存在，不需要重试其他端点
          if (response.status === 404) {
            console.log('📝 任务不存在，可能是练习模式或任务已被删除')
            success = true // 认为是成功的，因为任务不存在是正常情况
            break
          }
        }
      } catch (error) {
        lastError = { endpoint, error }
        console.warn(`⚠️ 网络请求失败 ${endpoint}:`, error)

        // 如果是网络错误，继续尝试下一个端点
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.warn('⏱️ 请求超时，尝试下一个端点')
          } else if (error.message.includes('Failed to fetch')) {
            console.warn('🌐 网络连接问题，尝试下一个端点')
          }
        }

        continue
      }
    }

    if (!success) {
      console.error('❌ 所有API端点都失败了:', lastError)

      // 降级处理：即使API失败，也要保存本地状态
      try {
        // 尝试保存会话数据到localStorage作为备份
        if (finalTimeLog) {
          const backupKey = `task-completion-backup-${taskId}-${Date.now()}`
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              taskId,
              finalTimeLog,
              completedAt: new Date().toISOString(),
              totalMinutes: Math.floor(totalEstimated / 60),
            })
          )
          console.log('💾 已保存完成数据到本地备份')
        }
      } catch (storageError) {
        console.warn('⚠️ 本地备份也失败了:', storageError)
      }

      // 显示用户友好的错误提示
      if (typeof window !== 'undefined') {
        const totalMinutes = Math.floor(totalEstimated / 60)
        alert(
          `⚠️ 网络连接问题，无法保存任务完成状态。\n但您的专注时间 ${totalMinutes} 分钟已记录在本地。\n请稍后检查网络连接。`
        )
      }
    }
  }, [taskId, totalEstimated])

  // 开始计时器
  const startTimer = useCallback(() => {
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

          // 任务完成时执行完成处理
          completeTask()
          onComplete?.()
          return 0
        }
        return newTimeRemaining
      })

      setTotalElapsed((prev) => prev + 1)
    }, 1000)
  }, [totalEstimated, clearStorage, completeTask, onComplete])

  // 暂停计时器 - 手动暂停时保存数据
  const pauseTimer = useCallback(async () => {
    console.log('Pausing timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setIsRunning(false)

      // 保存当前状态到localStorage
      saveToStorage(timeRemaining, totalElapsed, totalEstimated)

      // 手动暂停时保存会话数据
      await saveSessionData()
    }
  }, [
    timeRemaining,
    totalElapsed,
    totalEstimated,
    saveToStorage,
    saveSessionData,
  ])

  // 播放/暂停切换
  const toggleTimer = useCallback(() => {
    console.log('Toggle timer, current state:', isRunning)

    if (isRunning) {
      pauseTimer()
    } else {
      startTimer()
    }
  }, [isRunning, pauseTimer, startTimer])

  // 页面离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        // 保存当前状态到localStorage
        saveToStorage(timeRemaining, totalElapsed, totalEstimated)

        // 页面刷新/关闭时保存会话数据
        saveSessionData()
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

          // 页面切换时保存会话数据并暂停
          await saveSessionData()
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
  }, [isRunning]) // 只依赖isRunning，函数内部会使用最新的值

  // 监听键盘快捷键
  const handleKeyPress = useCallback(
    async (e: KeyboardEvent) => {
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

            // ESC退出时保存会话数据
            await saveSessionData()
            setIsRunning(false)
            window.history.back()
          }
        } else {
          window.history.back()
        }
      }
    },
    [
      isRunning,
      timeRemaining,
      totalElapsed,
      totalEstimated,
      toggleTimer,
      saveToStorage,
      saveSessionData,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

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

        // 保存会话数据
        saveSessionData()
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
          {/* 继续任务角标已删除 */}
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
    status: string
    completed: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 每日更新的任务进度和剩余时间状态
  const [taskProgress, setTaskProgress] = useState<{
    remainingMinutes: number
    executedMinutes: number
    progressPercentage: number
  } | null>(null)

  // 从API获取任务信息和每日更新的进度数据
  useEffect(() => {
    const fetchTaskInfo = async () => {
      if (!taskId) {
        setIsLoading(false)
        return
      }

      try {
        // 并行获取任务基本信息和每日更新的进度数据
        const [taskResponse, remainingResponse, progressResponse] =
          await Promise.allSettled([
            fetch(`/api/tasks/${taskId}`),
            fetch(`/api/tasks/${taskId}/remaining`),
            fetch(`/api/tasks/${taskId}/progress`),
          ])

        // 处理任务基本信息
        if (taskResponse.status === 'fulfilled' && taskResponse.value.ok) {
          const task = await taskResponse.value.json()
          console.log('📋 获取到任务信息:', task)

          setTaskInfo({
            title: task.title,
            duration: task.estimatedDuration
              ? `${Math.round(task.estimatedDuration / 60)}分钟`
              : '25分钟',
            status: task.status,
            completed: task.status === 'completed' || task.completed === true,
          })
        } else {
          console.warn('⚠️ 任务不存在或已被删除')
          setTaskInfo(null)
        }

        // 处理每日更新的剩余时间数据
        if (
          remainingResponse.status === 'fulfilled' &&
          remainingResponse.value.ok
        ) {
          const remainingData = await remainingResponse.value.json()
          console.log('⏰ 获取到每日更新的剩余时间:', remainingData)

          setTaskProgress((prev) => ({
            remainingMinutes: remainingData.remainingMinutes,
            executedMinutes: remainingData.executedMinutes,
            progressPercentage: prev?.progressPercentage ?? 0,
          }))
        } else {
          console.warn('⚠️ 获取剩余时间失败，使用URL参数')
          setTaskProgress((prev) => ({
            remainingMinutes: remainingMinutes,
            executedMinutes: elapsedMinutes,
            progressPercentage: prev?.progressPercentage ?? 0,
          }))
        }

        // 处理每日更新的进度数据
        if (
          progressResponse.status === 'fulfilled' &&
          progressResponse.value.ok
        ) {
          const progressData = await progressResponse.value.json()
          console.log('📊 获取到每日更新的进度:', progressData)

          setTaskProgress((prev) => ({
            remainingMinutes: prev?.remainingMinutes ?? remainingMinutes,
            executedMinutes: prev?.executedMinutes ?? elapsedMinutes,
            progressPercentage: progressData.progressPercentage,
          }))
        } else {
          console.warn('⚠️ 获取进度失败，使用默认值')
          setTaskProgress((prev) => ({
            remainingMinutes: prev?.remainingMinutes ?? remainingMinutes,
            executedMinutes: prev?.executedMinutes ?? elapsedMinutes,
            progressPercentage: 0,
          }))
        }
      } catch (error) {
        console.error('获取任务信息失败:', error)
        setTaskInfo(null)
        // 使用URL参数作为fallback
        setTaskProgress({
          remainingMinutes: remainingMinutes,
          executedMinutes: elapsedMinutes,
          progressPercentage: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTaskInfo()

    // 设置定时刷新，每30秒更新一次任务进度数据
    const refreshInterval = setInterval(() => {
      if (taskId) {
        const refreshTaskProgress = async () => {
          try {
            const [remainingResponse, progressResponse] =
              await Promise.allSettled([
                fetch(`/api/tasks/${taskId}/remaining`),
                fetch(`/api/tasks/${taskId}/progress`),
              ])

            // 更新剩余时间
            if (
              remainingResponse.status === 'fulfilled' &&
              remainingResponse.value.ok
            ) {
              const remainingData = await remainingResponse.value.json()
              setTaskProgress((prev) => ({
                remainingMinutes: remainingData.remainingMinutes,
                executedMinutes: remainingData.executedMinutes,
                progressPercentage: prev?.progressPercentage ?? 0,
              }))
            }

            // 更新进度
            if (
              progressResponse.status === 'fulfilled' &&
              progressResponse.value.ok
            ) {
              const progressData = await progressResponse.value.json()
              setTaskProgress((prev) => ({
                remainingMinutes: prev?.remainingMinutes ?? remainingMinutes,
                executedMinutes: prev?.executedMinutes ?? elapsedMinutes,
                progressPercentage: progressData.progressPercentage,
              }))
            }
          } catch (error) {
            console.warn('定时刷新任务进度失败:', error)
          }
        }
        refreshTaskProgress()
      }
    }, 30000) // 30秒刷新一次

    // 清理定时器
    return () => {
      clearInterval(refreshInterval)
    }
  }, [taskId, remainingMinutes, elapsedMinutes])

  // 解析时长字符串为分钟数，最短30秒
  const parseDurationToMinutes = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)分钟/)
    const minutes = match ? parseInt(match[1]) : 25
    // 最短时间30秒 = 0.5分钟
    return Math.max(minutes, 0.5)
  }

  const handleTimerComplete = () => {
    console.log('专注时段完成')
    // 任务完成后刷新任务信息，显示最新状态
    if (taskId) {
      setTimeout(() => {
        // 重新获取任务信息和进度数据
        const fetchUpdatedTaskInfo = async () => {
          try {
            const [taskResponse, remainingResponse, progressResponse] =
              await Promise.allSettled([
                fetch(`/api/tasks/${taskId}`),
                fetch(`/api/tasks/${taskId}/remaining`),
                fetch(`/api/tasks/${taskId}/progress`),
              ])

            // 更新任务基本信息
            if (taskResponse.status === 'fulfilled' && taskResponse.value.ok) {
              const task = await taskResponse.value.json()
              setTaskInfo({
                title: task.title,
                duration: task.estimatedDuration
                  ? `${Math.round(task.estimatedDuration / 60)}分钟`
                  : '25分钟',
                status: task.status,
                completed:
                  task.status === 'completed' || task.completed === true,
              })
            }

            // 更新剩余时间
            if (
              remainingResponse.status === 'fulfilled' &&
              remainingResponse.value.ok
            ) {
              const remainingData = await remainingResponse.value.json()
              setTaskProgress((prev) => ({
                remainingMinutes: remainingData.remainingMinutes,
                executedMinutes: remainingData.executedMinutes,
                progressPercentage: prev?.progressPercentage ?? 0,
              }))
            }

            // 更新进度
            if (
              progressResponse.status === 'fulfilled' &&
              progressResponse.value.ok
            ) {
              const progressData = await progressResponse.value.json()
              setTaskProgress((prev) => ({
                remainingMinutes: prev?.remainingMinutes ?? remainingMinutes,
                executedMinutes: prev?.executedMinutes ?? elapsedMinutes,
                progressPercentage: progressData.progressPercentage,
              }))
            }
          } catch (error) {
            console.error('刷新任务状态失败:', error)
          }
        }
        fetchUpdatedTaskInfo()
      }, 1000) // 1秒后刷新状态
    }
  }

  // 处理导航点击，添加确认逻辑
  const handleNavigation = (url: string) => {
    // 这里可以检查计时器状态，但由于计时器在子组件中，
    // 我们依赖子组件的页面离开确认逻辑
    window.location.href = url
  }

  // 返回主页面
  const handleBackToHome = () => {
    window.location.href = '/'
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
              {taskProgress && (
                <span className="text-blue-400 ml-2">
                  📊 {taskProgress.progressPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {!taskId && (
            <div className="bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>🧘</span>
              <span>练习模式</span>
              <span className="text-amber-400">(不会保存进度)</span>
            </div>
          )}

          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* 检查任务是否已完成 */}
          {taskInfo && taskInfo.completed ? (
            // 任务已完成的显示
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h1 className="text-4xl font-light text-white mb-4">
                  任务已完成
                </h1>
                <p className="text-xl text-slate-400 mb-8">
                  🎉 恭喜！「{taskInfo.title}」已成功完成
                </p>
                <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/50 max-w-md mx-auto">
                  <div className="text-slate-300 mb-2">任务详情</div>
                  <div className="text-slate-400 text-sm">
                    预计时长: {taskInfo.duration}
                  </div>
                  <div className="text-slate-400 text-sm">状态: 已完成 ✅</div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleBackToHome}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-medium text-xl transition-all duration-200 shadow-lg">
                  返回主页面
                </button>
                <button
                  onClick={() => (window.location.href = '/stats')}
                  className="bg-slate-800/80 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 transition-all duration-200 shadow-lg border border-slate-700/50">
                  查看统计
                </button>
              </div>
            </div>
          ) : (
            // 正常的计时器显示
            <ModernTimer
              initialTime={
                (taskProgress?.remainingMinutes ?? 0) > 0
                  ? taskProgress?.remainingMinutes ?? 0
                  : remainingMinutes > 0
                  ? remainingMinutes
                  : taskInfo
                  ? parseDurationToMinutes(taskInfo.duration)
                  : 25
              }
              originalRemaining={
                taskProgress?.remainingMinutes ?? remainingMinutes
              }
              originalElapsed={taskProgress?.executedMinutes ?? elapsedMinutes}
              taskId={taskId}
              onComplete={handleTimerComplete}
            />
          )}
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
