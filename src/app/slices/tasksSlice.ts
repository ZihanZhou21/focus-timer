'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ProjectItem } from '@/lib/api'

type TasksState = {
  timelineItems: ProjectItem[]
  selectedItem: ProjectItem | null
  isLoading: boolean
}

const initialState: TasksState = {
  timelineItems: [],
  selectedItem: null,
  isLoading: true,
}

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTimelineItems: (state, action: PayloadAction<ProjectItem[]>) => {
      state.timelineItems = action.payload
      state.isLoading = false
    },
    setSelectedItem: (state, action: PayloadAction<ProjectItem | null>) => {
      state.selectedItem = action.payload
    },
    updateTask: (state, action: PayloadAction<ProjectItem>) => {
      state.timelineItems = state.timelineItems.map((item) =>
        item.id === action.payload.id ? action.payload : item
      )
      if (state.selectedItem?.id === action.payload.id) {
        state.selectedItem = action.payload
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.timelineItems = state.timelineItems.filter(
        (item) => item.id !== action.payload
      )
      if (state.selectedItem?.id === action.payload) {
        state.selectedItem = null
      }
    },
  },
})

export const { setTimelineItems, setSelectedItem, updateTask, deleteTask } =
  tasksSlice.actions

export default tasksSlice.reducer
