import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface DayStats {
  date: string
  dayLabel: string
  totalDuration: number
  todoTime: number
  checkInTime: number
  taskCount: number
  completedCount: number
  isToday: boolean
}

export interface WeeklyStatsResponse {
  startDate: string
  endDate: string
  dailyStats: DayStats[]
  summary: {
    totalDuration: number
    totalCompleted: number
    averageDailyTime: number
    mostProductiveDay: string | null
  }
}

export interface WeeklyStatsQueryArgs {
  days?: number
  endDate?: string
  userId?: string
}

export interface MonthlyDailyStats {
  date: string
  totalDuration: number
  todoTime: number
  checkInTime: number
  taskCount: number
  completedCount: number
}

export interface MonthlyStatsResponse {
  year: number
  month: number
  dailyStats: MonthlyDailyStats[]
  summary: {
    totalDuration: number
    totalTasks: number
    totalCompleted: number
    averageDailyTime: number
  }
}

export interface MonthlyStatsQueryArgs {
  year: number
  month: number
  userId?: string
  startDate?: string
  endDate?: string
}

export const statsApi = createApi({
  reducerPath: 'statsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/tasks' }),
  tagTypes: ['WeeklyStats', 'MonthlyStats'],
  endpoints: (builder) => ({
    getWeeklyStats: builder.query<WeeklyStatsResponse, WeeklyStatsQueryArgs>({
      query: ({ days = 7, endDate, userId = 'user_001' }) => {
        const params = new URLSearchParams({
          days: days.toString(),
          userId,
        })

        if (endDate) {
          params.set('endDate', endDate)
        }

        return `weekly-stats?${params.toString()}`
      },
      providesTags: (_result, _error, { days = 7, endDate, userId = 'user_001' }) => [
        {
          type: 'WeeklyStats',
          id: `${userId}-${days}-${endDate ?? 'current'}`,
        },
        'WeeklyStats',
      ],
      keepUnusedDataFor: 300,
    }),
    getMonthlyStats: builder.query<MonthlyStatsResponse, MonthlyStatsQueryArgs>({
      query: ({
        year,
        month,
        userId = 'user_001',
        startDate,
        endDate,
      }) => {
        const params = new URLSearchParams({
          userId,
          year: year.toString(),
          month: month.toString(),
        })

        if (startDate) {
          params.set('startDate', startDate)
        }

        if (endDate) {
          params.set('endDate', endDate)
        }

        return `monthly-stats?${params.toString()}`
      },
      providesTags: (
        _result,
        _error,
        { year, month, userId = 'user_001', startDate, endDate }
      ) => [
        {
          type: 'MonthlyStats',
          id: `${userId}-${year}-${month}-${startDate ?? 'month'}-${
            endDate ?? 'month'
          }`,
        },
        'MonthlyStats',
      ],
      keepUnusedDataFor: 600,
    }),
  }),
})

export const { useGetMonthlyStatsQuery, useGetWeeklyStatsQuery } = statsApi
