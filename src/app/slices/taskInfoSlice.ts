'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type TaskInfo = {
  title: string
  duration: string
  status: string
  completed: boolean
}

type TaskProgress = {
  remainingMinutes: number
  executedMinutes: number
  progressPercentage: number
  // 添加秒级精度数据
  remainingSeconds?: number
  executedSeconds?: number
  estimatedSeconds?: number
}

type TaskInfoState = {
  taskInfo: TaskInfo | null
  taskProgress: TaskProgress | null
  isLoading: boolean
}

const initialState: TaskInfoState = {
  taskInfo: null,
  taskProgress: null,
  isLoading: true,
}

export const taskInfoSlice = createSlice({
  name: 'taskInfo',
  initialState,
  reducers: {
    setTaskInfo: (state, action: PayloadAction<TaskInfo | null>) => {
      state.taskInfo = action.payload
    },
    setTaskProgress: (state, action: PayloadAction<TaskProgress | null>) => {
      state.taskProgress = action.payload
    },
    updateTaskProgress: (
      state,
      action: PayloadAction<Partial<TaskProgress>>
    ) => {
      if (state.taskProgress) {
        state.taskProgress = { ...state.taskProgress, ...action.payload }
      } else {
        state.taskProgress = {
          remainingMinutes: 0,
          executedMinutes: 0,
          progressPercentage: 0,
          ...action.payload,
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    resetTaskInfo: () => initialState,
  },
})

export const {
  setTaskInfo,
  setTaskProgress,
  updateTaskProgress,
  setLoading,
  resetTaskInfo,
} = taskInfoSlice.actions

export default taskInfoSlice.reducer
