'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ProjectItem } from '@/lib/api'

type TasksState = {
  selectedItem: ProjectItem | null
}

const initialState: TasksState = {
  selectedItem: null,
}

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedItem: (state, action: PayloadAction<ProjectItem | null>) => {
      state.selectedItem = action.payload
    },
    updateTask: (state, action: PayloadAction<ProjectItem>) => {
      if (state.selectedItem?.id === action.payload.id) {
        state.selectedItem = action.payload
      }
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      if (state.selectedItem?.id === action.payload) {
        state.selectedItem = null
      }
    },
  },
})

export const { setSelectedItem, updateTask, deleteTask } = tasksSlice.actions

export default tasksSlice.reducer
