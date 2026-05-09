'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  initializeTimer,
  startTimer,
  pauseTimer,
  syncLiveData,
  markElapsedSynced,
} from '@/app/slices/timerSlice'
import {
  getFocusTimerStorageKey,
  loadFocusTimerState,
  saveFocusTimerState,
} from '@/lib/focus-timer-storage'
import { useSaveTaskSessionMutation } from '@/lib/services/tasks-api'

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
    title?: string
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
  const {
    isRunning,
    hasInitializedFromLiveData,
    lastSyncTime,
    timeRemaining,
    totalElapsed,
    totalEstimated,
    taskId: activeTaskId,
    timeRemaining: activeTimeRemaining,
  } = timerState
  const [saveTaskSession] = useSaveTaskSessionMutation()

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

  // 从localStorage恢复状态
  const restoreFromStorage = useCallback(() => {
    const stored = loadFocusTimerState(storageKey)
    if (stored) {
      console.log('Restored state from localStorage:', stored)
      
      // Calculate current remaining if it was running
      let currentTimeRemaining = stored.timeRemaining
      let currentTotalElapsed = stored.totalElapsed
      
      if (stored.wasRunning && stored.expectedEndTime) {
        const now = Date.now()
        currentTimeRemaining = Math.max(0, Math.floor((stored.expectedEndTime - now) / 1000))
        const elapsedDelta = stored.timeRemaining - currentTimeRemaining
        if (elapsedDelta > 0) {
          currentTotalElapsed += elapsedDelta
        }
      }

      return {
        timeRemaining: currentTimeRemaining,
        totalElapsed: currentTotalElapsed,
        totalEstimated: stored.totalEstimated,
        backendSyncedElapsed: stored.backendSyncedElapsed,
        wasRunning: stored.wasRunning ?? false,
        startTime: stored.startTime,
        expectedEndTime: stored.expectedEndTime
      }
    }

    return null
  }, [storageKey])

  // 节流控制：避免频繁写入localStorage
  const lastSaveTimeRef = useRef(0)
  const SAVE_THROTTLE_MS = 10000 // 10秒内最多保存一次

  // 保存状态到localStorage
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
        return
      }

      const stateToSave = {
        timeRemaining: timeRemainingValue,
        totalElapsed: totalElapsedValue,
        totalEstimated: totalEstimatedValue,
        backendSyncedElapsed: timerState.backendSyncedElapsed,
        lastSaveTime: now,
        wasRunning: isRunning,
        startTime: timerState.startTime,
        expectedEndTime: timerState.expectedEndTime
      }

      saveFocusTimerState(storageKey, stateToSave)
      lastSaveTimeRef.current = now
    },
    [
      storageKey,
      isRunning,
      timerState.startTime,
      timerState.expectedEndTime,
      timerState.backendSyncedElapsed,
    ]
  )

  // 初始化计时器状态
  useEffect(() => {
    // 检查是否已经为该任务初始化过（或者当前正在运行该任务）
    // 如果 taskId 匹配且已经有剩余时间（不是初始的 0），则跳过初始化
    if (activeTaskId === taskId && (activeTimeRemaining > 0 || isRunning)) {
      return
    }

    console.log('🏗️ Initializing timer state for taskId:', taskId)
    
    // 优先从localStorage恢复，否则使用计算的初始值
    const restoredState = restoreFromStorage()
    const initialValues = restoredState || calculateInitialValues()
    const backendSyncedElapsed = restoredState?.backendSyncedElapsed

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

    if (backendSyncedElapsed !== undefined) {
      dispatch(markElapsedSynced(backendSyncedElapsed))
    }
    
    // 如果恢复时是运行状态，则自动开始
    if (restoredState?.wasRunning) {
      dispatch(startTimer())
    }
  }, [
    dispatch,
    taskId,
    initialTime,
    originalRemaining,
    originalElapsed,
    calculateInitialValues,
    restoreFromStorage,
    activeTaskId,
    activeTimeRemaining,
    isRunning,
  ])

  // 保存当前会话数据到后端
  const saveSessionData = useCallback(async (): Promise<boolean> => {
    if (!taskId || !sessionStartTime.current) {
      return false
    }

    const sessionDuration = Math.floor(
      (Date.now() - sessionStartTime.current.getTime()) / 1000
    )

    const endpoint = `/api/tasks/${taskId}/session`
    try {
      await saveTaskSession({ id: taskId, duration: sessionDuration }).unwrap()
      return true
    } catch (error) {
      console.warn(`⚠️ Session save request failed ${endpoint}:`, error)
      return false
    }
  }, [saveTaskSession, taskId])

  // 开始计时器
  const startTimerHandler = useCallback(() => {
    console.log('Starting timer globally')
    sessionStartTime.current = new Date()
    dispatch(startTimer())
  }, [dispatch])

  // 暂停计时器
  const pauseTimerHandler = useCallback(async () => {
    console.log('Pausing timer globally')
    const pausedTimeRemaining = timerState.expectedEndTime
      ? Math.max(0, Math.floor((timerState.expectedEndTime - Date.now()) / 1000))
      : timeRemaining

    dispatch(pauseTimer())

    saveFocusTimerState(storageKey, {
      timeRemaining: pausedTimeRemaining,
      totalElapsed,
      totalEstimated,
      backendSyncedElapsed: timerState.backendSyncedElapsed,
      lastSaveTime: Date.now(),
      wasRunning: false,
      startTime: null,
      expectedEndTime: null,
    })
    
    // 手动暂停时保存会话数据
    const saved = await saveSessionData()
    if (saved) {
      dispatch(markElapsedSynced(totalElapsed))
      saveFocusTimerState(storageKey, {
        timeRemaining,
        totalElapsed,
        totalEstimated,
        backendSyncedElapsed: totalElapsed,
        lastSaveTime: Date.now(),
        wasRunning: false,
        startTime: null,
        expectedEndTime: null,
      })
    }
    sessionStartTime.current = null
  }, [
    dispatch,
    timeRemaining,
    totalElapsed,
    totalEstimated,
    timerState.backendSyncedElapsed,
    timerState.expectedEndTime,
    saveSessionData,
    storageKey,
  ])

  // 移除页面可见性监听相关的自动暂停逻辑
  // 计时器现在在 BackgroundManager 中全局运行

  // 处理计时器完成
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      // 完成逻辑现在由 BackgroundManager 处理，
      // 但我们可以在这里执行一些 UI 相关的回调
      onComplete?.()
    }
  }, [timeRemaining, isRunning, onComplete])

  // 同步外部任务进度数据
  useEffect(() => {
    if (liveTaskProgress && taskId) {
      const newRemainingSeconds = liveTaskProgress.remainingSeconds
        ? liveTaskProgress.remainingSeconds
        : liveTaskProgress.remainingMinutes * 60
      const newElapsedSeconds = liveTaskProgress.executedSeconds
        ? liveTaskProgress.executedSeconds
        : liveTaskProgress.executedMinutes * 60
      const newTotalEstimated = newRemainingSeconds + newElapsedSeconds

      const now = Date.now()
      const shouldSync =
        (!hasInitializedFromLiveData && !isRunning) ||
        (now - lastSyncTime > 5 * 60 * 1000 && !isRunning)

      if (shouldSync) {
        const timeDifference = Math.abs(timeRemaining - newRemainingSeconds)
        if (timeDifference > 5 || !hasInitializedFromLiveData) {
          dispatch(
            syncLiveData({
              remainingSeconds: newRemainingSeconds,
              elapsedSeconds: newElapsedSeconds,
              totalEstimated: newTotalEstimated,
            })
          )
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
  ])

  // 页面离开确认 - 现在允许在后台运行
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRunning) {
        // 允许离开，但保存当前状态
        saveToStorage(timeRemaining, totalElapsed, totalEstimated, true)
        saveSessionData()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isRunning, timeRemaining, totalElapsed, totalEstimated, saveToStorage, saveSessionData])

  // 监听键盘快捷键
  const toggleTimer = useCallback(() => {
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
        // ESC键安全退出 - 但不一定要暂停，因为现在支持后台运行
        window.history.back()
      }
    },
    [toggleTimer]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  // 格式化时间显示
  const formatTime = useCallback((seconds: number) => {
    const totalSeconds = Math.floor(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }, [])

  // 计算当前总进度百分比
  const currentProgress = useMemo(() => {
    return totalEstimated > 0
        ? Math.min((totalElapsed / totalEstimated) * 100, 100)
        : 0
  }, [totalElapsed, totalEstimated])

  return {
    timeRemaining,
    currentProgress,
    isRunning,
    formatTime,
    toggleTimer,
  }
}
