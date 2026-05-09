import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Task } from '@/lib/types'
import type { ProjectItem } from '@/lib/api'
import { statsApi } from '@/lib/services/stats-api'

export interface TaskProgressData {
  taskId: string
  totalExecutedTime: number
  estimatedDuration: number
  progressPercentage: number
  isCompleted: boolean
  dailyProgress: {
    date: string
    duration: number
    minutes: number
  }[]
  todayProgress?: {
    date: string
    duration: number
    minutes: number
  }
  todayOnly?: boolean
}

export interface TaskRemainingData {
  taskId: string
  estimatedMinutes: number
  executedMinutes: number
  remainingMinutes: number
  remainingSeconds?: number
  executedSeconds?: number
  estimatedSeconds?: number
  isCompleted: boolean
  todayOnly?: boolean
  date?: string
}

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

export interface TodayTasksResponse {
  date: string
  dayOfWeek: number
  tasks: Task[]
  stats: {
    total: number
    todoTasks: number
    checkInTasks: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
  }
}

export type CreateTaskInput = Partial<Omit<Task, '_id' | 'createdAt' | 'updatedAt'>> & {
  userId: string
  type: Task['type']
  title: string
  content: string[]
  status: Task['status']
  priority: Task['priority']
  tags: string[]
  date?: string
  details?: string[]
  icon?: string
  iconColor?: string
}

export interface CreateTaskResponse {
  id?: string
  _id?: string
  icon?: string
}

export interface UpdateTaskInput {
  id: string
  updates: Omit<Partial<Task>, 'completedAt'> & {
    completedAt?: string[] | string | null
    details?: string[]
    estimatedDuration?: number
  }
}

export interface CompleteTaskInput {
  id: string
  duration?: number
}

export interface CompleteTaskResponse {
  message: string
  task: Task
  durationAdded: number
  todayTotal: number
}

const invalidateStats = (dispatch: (action: unknown) => unknown) => {
  dispatch(statsApi.util.invalidateTags(['WeeklyStats', 'MonthlyStats']))
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
    getTodayTasks: builder.query<TodayTasksResponse, string | undefined>({
      query: (userId = 'user_001') =>
        `today?userId=${encodeURIComponent(userId)}`,
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
    createTask: builder.mutation<CreateTaskResponse, CreateTaskInput>({
      query: (task) => ({
        url: '',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: (_result, _error, task) => [
        { type: 'TodayTasks', id: task.userId },
      ],
      async onQueryStarted(_task, { dispatch, queryFulfilled }) {
        await queryFulfilled
        invalidateStats(dispatch)
      },
    }),
    updateTask: builder.mutation<Task, UpdateTaskInput>({
      query: ({ id, updates }) => ({
        url: id,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (_result, _error, { id, updates }) => [
        { type: 'Task', id },
        { type: 'TaskProgress', id },
        { type: 'TaskRemaining', id },
        { type: 'TodayTasks', id: updates.userId ?? 'user_001' },
      ],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        await queryFulfilled
        invalidateStats(dispatch)
      },
    }),
    deleteTask: builder.mutation<Task, string>({
      query: (id) => ({
        url: id,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Task', id },
        { type: 'TaskProgress', id },
        { type: 'TaskRemaining', id },
        { type: 'TodayTasks', id: 'user_001' },
      ],
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        await queryFulfilled
        invalidateStats(dispatch)
      },
    }),
    completeTask: builder.mutation<CompleteTaskResponse, CompleteTaskInput>({
      query: ({ id, duration }) => ({
        url: `${id}/complete`,
        method: 'POST',
        body: { duration },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskProgress', id },
        { type: 'TaskRemaining', id },
        { type: 'TodayTasks', id: 'user_001' },
      ],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        await queryFulfilled
        invalidateStats(dispatch)
      },
    }),
    saveTaskSession: builder.mutation<{ success?: boolean }, CompleteTaskInput>({
      query: ({ id, duration }) => ({
        url: `${id}/session`,
        method: 'POST',
        body: { duration },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskProgress', id },
        { type: 'TaskRemaining', id },
        { type: 'TodayTasks', id: 'user_001' },
      ],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        await queryFulfilled
        invalidateStats(dispatch)
      },
    }),
  }),
})

export const {
  useCompleteTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetBatchTaskInfoQuery,
  useGetTaskQuery,
  useGetTaskProgressQuery,
  useGetTaskRemainingQuery,
  useSaveTaskSessionMutation,
  useUpdateTaskMutation,
  useGetTodayTasksQuery,
  useGetTodayProjectItemsQuery,
} = tasksApi
