'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { monthlyStatsAPI, DailyStats } from '@/lib/monthly-stats-api'

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
  if (focusTime === 0) return 'bg-slate-700/50'
  if (focusTime <= 30) return 'bg-amber-900/70'
  if (focusTime <= 60) return 'bg-amber-800/80'
  if (focusTime <= 120) return 'bg-amber-600/90'
  return 'bg-amber-400'
}

export default function ActivityCalendar({
  className = '',
  onDataUpdate,
}: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<DayRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 生成日历数据
  const generateCalendarData = useCallback(
    async (year: number, month: number): Promise<DayRecord[]> => {
      const today = new Date()
      const todayStr = getLocalDateString(today)

      // 计算月份的第一天和最后一天
      const firstDayOfMonth = new Date(year, month, 1)
      const lastDayOfMonth = new Date(year, month + 1, 0)

      // 计算需要显示的完整网格范围（包含前后月份的日期）
      const firstDayOfWeek = firstDayOfMonth.getDay()
      const startDate = new Date(firstDayOfMonth)
      startDate.setDate(startDate.getDate() - firstDayOfWeek)

      const endDate = new Date(lastDayOfMonth)
      const remainingDays = 6 - endDate.getDay()
      endDate.setDate(endDate.getDate() + remainingDays)

      try {
        // ✅ 使用月度统计API一次性获取整个日历网格的任务执行时间数据
        console.log(`获取日历网格数据: ${year}-${month + 1}`)
        const monthlyStats = await monthlyStatsAPI.getMonthlyStatsWithDateRange(
          year,
          month + 1, // monthlyStatsAPI使用1-12月份格式
          getLocalDateString(startDate),
          getLocalDateString(endDate),
          DEFAULT_USER_ID
        )

        console.log(
          '获取月度统计数据成功:',
          monthlyStats.dailyStats.length,
          '天的数据'
        )

        const days: DayRecord[] = []
        const currentIterDate = new Date(startDate)

        // 生成完整的日历网格
        while (currentIterDate <= endDate) {
          const isCurrentMonth = currentIterDate.getMonth() === month
          const dateStr = getLocalDateString(currentIterDate)
          const isToday = dateStr === todayStr

          // ✅ 从月度统计数据中获取当天的执行时间和任务数据（只统计TODO任务，不包含打卡任务）
          const dayStats = monthlyStats.dailyStats.find(
            (day: DailyStats) => day.date === dateStr
          )
          const focusTime = dayStats ? dayStats.todoTime : 0 // 只统计TODO任务时间（分钟），不包含打卡任务
          const cycles = dayStats ? dayStats.completedCount : 0 // 使用完成任务数作为周期数
          const hasRecord = dayStats ? dayStats.todoTime > 0 : false

          days.push({
            date: currentIterDate.getDate(),
            focusTime,
            cycles,
            isToday,
            hasRecord: isCurrentMonth && hasRecord,
            isCurrentMonth,
            fullDate: dateStr,
          })

          currentIterDate.setDate(currentIterDate.getDate() + 1)
        }

        console.log(
          'Generated calendar days:',
          days.map((d) => ({
            date: d.date,
            fullDate: d.fullDate,
            isCurrentMonth: d.isCurrentMonth,
            hasRecord: d.hasRecord,
            focusTime: d.focusTime,
            cycles: d.cycles,
          }))
        )

        return days
      } catch (error) {
        console.error('Failed to load calendar data:', error)
        return []
      }
    },
    []
  )

  // 导航函数
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }, [])

  const prevMonth = useCallback(() => navigateMonth('prev'), [navigateMonth])
  const nextMonth = useCallback(() => navigateMonth('next'), [navigateMonth])

  // 刷新数据
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const newCalendarData = await generateCalendarData(
        currentDate.getFullYear(),
        currentDate.getMonth()
      )
      setCalendarData(newCalendarData)

      // 通知父组件数据更新
      if (onDataUpdate) {
        const hasData = newCalendarData.some((day) => day.hasRecord)
        onDataUpdate(hasData)
      }
    } catch (error) {
      console.error('Failed to update calendar data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, generateCalendarData, onDataUpdate])

  // 初始化和月份变化时更新数据
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // 头部组件
  const ActivityHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-light text-slate-200">Activity</h3>
      <div className="flex items-center space-x-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-slate-800 transition-colors"
          disabled={isLoading}
          aria-label="上个月">
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
        <span className="text-sm text-slate-400 min-w-[4rem] text-center">
          {MONTHS[currentDate.getMonth()]}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-slate-800 transition-colors"
          disabled={isLoading}
          aria-label="下个月">
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
      </div>
    </div>
  )

  // 单个日历日期组件
  const CalendarDay = ({ day }: { day: DayRecord }) => {
    return (
      <div
        className={`aspect-square rounded-full text-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${
          day.isToday ? 'ring-1 ring-amber-400' : ''
        } ${
          day.isCurrentMonth
            ? getIntensityColor(day.focusTime)
            : 'bg-slate-700/30'
        }`}
        title={
          day.isCurrentMonth && day.hasRecord
            ? `${day.fullDate}: ${formatTimeInHours(day.focusTime)}, ${
                day.cycles
              }循环`
            : day.isCurrentMonth
            ? `${day.fullDate}: 无记录`
            : ''
        }>
        <span
          className={`${day.isCurrentMonth ? 'text-white' : 'text-slate-500'}`}>
          {day.date}
        </span>
      </div>
    )
  }

  // 日历网格组件
  const CalendarGrid = () => (
    <div className="bg-slate-800 rounded-3xl p-3">
      {/* 星期标题行 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((day, index) => (
          <div key={index} className="text-center text-md text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <CalendarDay key={`${day.fullDate}-${index}`} day={day} />
        ))}
      </div>

      {/* 颜色强度图例 */}
      <IntensityLegend />
    </div>
  )

  // 强度图例组件
  const IntensityLegend = () => (
    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
      <span>Less</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 rounded-sm bg-slate-700/50"></div>
        <div className="w-2 h-2 rounded-sm bg-amber-900/70"></div>
        <div className="w-2 h-2 rounded-sm bg-amber-800/80"></div>
        <div className="w-2 h-2 rounded-sm bg-amber-600/90"></div>
        <div className="w-2 h-2 rounded-sm bg-amber-400"></div>
      </div>
      <span>More</span>
    </div>
  )

  // 加载状态组件
  const LoadingState = () => (
    <div className="bg-slate-800 rounded-3xl p-6 flex items-center justify-center">
      <div className="text-slate-400 text-sm">加载中...</div>
    </div>
  )

  if (isLoading && calendarData.length === 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        <ActivityHeader />
        <LoadingState />
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <ActivityHeader />
      <CalendarGrid />
    </div>
  )
}

export interface ActivityCalendarRef {
  refreshData: () => void
}
