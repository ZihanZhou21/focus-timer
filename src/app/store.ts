'use client'

import { configureStore } from '@reduxjs/toolkit'
import tasksReducer from './slices/tasksSlice'
import timerReducer from './slices/timerSlice'
import taskInfoReducer from './slices/taskInfoSlice'
import statsReducer from './slices/statsSlice'
import { statsApi } from '@/lib/services/stats-api'
import { tasksApi } from '@/lib/services/tasks-api'

const rootReducer = {
  tasks: tasksReducer,
  timer: timerReducer,
  taskInfo: taskInfoReducer,
  stats: statsReducer,
  [statsApi.reducerPath]: statsApi.reducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(statsApi.middleware, tasksApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
