'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { completeTimer, tickTimer } from '@/app/slices/timerSlice'
import { setSelectedItem, updateTask } from '@/app/slices/tasksSlice'
import type { RootState } from '@/app/store'
import {
  clearFocusTimerState,
  getFocusTimerStorageKey,
  saveFocusTimerState,
} from '@/lib/focus-timer-storage'
import { useCompleteTaskMutation } from '@/lib/services/tasks-api'

export default function TimerBackgroundManager() {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const timerState = useSelector((state: RootState) => state.timer)
  const {
    isRunning,
    timeRemaining,
    taskId,
    expectedEndTime,
    totalElapsed,
    totalEstimated,
    backendSyncedElapsed,
  } = timerState
  const [completeTaskMutation] = useCompleteTaskMutation()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<number>(0)
  const completingTaskRef = useRef<string | null>(null)

  useEffect(() => {
    if (isRunning && expectedEndTime) {
      if (!intervalRef.current) {
        console.log('[BackgroundManager] Starting global ticker')
        intervalRef.current = setInterval(() => {
          dispatch(tickTimer())
        }, 1000)
      }
    } else if (intervalRef.current) {
      console.log('[BackgroundManager] Stopping global ticker')
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [dispatch, expectedEndTime, isRunning])

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const now = Date.now()
    if (now - lastSyncRef.current <= 10000) {
      return
    }

    const storageKey = getFocusTimerStorageKey(taskId)
    saveFocusTimerState(storageKey, {
      timeRemaining,
      totalElapsed,
      totalEstimated,
      backendSyncedElapsed,
      lastSaveTime: now,
      wasRunning: true,
      startTime: timerState.startTime,
      expectedEndTime: timerState.expectedEndTime,
    })
    lastSyncRef.current = now
  }, [
    backendSyncedElapsed,
    isRunning,
    taskId,
    timeRemaining,
    timerState.expectedEndTime,
    timerState.startTime,
    totalElapsed,
    totalEstimated,
  ])

  const handleCompletion = useCallback(async () => {
    if (!taskId || completingTaskRef.current === taskId) {
      return
    }

    completingTaskRef.current = taskId

    try {
      const audio = new Audio('/alert.mp3')
      audio.play().catch((error) => console.warn('Audio play failed', error))
    } catch {}

    try {
      const unsyncedDuration = Math.max(
        0,
        Math.floor(totalElapsed - backendSyncedElapsed)
      )
      const data = await completeTaskMutation({
        id: taskId,
        duration: unsyncedDuration,
      }).unwrap()

      window.dispatchEvent(new CustomEvent('focus-stats-updated'))

      if (data.task) {
        dispatch(
          updateTask({
            id: data.task._id || taskId,
            userId: data.task.userId,
            date: new Date().toISOString().split('T')[0],
            time: data.task.plannedTime || new Date().toTimeString().slice(0, 5),
            title: data.task.title,
            durationMinutes:
              data.task.type === 'todo'
                ? Math.ceil(data.task.estimatedDuration / 60)
                : 0,
            icon: 'T',
            iconColor: 'bg-blue-500',
            completed: true,
            details: data.task.content,
            tags: data.task.tags,
            priority: data.task.priority,
            status: data.task.status,
            type: data.task.type,
          })
        )
        dispatch(setSelectedItem(null))

        if (pathname === '/focus') {
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Failed to complete task via background manager', error)
    } finally {
      dispatch(completeTimer())
      clearFocusTimerState(getFocusTimerStorageKey(taskId))
      completingTaskRef.current = null
    }
  }, [
    backendSyncedElapsed,
    completeTaskMutation,
    dispatch,
    pathname,
    router,
    taskId,
    totalElapsed,
  ])

  useEffect(() => {
    if (timeRemaining <= 0 && taskId) {
      console.log('[BackgroundManager] Timer reached zero')
      void handleCompletion()
    }
  }, [handleCompletion, taskId, timeRemaining])

  return null
}
