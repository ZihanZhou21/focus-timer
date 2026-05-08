'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type TimerState = {
  timeRemaining: number
  isRunning: boolean
  totalElapsed: number
  totalEstimated: number
  taskId: string | null
  taskTitle: string | null
  initialTime: number
  originalRemaining: number
  originalElapsed: number
  hasInitializedFromLiveData: boolean
  lastSyncTime: number
  startTime: number | null // 时间戳 (ms)
  expectedEndTime: number | null // 时间戳 (ms)
}

const initialState: TimerState = {
  timeRemaining: 0,
  isRunning: false,
  totalElapsed: 0,
  totalEstimated: 0,
  taskId: null,
  taskTitle: null,
  initialTime: 25,
  originalRemaining: 0,
  originalElapsed: 0,
  hasInitializedFromLiveData: false,
  lastSyncTime: 0,
  startTime: null,
  expectedEndTime: null,
}

export const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    initializeTimer: (
      state,
      action: PayloadAction<{
        timeRemaining: number
        totalElapsed: number
        totalEstimated: number
        taskId: string | null
        taskTitle?: string | null
        initialTime: number
        originalRemaining: number
        originalElapsed: number
      }>
    ) => {
      const {
        timeRemaining,
        totalElapsed,
        totalEstimated,
        taskId,
        taskTitle,
        initialTime,
        originalRemaining,
        originalElapsed,
      } = action.payload
      state.timeRemaining = Math.floor(timeRemaining)
      state.totalElapsed = Math.floor(totalElapsed)
      state.totalEstimated = Math.floor(totalEstimated)
      state.taskId = taskId
      state.taskTitle = taskTitle ?? null
      state.initialTime = initialTime
      state.originalRemaining = originalRemaining
      state.originalElapsed = originalElapsed
      // Don't reset isRunning if we are already running (could be a recovery)
      if (!state.isRunning) {
        state.startTime = null
        state.expectedEndTime = null
      }
      state.hasInitializedFromLiveData = false
      state.lastSyncTime = 0
    },
    setTimerState: (state, action: PayloadAction<Partial<TimerState>>) => {
      return { ...state, ...action.payload }
    },
    startTimer: (state) => {
      state.isRunning = true
      const now = Date.now()
      state.startTime = now
      state.expectedEndTime = now + state.timeRemaining * 1000
    },
    pauseTimer: (state) => {
      state.isRunning = false
      // Calculate remaining time precisely when pausing
      if (state.expectedEndTime) {
        state.timeRemaining = Math.max(0, Math.floor((state.expectedEndTime - Date.now()) / 1000))
      }
      state.startTime = null
      state.expectedEndTime = null
    },
    updateTime: (
      state,
      action: PayloadAction<{ remaining: number; elapsed: number }>
    ) => {
      state.timeRemaining = action.payload.remaining
      state.totalElapsed = action.payload.elapsed
      if (state.isRunning && state.startTime) {
        state.expectedEndTime = Date.now() + state.timeRemaining * 1000
      }
    },
    tickTimer: (state) => {
      if (state.isRunning && state.expectedEndTime) {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((state.expectedEndTime - now) / 1000))
        
        // Calculate how much time passed since last update
        // (totalElapsed should ideally also be timestamp based, but let's update it relative to timeRemaining)
        const elapsedDelta = state.timeRemaining - remaining
        if (elapsedDelta > 0) {
          state.totalElapsed += elapsedDelta
          state.timeRemaining = remaining
        }

        if (state.timeRemaining <= 0) {
          state.isRunning = false
          state.startTime = null
          state.expectedEndTime = null
        }
      }
    },
    syncLiveData: (
      state,
      action: PayloadAction<{
        remainingSeconds: number
        elapsedSeconds: number
        totalEstimated: number
      }>
    ) => {
      const { remainingSeconds, elapsedSeconds, totalEstimated } =
        action.payload
      state.timeRemaining = Math.floor(remainingSeconds)
      state.totalElapsed = Math.floor(elapsedSeconds)
      state.totalEstimated = Math.floor(totalEstimated)
      state.hasInitializedFromLiveData = true
      state.lastSyncTime = Date.now()
      
      if (state.isRunning) {
        state.expectedEndTime = Date.now() + state.timeRemaining * 1000
      }
    },
    completeTimer: (state) => {
      state.isRunning = false
      state.timeRemaining = 0
      state.totalElapsed = state.totalEstimated
      state.startTime = null
      state.expectedEndTime = null
      state.taskId = null
      state.taskTitle = null
    },
    resetTimer: () => initialState,
  },
})

export const {
  initializeTimer,
  setTimerState,
  startTimer,
  pauseTimer,
  updateTime,
  tickTimer,
  syncLiveData,
  completeTimer,
  resetTimer,
} = timerSlice.actions

export default timerSlice.reducer
