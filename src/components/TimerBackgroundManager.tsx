'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { RootState } from '@/app/store'
import { tickTimer, completeTimer } from '@/app/slices/timerSlice'
import { updateTask, setSelectedItem } from '@/app/slices/tasksSlice'
import { saveFocusTimerState, getFocusTimerStorageKey, clearFocusTimerState } from '@/lib/focus-timer-storage'

export default function TimerBackgroundManager() {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const timerState = useSelector((state: RootState) => state.timer)
  const { isRunning, timeRemaining, taskId, expectedEndTime, totalElapsed, totalEstimated } = timerState
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<number>(0)

  // 1. 核心计时逻辑 - 保持在后台运行
  useEffect(() => {
    if (isRunning && expectedEndTime) {
      if (!intervalRef.current) {
        console.log('🌐 [BackgroundManager] Starting global ticker')
        intervalRef.current = setInterval(() => {
          dispatch(tickTimer())
        }, 1000)
      }
    } else {
      if (intervalRef.current) {
        console.log('🌐 [BackgroundManager] Stopping global ticker')
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, expectedEndTime, dispatch])

  // 2. 自动保存状态到 localStorage
  useEffect(() => {
    if (isRunning) {
      const now = Date.now()
      // 每 10 秒保存一次，或者在关键时刻保存
      if (now - lastSyncRef.current > 10000) {
        const storageKey = getFocusTimerStorageKey(taskId)
        saveFocusTimerState(storageKey, {
          timeRemaining,
          totalElapsed,
          totalEstimated,
          lastSaveTime: now,
          wasRunning: true,
          startTime: timerState.startTime,
          expectedEndTime: timerState.expectedEndTime
        })
        lastSyncRef.current = now
      }
    }
  }, [isRunning, timeRemaining, totalElapsed, totalEstimated, taskId, timerState.startTime, timerState.expectedEndTime])

  const handleCompletion = useCallback(async () => {
    // 播放声音 (全局)
    try {
      const audio = new Audio('/alert.mp3')
      audio.play().catch(e => console.warn('Audio play failed', e))
    } catch {}

    // 触发完成 API
    if (taskId) {
      try {
        const response = await fetch(`/api/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: 0 }), // 最终时长计算可以在后端处理或这里累加
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.task) {
            // 同步任务状态到 Redux
            dispatch(updateTask({
              ...data.task,
              id: data.task.id || taskId, // 确保有 ID
              completed: true // 强制标记为完成以便前端立即响应
            }))
            
            // 任务完成后自动取消选中
            dispatch(setSelectedItem(null))
            
            // 如果在专注页面，则立即跳转回主页
            if (pathname === '/focus') {
              router.push('/')
            }
          }
        }
      } catch (e) {
        console.error('Failed to complete task via background manager', e)
      }
    }

    dispatch(completeTimer())
    const storageKey = getFocusTimerStorageKey(taskId)
    clearFocusTimerState(storageKey)
  }, [taskId, dispatch, pathname, router])

  // 3. 处理计时结束逻辑
  useEffect(() => {
    // 因为 tickTimer 会在 timeRemaining <= 0 时同步将 isRunning 设置为 false，
    // 所以这里不能要求 isRunning 必须为 true。只要 timeRemaining <= 0 且存在 taskId 即可触发完成。
    if (timeRemaining <= 0 && taskId) {
      console.log('🌐 [BackgroundManager] Timer reached zero!')
      handleCompletion()
    }
  }, [timeRemaining, taskId, handleCompletion])

  return null // Headless component
}
