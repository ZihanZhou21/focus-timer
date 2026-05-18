'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch } from '@/app/hooks'
import AppNavigation from '@/components/AppNavigation'
import StatsCard from '@/components/StatsCard'
import { DEFAULT_USER_ID, taskTypeConfig, TimePeriod } from '@/lib/constants'
import {
  statsApi,
  useGetMonthlyStatsQuery,
  useGetWeeklyStatsQuery,
  useGetYearlyStatsQuery,
  type MonthlyStatsResponse,
  type WeeklyStatsResponse,
  type YearlyStatsResponse,
} from '@/lib/services/stats-api'
import { formatTimeInHours, getDateRange } from '@/lib/utils'

interface DayData {
  date: string
  day: string
  totalFocusTime: number
  completedCycles: number
  totalProjects: number
  completedProjects: number
  categoryBreakdown: {
    todo: number
    'check-in': number
  }
}

interface PeriodStats {
  totalFocusTime: number
  completedCycles: number
  averageSessionLength: number
  streakDays: number
  dailyData: DayData[]
}

interface Segment {
  type: 'todo' | 'check-in'
  height: number
  value: number
}

const formatDateParam = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getDailyData = (
  selectedPeriod: TimePeriod,
  year: number,
  weeklyStats?: WeeklyStatsResponse,
  monthlyStats?: MonthlyStatsResponse,
  yearlyStats?: YearlyStatsResponse
): DayData[] => {
  if (selectedPeriod === 'week') {
    return (
      weeklyStats?.dailyStats.map((day) => ({
        date: day.date,
        day: day.dayLabel,
        totalFocusTime: day.todoTime,
        completedCycles: day.completedCount,
        totalProjects: day.taskCount,
        completedProjects: day.completedCount,
        categoryBreakdown: {
          todo: day.todoTime,
          'check-in': 0,
        },
      })) ?? []
    )
  }

  if (selectedPeriod === 'month') {
    return (
      monthlyStats?.dailyStats.map((day) => ({
        date: day.date,
        day: new Date(day.date).getDate().toString(),
        totalFocusTime: day.todoTime,
        completedCycles: day.completedCount,
        totalProjects: day.taskCount,
        completedProjects: day.completedCount,
        categoryBreakdown: {
          todo: day.todoTime,
          'check-in': 0,
        },
      })) ?? []
    )
  }

  return (
    yearlyStats?.monthlyStats.map((monthStats) => {
      const monthTotalTime = monthStats.dailyStats.reduce(
        (sum, day) => sum + day.todoTime,
        0
      )
      const monthCompletedCount = monthStats.dailyStats.reduce(
        (sum, day) => sum + day.completedCount,
        0
      )
      const monthTaskCount = monthStats.dailyStats.reduce(
        (sum, day) => sum + day.taskCount,
        0
      )

      return {
        date: `${year}-${monthStats.month.toString().padStart(2, '0')}`,
        day: `Month ${monthStats.month}`,
        totalFocusTime: monthTotalTime,
        completedCycles: monthCompletedCount,
        totalProjects: monthTaskCount,
        completedProjects: monthCompletedCount,
        categoryBreakdown: {
          todo: monthTotalTime,
          'check-in': 0,
        },
      }
    }) ?? []
  )
}

export default function CalendarPage() {
  const dispatch = useAppDispatch()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const weekRange = useMemo(() => getDateRange(currentDate, 'week'), [currentDate])
  const weekEndDate = useMemo(
    () => formatDateParam(weekRange.end),
    [weekRange.end]
  )

  const weeklyQuery = useGetWeeklyStatsQuery(
    { days: 7, endDate: weekEndDate, userId: DEFAULT_USER_ID },
    { skip: selectedPeriod !== 'week' }
  )
  const monthlyQuery = useGetMonthlyStatsQuery(
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      userId: DEFAULT_USER_ID,
    },
    { skip: selectedPeriod !== 'month' }
  )
  const yearlyQuery = useGetYearlyStatsQuery(
    { year: currentDate.getFullYear(), userId: DEFAULT_USER_ID },
    { skip: selectedPeriod !== 'year' }
  )

  const periodStats = useMemo<PeriodStats>(() => {
    const dailyData = getDailyData(
      selectedPeriod,
      currentDate.getFullYear(),
      weeklyQuery.data,
      monthlyQuery.data,
      yearlyQuery.data
    )
    const totalFocusTime = dailyData.reduce(
      (sum, day) => sum + day.totalFocusTime,
      0
    )
    const completedCycles = dailyData.reduce(
      (sum, day) => sum + day.completedCycles,
      0
    )
    const averageSessionLength =
      completedCycles > 0 ? Math.round(totalFocusTime / completedCycles) : 0

    let streakDays = 0
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].totalFocusTime > 0) {
        streakDays++
      } else {
        break
      }
    }

    return {
      totalFocusTime,
      completedCycles,
      averageSessionLength,
      streakDays,
      dailyData,
    }
  }, [
    currentDate,
    monthlyQuery.data,
    selectedPeriod,
    weeklyQuery.data,
    yearlyQuery.data,
  ])

  const isLoading =
    (selectedPeriod === 'week' && weeklyQuery.isLoading) ||
    (selectedPeriod === 'month' && monthlyQuery.isLoading) ||
    (selectedPeriod === 'year' && yearlyQuery.isLoading)

  useEffect(() => {
    const handleStatsUpdated = () => {
      dispatch(statsApi.util.invalidateTags(['WeeklyStats', 'MonthlyStats']))
    }

    window.addEventListener('focus-stats-updated', handleStatsUpdated)
    return () =>
      window.removeEventListener('focus-stats-updated', handleStatsUpdated)
  }, [dispatch])

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    switch (selectedPeriod) {
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'year':
        newDate.setFullYear(
          newDate.getFullYear() + (direction === 'next' ? 1 : -1)
        )
        break
    }

    setCurrentDate(newDate)
  }

  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'week': {
        const { start, end } = getDateRange(currentDate, 'week')
        return `${start.getMonth() + 1}/${start.getDate()} - ${
          end.getMonth() + 1
        }/${end.getDate()}`
      }
      case 'month':
        return `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`
      case 'year':
        return `${currentDate.getFullYear()}`
    }
  }

  const maxFocusTime = Math.max(
    ...periodStats.dailyData.map((d) => d.totalFocusTime),
    60
  )

  return (
    <div className="app-page h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="text-xl font-bold text-[var(--foreground)]">Focus Timer</div>
        </div>

        <AppNavigation />

        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-full flex items-center justify-center hover:border-[var(--accent)] transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300 rounded-full"></div>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigatePeriod('prev')}
                className="p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors">
                <svg
                  className="w-5 h-5 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] min-w-[200px] text-center">
                {getPeriodTitle()}
              </h1>

              <button
                onClick={() => navigatePeriod('next')}
                className="p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors">
                <svg
                  className="w-5 h-5 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm backdrop-blur-xl">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-6 py-2.5 rounded-xl font-medium text-base transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                  }`}>
                  {period === 'week' && 'This Week'}
                  {period === 'month' && 'This Month'}
                  {period === 'year' && 'This Year'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-3xl bg-[var(--surface-muted)] border border-[var(--border)] animate-pulse"
                />
              ))
            ) : (
              <>
                <StatsCard
                  title="Total Focus Time"
                  value={formatTimeInHours(periodStats.totalFocusTime)}
                  color="amber"
                />
                <StatsCard
                  title="Completed Cycles"
                  value={periodStats.completedCycles}
                  color="emerald"
                />
                <StatsCard
                  title="Average Duration"
                  value={formatTimeInHours(periodStats.averageSessionLength)}
                  color="blue"
                />
                <StatsCard
                  title="Streak Days"
                  value={periodStats.streakDays}
                  color="purple"
                />
              </>
            )}
          </div>

          <div className="app-surface rounded-3xl border p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Focus Trend</h2>
              <div className="flex items-center space-x-6">
                {Object.entries(taskTypeConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded ${config.lightColor}`}></div>
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {config.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex items-end h-80 gap-2 min-w-full w-full">
                {periodStats.dailyData.map((data, index) => {
                  const { categoryBreakdown } = data
                  const todoHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown.todo / maxFocusTime) * 100
                      : 0
                  const checkInHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown['check-in'] / maxFocusTime) * 100
                      : 0

                  const segments: Segment[] = []
                  if (categoryBreakdown.todo > 0) {
                    segments.push({
                      type: 'todo',
                      height: todoHeight,
                      value: categoryBreakdown.todo,
                    })
                  }
                  if (categoryBreakdown['check-in'] > 0) {
                    segments.push({
                      type: 'check-in',
                      height: checkInHeight,
                      value: categoryBreakdown['check-in'],
                    })
                  }

                  const minBarWidth =
                    selectedPeriod === 'month'
                      ? 20
                      : selectedPeriod === 'year'
                      ? 60
                      : 40

                  return (
                    <div
                      key={data.date || index}
                      className="flex flex-col items-center justify-end h-full group cursor-pointer"
                      style={{
                        minWidth: `${minBarWidth}px`,
                        flex: '1',
                      }}>
                      <div className="mb-2 text-xs text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatTimeInHours(data.totalFocusTime)}
                      </div>

                      <div className="w-full flex flex-col justify-end h-full min-h-[20px]">
                        {segments.length > 0 ? (
                          segments.map((segment, segmentIndex) => {
                            const colors = {
                              todo: 'bg-blue-400/70 hover:bg-blue-400/90',
                              'check-in': 'bg-gray-400/70 hover:bg-gray-400/90',
                            }
                            const names = {
                              todo: 'Todo',
                              'check-in': 'Check-in',
                            }

                            return (
                              <div
                                key={segment.type}
                                className={`w-full transition-all duration-300 ${
                                  colors[segment.type]
                                } ${segmentIndex === 0 ? 'rounded-t-md' : ''} ${
                                  segmentIndex === segments.length - 1
                                    ? 'rounded-b-md'
                                    : ''
                                }`}
                                style={{
                                  height: `${Math.max(segment.height, 2)}%`,
                                }}
                                title={`${
                                  names[segment.type]
                                }: ${formatTimeInHours(segment.value)}`}
                              />
                            )
                          })
                        ) : (
                          <div className="w-full h-2 bg-[var(--border)] rounded-md" />
                        )}
                      </div>

                      <div className="mt-3 text-xs text-[var(--muted-foreground)] text-center whitespace-nowrap">
                        {data.day}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
