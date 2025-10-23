'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  clearFocusTimerState,
  getFocusTimerStorageKey,
  loadFocusTimerState,
  saveFocusTimerState,
} from '@/lib/focus-timer-storage'

export function useFocusTimerLogic({
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
}): {
  timeRemaining: number
  currentProgress: number
  isRunning: boolean
  formatTime: (seconds: number) => string
  toggleTimer: () => void
} {
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
  const calculateInitialValues = useCallback(() => {
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
  }, [initialTime, originalRemaining, originalElapsed])

  const storageKey = useMemo(
    () => getFocusTimerStorageKey(taskId),
    [taskId]
  )

  // 从localStorage恢复状态（移除后台计算功能）
  const restoreFromStorage = useCallback(() => {
    const stored = loadFocusTimerState(storageKey)
    if (stored) {
      console.log('Restored state from localStorage:', stored)
      return {
        timeRemaining: stored.timeRemaining,
        totalElapsed: stored.totalElapsed,
        totalEstimated: stored.totalEstimated,
        wasRunning: stored.wasRunning ?? false,
      }
    }

    return null
  }, [storageKey])

  // 节流控制：避免频繁写入localStorage
  const lastSaveTimeRef = useRef(0)
  const SAVE_THROTTLE_MS = 10000 // 10秒内最多保存一次

  // 保存状态到localStorage（移除时间戳逻辑）
  const saveToStorage = useCallback(
    (
      timeRemainingValue: number,
      totalElapsedValue: number,
      totalEstimatedValue: number,
      force = false
    ) => {
      const now = Date.now()
      // 节流控制：除非强制保存，否则10秒内最多保存一次
      if (!force && now - lastSaveTimeRef.current < SAVE_THROTTLE_MS) {
        console.log('⏭️ Skip localStorage save (throttled)')
        return
      }

      const stateToSave = {
        timeRemaining: timeRemainingValue,
        totalElapsed: totalElapsedValue,
        totalEstimated: totalEstimatedValue,
        lastSaveTime: now,
        // 移除时间戳信息，不再支持后台运行
        wasRunning: false, // 始终保存为暂停状态
      }

      saveFocusTimerState(storageKey, stateToSave)
      lastSaveTimeRef.current = now
      console.log('💾 State saved to localStorage:', stateToSave)
    },
    [storageKey]
  )

  // 清除localStorage状态
  const clearStorage = useCallback(() => {
    clearFocusTimerState(storageKey)
    console.log('Cleared localStorage state')
  }, [storageKey])

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

    // 移除自动恢复运行状态的逻辑，计时器总是以暂停状态开始
  }, [
    dispatch,
    taskId,
    initialTime,
    originalRemaining,
    originalElapsed,
    calculateInitialValues,
    restoreFromStorage,
  ])

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

    let lastError: unknown = null
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
        const finalDurationValue = Math.max(finalDuration, 0)
        if (finalDurationValue > 0) {
          const backupKey = `task-completion-backup-${taskId}-${Date.now()}`
          localStorage.setItem(
            backupKey,
            JSON.stringify({
              taskId,
              duration: finalDurationValue,
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

  // 开始计时器
  const startTimerHandler = useCallback(() => {
    console.log('Starting timer')

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    sessionStartTime.current = new Date()

    // 启动时从Redux同步到本地状态
    const currentTimeRemaining = timerState.timeRemaining
    const currentTotalElapsed = timerState.totalElapsed
    const currentTotalEstimated = timerState.totalEstimated

    setLocalTimeRemaining(currentTimeRemaining)
    setLocalTotalElapsed(currentTotalElapsed)
    setLocalTotalEstimated(currentTotalEstimated)

    dispatch(startTimer())

    // 每秒更新本地状态
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

    sessionStartTime.current = null
  }, [
    dispatch,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
    saveToStorage,
    saveSessionData,
  ])

  // 页面可见性监听：当页面不可见时自动暂停
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        console.log('📱 页面切换/隐藏，自动暂停倒计时')
        pauseTimerHandler()
      }
    }

    const handlePageBlur = () => {
      if (isRunning) {
        console.log('🔄 页面失去焦点，自动暂停倒计时')
        pauseTimerHandler()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handlePageBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handlePageBlur)
    }
  }, [isRunning, pauseTimerHandler])

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

  // 同步外部任务进度数据 - 改进版本，避免干扰用户操作
  useEffect(() => {
    if (liveTaskProgress && taskId) {
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

  // 页面离开确认 - 修改为不支持后台运行
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        // 页面关闭时强制保存当前状态到localStorage并暂停
        const currentTimeRemaining = localTimeRemaining
        const currentTotalElapsed = localTotalElapsed
        const currentTotalEstimated = localTotalEstimated

        saveToStorage(
          currentTimeRemaining,
          currentTotalElapsed,
          currentTotalEstimated,
          true
        )

        // 页面刷新/关闭时保存会话数据
        saveSessionData()

        // 显示提示
        e.preventDefault()
        e.returnValue = '倒计时正在运行中，离开页面将暂停倒计时'
        return '倒计时正在运行中，离开页面将暂停倒计时'
      }
    }

    const handlePopState = () => {
      if (isRunning) {
        console.log('📱 页面切换，自动暂停倒计时并保存状态')
        pauseTimerHandler()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [
    isRunning,
    localTimeRemaining,
    localTotalElapsed,
    localTotalEstimated,
    saveToStorage,
    saveSessionData,
    pauseTimerHandler,
  ])

  // 监听键盘快捷键
  const toggleTimer = useCallback(() => {
    console.log('Toggle timer, current state:', isRunning)

    if (isRunning) {
      void pauseTimerHandler()
    } else {
      startTimerHandler()
    }
  }, [isRunning, pauseTimerHandler, startTimerHandler])

  const handleKeyPress = useCallback(
    async (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        toggleTimer()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        // ESC键安全退出 - 暂停倒计时
        if (isRunning) {
          console.log('🔄 ESC键退出，暂停倒计时并保存状态')
          await pauseTimerHandler()
        }

        // 直接退出
        window.history.back()
      }
    },
    [isRunning, toggleTimer, pauseTimerHandler]
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
        void saveSessionData()
      }
    }
  }, [saveSessionData, saveToStorage])

  // 格式化时间显示
  const formatTime = useCallback((seconds: number) => {
    const totalSeconds = Math.floor(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }, [])

  // 计算当前总进度百分比 - 结合本地计时器和API数据
  const currentProgress = useMemo(() => {
    // 计算本地计时器的实时进度
    const localProgress =
      totalEstimated > 0
        ? Math.min((totalElapsed / totalEstimated) * 100, 100)
        : 0

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
  }, [totalElapsed, totalEstimated, isRunning, liveTaskProgress])

  return {
    timeRemaining,
    currentProgress,
    isRunning,
    formatTime,
    toggleTimer,
  }
}
