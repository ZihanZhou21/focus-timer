'use client'

import { configureStore } from '@reduxjs/toolkit'
import tasksReducer from './slices/tasksSlice'
import timerReducer from './slices/timerSlice'
import taskInfoReducer from './slices/taskInfoSlice'
import statsReducer from './slices/statsSlice'

// 临时 root reducer，后续添加 slices
const rootReducer = {
  tasks: tasksReducer,
  timer: timerReducer,
  taskInfo: taskInfoReducer,
  stats: statsReducer,
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // 如果需要非序列化状态
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
