'use client'

import React, {
  Suspense,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  initializeTimer,
  startTimer,
  pauseTimer,
  updateTime,
  syncLiveData,
  completeTimer,
} from '@/app/slices/timerSlice'
import {
  setTaskInfo,
  setTaskProgress,
  updateTaskProgress,
  setLoading,
} from '@/app/slices/taskInfoSlice'

function ModernTimer({
  initialTime = 25,
  originalRemaining = 0,
  originalElapsed = 0,
  taskId,
  onComplete,
  liveTaskProgress,
}: {
  initialTime: number
  originalRemaining?: number
  originalElapsed?: number
  taskId?: string | null
  onComplete?: () => void
  liveTaskProgress?: {
    remainingMinutes: number
    executedMinutes: number
    progressPercentage: number
    remainingSeconds?: number
    executedSeconds?: number
    estimatedSeconds?: number
  } | null
}) {
  const dispatch = useDispatch()
  const timerState = useSelector((state: RootState) => state.timer)
  const { isRunning, hasInitializedFromLiveData, lastSyncTime } = timerState

  // 使用本地状态管理实时倒计时，避免每秒更新Redux
  const [localTimeRemaining, setLocalTimeRemaining] = useState(0)
  const [localTotalElapsed, setLocalTotalElapsed] = useState(0)
  const [localTotalEstimated, setLocalTotalEstimated] = useState(0)

  // 运行时使用本地状态，暂停时使用Redux状态
  const timeRemaining = isRunning
    ? localTimeRemaining
    : timerState.timeRemaining
  const totalElapsed = isRunning ? localTotalElapsed : timerState.totalElapsed
  const totalEstimated = isRunning
    ? localTotalEstimated
    : timerState.totalEstimated

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<Date | null>(null)

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
        console.log('Restored state from localStorage:', parsed)

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
            }
          } else {
            console.log('localStorage data expired, clearing')
            localStorage.removeItem(storageKey)
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore localStorage state:', error)
    }

    return null
  }

  // 节流控制：避免频繁写入localStorage
  const lastSaveTimeRef = useRef(0)
  const SAVE_THROTTLE_MS = 10000 // 10秒内最多保存一次

  // 保存状态到localStorage（带节流控制）
  const saveToStorage = useCallback(
    (
      timeRemaining: number,
      totalElapsed: number,
      totalEstimated: number,
      force = false
    ) => {
      if (typeof window === 'undefined') return

      const now = Date.now()
      // 节流控制：除非强制保存，否则10秒内最多保存一次
      if (!force && now - lastSaveTimeRef.current < SAVE_THROTTLE_MS) {
        console.log('⏭️ Skip localStorage save (throttled)')
        return
      }

      try {
        const storageKey = getStorageKey()
        const stateToSave = {
          timeRemaining,
          totalElapsed,
          totalEstimated,
          taskId,
          lastSaveTime: now,
        }

        localStorage.setItem(storageKey, JSON.stringify(stateToSave))
        lastSaveTimeRef.current = now
        console.log('💾 State saved to localStorage:', stateToSave)
      } catch (error) {
        console.error('Failed to save state to localStorage:', error)
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
      console.log('Cleared localStorage state')
    } catch (error) {
      console.error('Failed to clear localStorage state:', error)
    }
  }, [taskId])

  // 初始化计时器状态
  useEffect(() => {
    // 优先从localStorage恢复，否则使用计算的初始值
    const restoredState = restoreFromStorage()
    const initialValues = restoredState || calculateInitialValues()

    // 设置Redux状态
    dispatch(
      initializeTimer({
        timeRemaining: initialValues.timeRemaining,
        totalElapsed: initialValues.totalElapsed,
        totalEstimated: initialValues.totalEstimated,
        taskId: taskId || null,
        initialTime,
        originalRemaining,
        originalElapsed,
      })
    )

    // 同时设置本地状态
    setLocalTimeRemaining(initialValues.timeRemaining)
    setLocalTotalElapsed(initialValues.totalElapsed)
    setLocalTotalEstimated(initialValues.totalEstimated)
  }, [dispatch, taskId, initialTime, originalRemaining, originalElapsed])

  // 同步外部任务进度数据 - 改进版本，避免干扰用户操作
  useEffect(() => {
    if (liveTaskProgress && taskId) {
      // console.log('🔄 收到实时任务进度:', liveTaskProgress)

      // 计算新的时间状态，优先使用秒级数据
      const newRemainingSeconds = liveTaskProgress.remainingSeconds
        ? liveTaskProgress.remainingSeconds
        : liveTaskProgress.remainingMinutes * 60
      const newElapsedSeconds = liveTaskProgress.executedSeconds
        ? liveTaskProgress.executedSeconds
        : liveTaskProgress.executedMinutes * 60
      const newTotalEstimated = newRemainingSeconds + newElapsedSeconds

      // 只在以下情况才同步数据：
      // 1. 首次初始化且计时器未运行
      // 2. 距离上次同步超过5分钟且计时器未运行
      const now = Date.now()
      const shouldSync =
        (!hasInitializedFromLiveData && !isRunning) ||
        (now - lastSyncTime > 5 * 60 * 1000 && !isRunning)

      if (shouldSync) {
        // 检查数据变化是否显著（避免微小变化导致的重置）
        const timeDifference = Math.abs(timeRemaining - newRemainingSeconds)

        // 只有当时间差超过5秒时才同步（提高同步精度）
        if (timeDifference > 5 || !hasInitializedFromLiveData) {
          dispatch(
            syncLiveData({
              remainingSeconds: newRemainingSeconds,
              elapsedSeconds: newElapsedSeconds,
              totalEstimated: newTotalEstimated,
            })
          )

          // 只在首次初始化时保存到localStorage，避免频繁存储
          if (!hasInitializedFromLiveData) {
            saveToStorage(
              newRemainingSeconds,
              newElapsedSeconds,
              newTotalEstimated
            )
            console.log('💾 Initial state saved to localStorage')
          }

          console.log(
            `✅ Progress synced: ${liveTaskProgress.remainingMinutes} minutes remaining, ${liveTaskProgress.executedMinutes} minutes used`
          )
        } else {
          console.log('⏭️ Skip sync: time difference less than 5 seconds')
        }
      } else {
        // console.log('⏭️ Skip sync: timer running or too soon since last sync')
      }
    }
  }, [
    liveTaskProgress,
    taskId,
    isRunning,
    hasInitializedFromLiveData,
    lastSyncTime,
    timeRemaining,
    dispatch,
    saveToStorage,
  ])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  // 计算当前总进度百分比 - 结合本地计时器和API数据
  const currentProgress = useMemo(() => {
    // 计算本地计时器的实时进度
    const localProgress = Math.min((totalElapsed / totalEstimated) * 100, 100)

    // 如果计时器正在运行，优先使用本地进度确保实时性
    if (isRunning) {
      return localProgress
    }

    // 如果计时器暂停，结合API数据和本地进度
    if (liveTaskProgress?.progressPercentage !== undefined) {
      // 如果本地进度比API进度高，说明用户在当前会话中有新进展
      // 使用较高的进度值
      return Math.max(localProgress, liveTaskProgress.progressPercentage)
    }

    // 默认使用本地进度
    return localProgress
  }, [
    totalElapsed,
    totalEstimated,
    isRunning,
    liveTaskProgress?.progressPercentage,
  ])

  // 保存当前会话数据到后端（优化版本）
  const saveSessionData = useCallback(async (): Promise<boolean> => {
    if (!taskId || !sessionStartTime.current) {
      console.log('🚫 No taskId or session start time, skipping save')
      return false
    }

    const sessionDuration = Math.floor(
      (Date.now() - sessionStartTime.current.getTime()) / 1000
    )

    console.log(`📝 Saving work session: ${sessionDuration} seconds`)

    // 简化版本：只发送duration，不再发送时间戳
    const endpoint = `/api/tasks/${taskId}/session`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒超时

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: sessionDuration,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ ${result.message || 'Session saved successfully'}`)
        return result.saved !== false // 默认认为保存成功
      } else {
        console.warn(
          `⚠️ API ${endpoint} failed: ${response.status} ${response.statusText}`
        )

        // 404说明任务不存在，不需要重试
        if (response.status === 404) {
          console.log('📝 Task does not exist, skipping session save')
          return false
        }
      }
    } catch (error) {
      console.warn(`⚠️ Session save request failed ${endpoint}:`, error)
    }

    // API调用失败，尝试本地备份
    try {
      const backupKey = `session-backup-${taskId}-${Date.now()}`
      const backupData = {
        duration: sessionDuration,
        timestamp: new Date().toISOString(),
      }
      localStorage.setItem(backupKey, JSON.stringify(backupData))
      console.log('💾 Session saved to local backup')
    } catch (storageError) {
      console.warn('⚠️ Local backup failed:', storageError)
    }

    return false
  }, [taskId])

  // 专门处理任务完成的函数（优化版本 + 错误处理）
  const completeTask = useCallback(async () => {
    if (!taskId) {
      console.log('🎮 Practice mode completed, no need to save task data')
      return
    }

    // 简单的网络连接检查
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('🌐 Offline status detected, attempting local save')

      // 离线时直接保存到本地备份
      try {
        const finalDuration = sessionStartTime.current
          ? Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000)
          : 0

        if (finalDuration > 0) {
          const backupKey = `task-completion-backup-${taskId}-${Date.now()}`
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              taskId,
              duration: finalDuration,
              completedAt: new Date().toISOString(),
              totalMinutes: Math.floor(totalEstimated / 60),
            })
          )
          console.log(
            '💾 Completion data saved to local backup in offline mode'
          )
        }
      } catch (error) {
        console.warn('⚠️ Offline backup failed:', error)
      }

      alert(
        '⚠️ Network connection unavailable, task completion data has been saved locally.\nPlease reopen the app when you have network to sync data.'
      )
      return
    }

    // 准备最终的会话时长（如果有正在进行的会话）
    let finalDuration = 0
    if (sessionStartTime.current) {
      const sessionDuration = Math.floor(
        (Date.now() - sessionStartTime.current.getTime()) / 1000
      )

      if (sessionDuration > 0) {
        finalDuration = sessionDuration
        console.log(
          `📝 Preparing to save final session: ${sessionDuration} seconds`
        )
      }
    }

    // 尝试多个API端点和重试机制
    const apiEndpoints = [`/api/tasks/${taskId}/complete`]

    let lastError = null
    let success = false

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🎯 Attempting to complete task: ${taskId} (${endpoint})`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            duration: finalDuration,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          console.log(
            `🎉 Task completed successfully: ${result.title || taskId}`
          )

          // 计算总执行时间用于显示
          const totalMinutes = Math.floor(totalEstimated / 60)
          console.log(`⏰ Total focus time: ${totalMinutes} minutes`)

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

          console.warn(`⚠️ API ${endpoint} failed:`, lastError)

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
        if (finalDuration > 0) {
          const backupKey = `task-completion-backup-${taskId}-${Date.now()}`
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              taskId,
              duration: finalDuration,
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
  const startTimerHandler = useCallback(() => {
    console.log('Starting timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    sessionStartTime.current = new Date()

    // 启动时从Redux同步到本地状态
    setLocalTimeRemaining(timerState.timeRemaining)
    setLocalTotalElapsed(timerState.totalElapsed)
    setLocalTotalEstimated(timerState.totalEstimated)

    dispatch(startTimer())

    // 每秒只更新本地状态，不更新Redux
    intervalRef.current = setInterval(() => {
      setLocalTimeRemaining((prev) => Math.max(0, prev - 1))
      setLocalTotalElapsed((prev) => prev + 1)
    }, 1000)
  }, [
    dispatch,
    timerState.timeRemaining,
    timerState.totalElapsed,
    timerState.totalEstimated,
  ])

  // 处理计时器完成
  useEffect(() => {
    if (localTimeRemaining <= 0 && isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 完成时同步最终状态到Redux
      dispatch(
        updateTime({
          remaining: 0,
          elapsed: localTotalElapsed,
        })
      )
      dispatch(completeTimer())

      // 任务完成时清除localStorage状态
      clearStorage()

      // 任务完成时执行完成处理
      completeTask()
      onComplete?.()
    }
  }, [
    localTimeRemaining,
    localTotalElapsed,
    isRunning,
    dispatch,
    clearStorage,
    completeTask,
    onComplete,
  ])

  // 暂停计时器 - 手动暂停时保存数据
  const pauseTimerHandler = useCallback(async () => {
    console.log('Pausing timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null

      // 暂停时将本地状态同步到Redux
      dispatch(
        updateTime({
          remaining: localTimeRemaining,
          elapsed: localTotalElapsed,
        })
      )
      dispatch(pauseTimer())

      // 暂停时强制保存当前状态到localStorage
      saveToStorage(
        localTimeRemaining,
        localTotalElapsed,
        localTotalEstimated,
        true
      )

      // 手动暂停时保存会话数据
      await saveSessionData()
    }
  }, [
    dispatch,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
    saveToStorage,
    saveSessionData,
  ])

  // 播放/暂停切换
  const toggleTimer = useCallback(() => {
    console.log('Toggle timer, current state:', isRunning)

    if (isRunning) {
      pauseTimerHandler()
    } else {
      startTimerHandler()
    }
  }, [isRunning, pauseTimerHandler, startTimerHandler])

  // 页面离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        // 页面关闭时强制保存当前状态到localStorage
        const currentTimeRemaining = isRunning
          ? localTimeRemaining
          : timeRemaining
        const currentTotalElapsed = isRunning ? localTotalElapsed : totalElapsed
        const currentTotalEstimated = isRunning
          ? localTotalEstimated
          : totalEstimated

        saveToStorage(
          currentTimeRemaining,
          currentTotalElapsed,
          currentTotalEstimated,
          true
        )

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
          // 页面切换时将本地状态同步到Redux并保存
          const currentTimeRemaining = isRunning
            ? localTimeRemaining
            : timeRemaining
          const currentTotalElapsed = isRunning
            ? localTotalElapsed
            : totalElapsed
          const currentTotalEstimated = isRunning
            ? localTotalEstimated
            : totalEstimated

          if (isRunning) {
            dispatch(
              updateTime({
                remaining: localTimeRemaining,
                elapsed: localTotalElapsed,
              })
            )
          }

          saveToStorage(
            currentTimeRemaining,
            currentTotalElapsed,
            currentTotalEstimated,
            true
          )

          // 页面切换时保存会话数据并暂停
          await saveSessionData()
          dispatch(pauseTimer())
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
  }, [
    isRunning,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
    timeRemaining,
    totalElapsed,
    totalEstimated,
    saveToStorage,
    saveSessionData,
    dispatch,
  ])

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
            'Timer is running, are you sure you want to exit? Timer will be paused when exiting.'
          )
          if (confirmed) {
            // ESC退出时将本地状态同步到Redux并保存
            if (isRunning) {
              dispatch(
                updateTime({
                  remaining: localTimeRemaining,
                  elapsed: localTotalElapsed,
                })
              )
            }

            const currentTimeRemaining = isRunning
              ? localTimeRemaining
              : timeRemaining
            const currentTotalElapsed = isRunning
              ? localTotalElapsed
              : totalElapsed
            const currentTotalEstimated = isRunning
              ? localTotalEstimated
              : totalEstimated

            saveToStorage(
              currentTimeRemaining,
              currentTotalElapsed,
              currentTotalEstimated,
              true
            )

            // Save session data when exiting with ESC
            await saveSessionData()
            dispatch(pauseTimer())
            window.history.back()
          }
        } else {
          window.history.back()
        }
      }
    },
    [
      isRunning,
      localTimeRemaining,
      localTotalElapsed,
      localTotalEstimated,
      timeRemaining,
      totalElapsed,
      totalEstimated,
      toggleTimer,
      saveToStorage,
      saveSessionData,
      dispatch,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  // 保存最新状态的ref，避免闭包陷阱
  const latestStateRef = useRef({
    isRunning,
    timeRemaining,
    totalElapsed,
    totalEstimated,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
  })
  useEffect(() => {
    latestStateRef.current = {
      isRunning,
      timeRemaining,
      totalElapsed,
      totalEstimated,
      localTimeRemaining,
      localTotalElapsed,
      localTotalEstimated,
    }
  }, [
    isRunning,
    timeRemaining,
    totalElapsed,
    totalEstimated,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
  ])

  // 清理定时器 - 组件卸载时保存数据
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // 使用ref获取最新状态，避免闭包陷阱
      const {
        isRunning: currentIsRunning,
        timeRemaining: currentTimeRemaining,
        totalElapsed: currentTotalElapsed,
        totalEstimated: currentTotalEstimated,
        localTimeRemaining: currentLocalTimeRemaining,
        localTotalElapsed: currentLocalTotalElapsed,
        localTotalEstimated: currentLocalTotalEstimated,
      } = latestStateRef.current

      // 只在计时器运行时才保存状态和会话数据
      if (currentIsRunning && sessionStartTime.current) {
        console.log(
          '🧹 Component unmounting while timer running, saving state...'
        )

        // 使用本地状态如果正在运行，否则使用Redux状态
        const finalTimeRemaining = currentIsRunning
          ? currentLocalTimeRemaining
          : currentTimeRemaining
        const finalTotalElapsed = currentIsRunning
          ? currentLocalTotalElapsed
          : currentTotalElapsed
        const finalTotalEstimated = currentIsRunning
          ? currentLocalTotalEstimated
          : currentTotalEstimated

        saveToStorage(
          finalTimeRemaining,
          finalTotalElapsed,
          finalTotalEstimated,
          true // 组件卸载时强制保存
        )
        saveSessionData()
      }
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
        </div>
      </div>

      {/* 中部区域 - 进度条 */}
      <div className="flex flex-col justify-start max-w-4xl mx-auto w-full">
        <div className="relative">
          {/* 进度文字和百分比 */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-2xl font-light text-slate-200 tracking-wider">
              Task Progress
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
      <div className="flex flex-col items-center space-y-6 mt-auto mb-12">
        {/* 主要控制按钮 */}
        <div className="flex items-center space-x-6">
          <button
            onClick={toggleTimer}
            className={`w-24 h-24 rounded-full border-4 transition-all duration-300 flex items-center justify-center text-2xl font-light tracking-wider ${
              isRunning
                ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'border-green-500 bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}>
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>

        {/* 快捷键提示 */}
        <div className="text-slate-400 text-sm text-center">
          <div>
            Press <kbd className="bg-slate-700 px-2 py-1 rounded">Space</kbd> to
            play/pause
          </div>
          <div>
            Press <kbd className="bg-slate-700 px-2 py-1 rounded">Esc</kbd> to
            exit
          </div>
        </div>
      </div>
    </div>
  )
}

function FocusContent() {
  const dispatch = useDispatch()
  const { taskInfo, taskProgress, isLoading } = useSelector(
    (state: RootState) => state.taskInfo
  )

  const searchParams = useSearchParams()
  const taskId = searchParams.get('id')
  const remainingMinutes = Number(searchParams.get('remaining')) || 0
  const elapsedMinutes = Number(searchParams.get('elapsed')) || 0

  // Debug info
  console.log('Focus page parameters:', {
    taskId,
    remainingMinutes,
    elapsedMinutes,
  })

  // 从API获取任务信息和每日更新的进度数据
  useEffect(() => {
    const fetchTaskInfo = async () => {
      if (!taskId) {
        dispatch(setLoading(false))
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
          console.log('📋 Retrieved task info:', task)

          dispatch(
            setTaskInfo({
              title: task.title,
              duration: task.estimatedDuration
                ? `${Math.round(task.estimatedDuration / 60)}分钟`
                : '25分钟',
              status: task.status,
              completed: task.status === 'completed' || task.completed === true,
            })
          )
        } else {
          console.warn('⚠️ Task does not exist or has been deleted')
          dispatch(setTaskInfo(null))
        }

        // 处理每日更新的剩余时间数据
        if (
          remainingResponse.status === 'fulfilled' &&
          remainingResponse.value.ok
        ) {
          const remainingData = await remainingResponse.value.json()
          console.log(
            '⏰ Retrieved daily updated remaining time:',
            remainingData
          )

          dispatch(
            updateTaskProgress({
              remainingMinutes: remainingData.remainingMinutes,
              executedMinutes: remainingData.executedMinutes,
              remainingSeconds: remainingData.remainingSeconds,
              executedSeconds: remainingData.executedSeconds,
              estimatedSeconds: remainingData.estimatedSeconds,
            })
          )
        } else {
          console.warn('⚠️ Failed to get remaining time, using URL parameters')
          dispatch(
            updateTaskProgress({
              remainingMinutes: remainingMinutes,
              executedMinutes: elapsedMinutes,
            })
          )
        }

        // 处理每日更新的进度数据
        if (
          progressResponse.status === 'fulfilled' &&
          progressResponse.value.ok
        ) {
          const progressData = await progressResponse.value.json()
          console.log('📊 获取到每日更新的进度:', progressData)

          dispatch(
            updateTaskProgress({
              progressPercentage: progressData.progressPercentage,
            })
          )
        } else {
          console.warn('⚠️ 获取进度失败，使用默认值')
          dispatch(
            updateTaskProgress({
              progressPercentage: 0,
            })
          )
        }
      } catch (error) {
        console.error('获取任务信息失败:', error)
        dispatch(setTaskInfo(null))
        // 使用URL参数作为fallback
        dispatch(
          setTaskProgress({
            remainingMinutes: remainingMinutes,
            executedMinutes: elapsedMinutes,
            progressPercentage: 0,
          })
        )
      } finally {
        dispatch(setLoading(false))
      }
    }

    fetchTaskInfo()

    // 移除定时刷新，改为只在初始化时获取一次数据
    // 专注时使用本地计时器，避免频繁API调用
  }, [taskId, remainingMinutes, elapsedMinutes, dispatch])

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
            const [taskResponse, progressResponse] = await Promise.allSettled([
              fetch(`/api/tasks/${taskId}`),
              fetch(`/api/tasks/${taskId}/progress`),
            ])

            if (taskResponse.status === 'fulfilled' && taskResponse.value.ok) {
              const task = await taskResponse.value.json()
              dispatch(
                setTaskInfo({
                  title: task.title,
                  duration: task.estimatedDuration
                    ? `${Math.round(task.estimatedDuration / 60)}分钟`
                    : '25分钟',
                  status: task.status,
                  completed:
                    task.status === 'completed' || task.completed === true,
                })
              )
            }

            if (
              progressResponse.status === 'fulfilled' &&
              progressResponse.value.ok
            ) {
              const progressData = await progressResponse.value.json()
              dispatch(
                updateTaskProgress({
                  progressPercentage: progressData.progressPercentage,
                })
              )
            }
          } catch (error) {
            console.error('刷新任务信息失败:', error)
          }
        }
        fetchUpdatedTaskInfo()
      }, 2000)
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
          <div className="text-slate-400">Loading task info...</div>
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
              <span>Practice Mode</span>
              <span className="text-amber-400">(Progress not saved)</span>
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
                  Task Completed
                </h1>
                <p className="text-xl text-slate-400 mb-8">
                  🎉 Congratulations! &ldquo;{taskInfo.title}&rdquo; has been
                  completed successfully
                </p>
                <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/50 max-w-md mx-auto">
                  <div className="text-slate-300 mb-2">Task Details</div>
                  <div className="text-slate-400 text-sm">
                    Estimated Duration: {taskInfo.duration}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Status: Completed ✅
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleBackToHome}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-medium text-xl transition-all duration-200 shadow-lg">
                  Back to Home
                </button>
                <button
                  onClick={() => (window.location.href = '/stats')}
                  className="bg-slate-800/80 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 transition-all duration-200 shadow-lg border border-slate-700/50">
                  View Stats
                </button>
              </div>
            </div>
          ) : (
            // 正常的计时器显示
            <ModernTimer
              initialTime={
                // 优先使用秒级数据转换为分钟，提高精度
                taskProgress?.remainingSeconds !== undefined
                  ? taskProgress.remainingSeconds / 60
                  : (taskProgress?.remainingMinutes ?? 0) > 0
                  ? taskProgress?.remainingMinutes ?? 0
                  : remainingMinutes > 0
                  ? remainingMinutes
                  : taskInfo
                  ? parseDurationToMinutes(taskInfo.duration)
                  : 25
              }
              originalRemaining={
                // 优先使用秒级数据转换为分钟
                taskProgress?.remainingSeconds !== undefined
                  ? taskProgress.remainingSeconds / 60
                  : taskProgress?.remainingMinutes ?? remainingMinutes
              }
              originalElapsed={
                // 优先使用秒级数据转换为分钟
                taskProgress?.executedSeconds !== undefined
                  ? taskProgress.executedSeconds / 60
                  : taskProgress?.executedMinutes ?? elapsedMinutes
              }
              taskId={taskId}
              onComplete={handleTimerComplete}
              liveTaskProgress={taskProgress}
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
            <span className="text-slate-400 text-sm">Start/Pause</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
              ESC
            </div>
            <span className="text-slate-400 text-sm">Safe Exit</span>
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
            <div className="text-slate-400">Loading focus environment...</div>
          </div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
