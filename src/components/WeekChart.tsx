'use client'

import { useEffect, useMemo, useState } from 'react'
import { useGetWeeklyStatsQuery } from '@/lib/services/stats-api'

type DayData = {
  day: string
  focus: number
  cycles: number
}

interface WeekChartProps {
  userId?: string
  onDataUpdate?: (data: DayData[]) => void
}

const getPastDaysEndDate = (daysBack: number = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  d.setHours(23, 59, 59, 999)
  return d
}

export default function WeekChart({
  userId = 'user_001',
  onDataUpdate,
}: WeekChartProps) {
  const [endDate, setEndDate] = useState<Date>(() => getPastDaysEndDate(0))
  const isCurrentPeriod = endDate.toDateString() === new Date().toDateString()
  const endDateStr = useMemo(() => endDate.toISOString().split('T')[0], [endDate])

  const {
    data: weeklyStats,
    isLoading,
    isFetching,
    refetch,
  } = useGetWeeklyStatsQuery({
    days: 7,
    endDate: endDateStr,
    userId,
  })

  const weeklyData = useMemo<DayData[]>(() => {
    return (
      weeklyStats?.dailyStats.map((day) => ({
        day: day.dayLabel,
        focus: day.todoTime,
        cycles: day.completedCount,
      })) ?? []
    )
  }, [weeklyStats])

  const maxFocus =
    weeklyData.length > 0
      ? Math.max(...weeklyData.map((d) => d.focus), 120)
      : 120

  const weekDays = useMemo(() => {
    const today = new Date().toDateString()

    return weeklyData.map((data, index) => {
      const dayDate = new Date(endDate)
      dayDate.setDate(endDate.getDate() - (6 - index))

      return {
        day: data.day,
        isToday: dayDate.toDateString() === today,
        data,
      }
    })
  }, [endDate, weeklyData])

  const navigatePeriod = (dir: 'prev' | 'next') => {
    setEndDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + (dir === 'prev' ? -7 : 7))
      return d
    })
  }

  const periodLabel = (() => {
    const start = new Date(endDate)
    start.setDate(start.getDate() - 6)
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
        d.getDate()
      ).padStart(2, '0')}`
    return `${fmt(start)} - ${fmt(endDate)}`
  })()

  useEffect(() => {
    onDataUpdate?.(weeklyData)
  }, [onDataUpdate, weeklyData])

  useEffect(() => {
    const handleStatsUpdated = () => {
      void refetch()
    }

    window.addEventListener('focus-stats-updated', handleStatsUpdated)
    return () =>
      window.removeEventListener('focus-stats-updated', handleStatsUpdated)
  }, [refetch])

  const showLoading = isLoading && weeklyData.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-light text-slate-200 whitespace-nowrap">
          Past 7 Days
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigatePeriod('prev')}
            className="p-1 rounded hover:bg-slate-800 transition-colors"
            aria-label="前7天">
            <svg
              className="w-4 h-4 text-slate-400"
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
          <span className="text-sm text-slate-400 min-w-[6rem] text-center whitespace-nowrap">
            {periodLabel}
          </span>
          <button
            onClick={() => navigatePeriod('next')}
            disabled={isCurrentPeriod}
            className="p-1 rounded hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="后7天">
            <svg
              className="w-4 h-4 text-slate-400"
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
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 rounded hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="刷新">
            <svg
              className={`w-4 h-4 text-slate-400 ${
                isFetching ? 'animate-spin' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-3xl p-6 flex-1 flex flex-col">
        {showLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <div
                className="grid h-full gap-3"
                style={{
                  gridTemplateColumns: `repeat(${weekDays.length || 1}, minmax(0, 1fr))`,
                }}>
                {weekDays.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center h-full min-w-0">
                    <div className="relative w-full flex-1 bg-slate-700 rounded-lg overflow-hidden mb-2">
                      <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                          item.isToday
                            ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                            : 'bg-gradient-to-t from-slate-500 to-slate-400'
                        }`}
                        style={{
                          height: `${Math.max(
                            (item.data.focus / maxFocus) * 100,
                            4
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-xs font-medium ${
                          item.isToday ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                        {item.day}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.data.focus}min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
