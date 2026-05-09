import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Task } from '@/lib/types'
import type { ProjectItem } from '@/lib/api'
import type { TaskProgressData } from '@/lib/task-progress-api'
import type { TaskRemainingData } from '@/lib/task-remaining-api'

interface BatchTaskInfoItem {
  _id: string
  title: string
  status: string
  type: string
  priority: string
  tags: string[]
  createdAt: string
  updatedAt: string
  progress?: {
    totalExecutedTime: number
    estimatedDuration: number
    progressPercentage: number
    isCompleted: boolean
    todayProgress: {
      date: string
      duration: number
      minutes: number
    }
  }
  remaining?: {
    executedMinutes: number
    remainingMinutes: number
    estimatedMinutes: number
    executedSeconds: number
    remainingSeconds: number
    estimatedSeconds: number
  }
}

interface BatchTaskInfoResponse {
  success: Record<string, BatchTaskInfoItem>
  errors: Record<string, string>
  count: {
    requested: number
    successful: number
    failed: number
  }
  timestamp: string
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/tasks' }),
  tagTypes: ['Task', 'TaskProgress', 'TaskRemaining', 'TodayTasks'],
  endpoints: (builder) => ({
    getTodayProjectItems: builder.query<ProjectItem[], string | undefined>({
      query: (userId = 'user_001') =>
        `today?userId=${encodeURIComponent(userId)}&format=project-items`,
      providesTags: (_result, _error, userId = 'user_001') => [
        { type: 'TodayTasks', id: userId },
      ],
      keepUnusedDataFor: 120,
    }),
    getTask: builder.query<Task, string>({
      query: (taskId) => taskId,
      providesTags: (_result, _error, taskId) => [{ type: 'Task', id: taskId }],
    }),
    getTaskProgress: builder.query<TaskProgressData, string>({
      query: (taskId) => `${taskId}/progress`,
      providesTags: (_result, _error, taskId) => [
        { type: 'TaskProgress', id: taskId },
      ],
      keepUnusedDataFor: 120,
    }),
    getTaskRemaining: builder.query<TaskRemainingData, string>({
      query: (taskId) => `${taskId}/remaining`,
      providesTags: (_result, _error, taskId) => [
        { type: 'TaskRemaining', id: taskId },
      ],
      keepUnusedDataFor: 10,
    }),
    getBatchTaskInfo: builder.query<BatchTaskInfoResponse, string[]>({
      query: (taskIds) => ({
        url: 'batch/info',
        method: 'POST',
        body: { taskIds },
      }),
      providesTags: (_result, _error, taskIds) => [
        ...taskIds.flatMap((taskId) => [
          { type: 'Task' as const, id: taskId },
          { type: 'TaskProgress' as const, id: taskId },
          { type: 'TaskRemaining' as const, id: taskId },
        ]),
      ],
      keepUnusedDataFor: 120,
    }),
  }),
})

export const {
  useGetBatchTaskInfoQuery,
  useGetTaskQuery,
  useGetTaskProgressQuery,
  useGetTaskRemainingQuery,
  useGetTodayProjectItemsQuery,
} = tasksApi
