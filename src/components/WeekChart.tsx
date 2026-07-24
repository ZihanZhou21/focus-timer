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
  compact?: boolean
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
  compact = false,
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
  const totalFocus = weeklyData.reduce((total, day) => total + day.focus, 0)
  const totalCycles = weeklyData.reduce((total, day) => total + day.cycles, 0)
  const hasFocusData = totalFocus > 0 || totalCycles > 0

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
    <div className={compact ? 'flex flex-col' : 'flex h-full min-h-0 flex-col'}>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 ${
          compact ? 'mb-3' : 'mb-4'
        }`}>
        <h3
          className={`whitespace-nowrap font-medium text-[var(--foreground)] ${
            compact ? 'text-sm' : 'text-lg'
          }`}>
          {compact ? 'Focus rhythm' : 'Past 7 Days'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigatePeriod('prev')}
            className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
            aria-label="前7天">
            <svg
              className="w-4 h-4 text-[var(--muted-foreground)]"
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
          {!compact && (
            <span className="min-w-[6rem] whitespace-nowrap text-center text-sm text-[var(--muted-foreground)]">
              {periodLabel}
            </span>
          )}
          <button
            onClick={() => navigatePeriod('next')}
            disabled={isCurrentPeriod}
            className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-40"
            aria-label="后7天">
            <svg
              className="w-4 h-4 text-[var(--muted-foreground)]"
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
          {!compact && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded p-1 transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-40"
              aria-label="刷新">
              <svg
                className={`h-4 w-4 text-[var(--muted-foreground)] ${
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
          )}
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col border border-[var(--border)] bg-[var(--surface-solid)] ${
          compact
            ? 'h-[13.5rem] rounded-xl p-3'
            : 'rounded-2xl p-4 sm:p-5 xl:p-6'
        }`}>
        {showLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-[var(--muted-foreground)]">Loading...</div>
          </div>
        ) : !hasFocusData ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
              <svg
                className="h-5 w-5 text-[var(--accent)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 19h16M7 16V9m5 7V5m5 11v-4"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              No focus logged this week
            </p>
            <p className="mt-1 max-w-[15rem] text-xs leading-5 text-[var(--muted-foreground)]">
              Start a session to turn this into a useful rhythm chart.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className={`grid grid-cols-2 gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
              <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                <div className="text-[11px] text-[var(--muted-foreground)]">Focus</div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{totalFocus}min</div>
              </div>
              <div className="rounded-lg bg-[var(--surface-muted)] px-3 py-2">
                <div className="text-[11px] text-[var(--muted-foreground)]">Completed</div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{totalCycles}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <div
                className={`grid h-full ${compact ? 'gap-1.5' : 'gap-2 xl:gap-3'}`}
                style={{
                  gridTemplateColumns: `repeat(${weekDays.length || 1}, minmax(0, 1fr))`,
                }}>
                {weekDays.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center h-full min-w-0">
                    <div className="relative mb-2 w-full flex-1 overflow-hidden rounded-md bg-[var(--surface-muted)] ring-1 ring-[var(--border)]">
                      <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                          item.isToday ? 'bg-amber-400' : 'bg-[var(--accent)]'
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
                        className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium ${
                          item.isToday ? 'text-amber-500' : 'text-[var(--muted-foreground)]'
                        }`}>
                        {item.day}
                      </div>
                      <div
                        className={`${
                          compact ? 'text-[9px]' : 'text-xs'
                        } text-[var(--muted-foreground)]`}>
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
