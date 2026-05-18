'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { useGetMonthlyStatsQuery } from '@/lib/services/stats-api'

interface DayRecord {
  date: number
  focusTime: number
  cycles: number
  isToday?: boolean
  hasRecord?: boolean
  isCurrentMonth?: boolean
  fullDate?: string
}

interface ActivityCalendarProps {
  className?: string
  onDataUpdate?: (hasData: boolean) => void
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTimeInHours = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`
}

const getIntensityColor = (focusTime: number): string => {
  if (focusTime === 0) {
    return 'bg-[var(--surface-elevated)]'
  }
  if (focusTime <= 30) return 'bg-amber-100 dark:bg-amber-900/70'
  if (focusTime <= 60) return 'bg-amber-200 dark:bg-amber-800/80'
  if (focusTime <= 120) return 'bg-amber-300 dark:bg-amber-600/90'
  return 'bg-amber-400'
}

const getCalendarRange = (year: number, month: number) => {
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())

  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  return {
    startDate,
    endDate,
    startDateStr: getLocalDateString(startDate),
    endDateStr: getLocalDateString(endDate),
  }
}

export default function ActivityCalendar({
  className = '',
  onDataUpdate,
}: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const { startDate, endDate, startDateStr, endDateStr } = useMemo(
    () => getCalendarRange(year, month),
    [month, year]
  )

  const {
    data: monthlyStats,
    isLoading,
    isFetching,
    refetch,
  } = useGetMonthlyStatsQuery({
    year,
    month: month + 1,
    startDate: startDateStr,
    endDate: endDateStr,
    userId: DEFAULT_USER_ID,
  })

  const calendarData = useMemo<DayRecord[]>(() => {
    const todayStr = getLocalDateString(new Date())
    const statsByDate = new Map(
      monthlyStats?.dailyStats.map((day) => [day.date, day]) ?? []
    )
    const days: DayRecord[] = []
    const currentIterDate = new Date(startDate)

    while (currentIterDate <= endDate) {
      const dateStr = getLocalDateString(currentIterDate)
      const isCurrentMonth = currentIterDate.getMonth() === month
      const dayStats = statsByDate.get(dateStr)
      const focusTime = dayStats?.todoTime ?? 0
      const cycles = dayStats?.completedCount ?? 0

      days.push({
        date: currentIterDate.getDate(),
        focusTime,
        cycles,
        isToday: dateStr === todayStr,
        hasRecord: isCurrentMonth && focusTime > 0,
        isCurrentMonth,
        fullDate: dateStr,
      })

      currentIterDate.setDate(currentIterDate.getDate() + 1)
    }

    return days
  }, [endDate, month, monthlyStats, startDate])

  useEffect(() => {
    onDataUpdate?.(calendarData.some((day) => day.hasRecord))
  }, [calendarData, onDataUpdate])

  useEffect(() => {
    const handleStatsUpdated = () => {
      void refetch()
    }

    window.addEventListener('focus-stats-updated', handleStatsUpdated)
    return () =>
      window.removeEventListener('focus-stats-updated', handleStatsUpdated)
  }, [refetch])

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1))
      return newDate
    })
  }, [])

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-[var(--foreground)]">Activity</h3>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
          disabled={isFetching}
          aria-label="Previous month">
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
        <span className="text-sm text-[var(--muted-foreground)] min-w-[4rem] text-center">
          {MONTHS[currentDate.getMonth()]}
        </span>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 rounded hover:bg-[var(--surface-muted)] transition-colors"
          disabled={isFetching}
          aria-label="Next month">
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
      </div>
    </div>
  )

  const legend = (
    <div className="flex items-center justify-between mt-3 text-xs text-[var(--muted-foreground)]">
      <span>Less</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 rounded-sm bg-[var(--surface-elevated)] ring-1 ring-[var(--border)]" />
        <div className="w-2 h-2 rounded-sm bg-amber-100 dark:bg-amber-900/70" />
        <div className="w-2 h-2 rounded-sm bg-amber-200 dark:bg-amber-800/80" />
        <div className="w-2 h-2 rounded-sm bg-amber-300 dark:bg-amber-600/90" />
        <div className="w-2 h-2 rounded-sm bg-amber-400" />
      </div>
      <span>More</span>
    </div>
  )

  const calendarGrid = (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((day, index) => (
          <div key={index} className="text-center text-sm text-[var(--muted-foreground)] py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <div
            key={`${day.fullDate}-${index}`}
            className={`aspect-square rounded-full text-[11px] sm:text-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${
                day.isToday ? 'ring-1 ring-amber-400' : ''
            } ${
              day.isCurrentMonth
                ? getIntensityColor(day.focusTime)
                : 'bg-[var(--surface)]'
            }`}
            title={
              day.isCurrentMonth && day.hasRecord
                ? `${day.fullDate}: ${formatTimeInHours(day.focusTime)}, ${
                    day.cycles
                  } cycles`
                : day.isCurrentMonth
                ? `${day.fullDate}: no records`
                : ''
            }>
            <span
              className={`${
                day.isCurrentMonth
                  ? day.focusTime > 0
                    ? 'text-amber-950 dark:text-white'
                    : 'text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)]'
              }`}>
              {day.date}
            </span>
          </div>
        ))}
      </div>

      {legend}
    </div>
  )

  if (isLoading && calendarData.length === 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        {header}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 flex items-center justify-center">
          <div className="text-[var(--muted-foreground)] text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {header}
      {calendarGrid}
    </div>
  )
}

export interface ActivityCalendarRef {
  refreshData: () => void
}
