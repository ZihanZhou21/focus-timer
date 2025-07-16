'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type TimerState = {
  timeRemaining: number
  isRunning: boolean
  totalElapsed: number
  totalEstimated: number
  taskId: string | null
  initialTime: number
  originalRemaining: number
  originalElapsed: number
  hasInitializedFromLiveData: boolean
  lastSyncTime: number
}

const initialState: TimerState = {
  timeRemaining: 0,
  isRunning: false,
  totalElapsed: 0,
  totalEstimated: 0,
  taskId: null,
  initialTime: 25,
  originalRemaining: 0,
  originalElapsed: 0,
  hasInitializedFromLiveData: false,
  lastSyncTime: 0,
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
        initialTime,
        originalRemaining,
        originalElapsed,
      } = action.payload
      state.timeRemaining = Math.floor(timeRemaining)
      state.totalElapsed = Math.floor(totalElapsed)
      state.totalEstimated = Math.floor(totalEstimated)
      state.taskId = taskId
      state.initialTime = initialTime
      state.originalRemaining = originalRemaining
      state.originalElapsed = originalElapsed
      state.isRunning = false
      state.hasInitializedFromLiveData = false
      state.lastSyncTime = 0
    },
    setTimerState: (state, action: PayloadAction<Partial<TimerState>>) => {
      return { ...state, ...action.payload }
    },
    startTimer: (state) => {
      state.isRunning = true
    },
    pauseTimer: (state) => {
      state.isRunning = false
    },
    updateTime: (
      state,
      action: PayloadAction<{ remaining: number; elapsed: number }>
    ) => {
      state.timeRemaining = action.payload.remaining
      state.totalElapsed = action.payload.elapsed
    },
    tickTimer: (state) => {
      if (state.isRunning && state.timeRemaining > 0) {
        state.timeRemaining = Math.max(0, state.timeRemaining - 1)
        state.totalElapsed = state.totalElapsed + 1
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
    },
    completeTimer: (state) => {
      state.isRunning = false
      state.timeRemaining = 0
      state.totalElapsed = state.totalEstimated
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
