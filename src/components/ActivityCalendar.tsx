'use client'

import { useState, useEffect, useCallback } from 'react'
import { dataUtils, ProjectItem } from '@/lib/api'
import { DEFAULT_USER_ID } from '@/lib/constants'
import {
  formatTimeInHours,
  getIntensityColor,
  groupProjectsByDate,
} from '@/lib/utils'

// 类型定义
interface DayRecord {
  date: number
  focusTime: number
  cycles: number
  isToday?: boolean
  hasRecord?: boolean
  isCurrentMonth?: boolean
  fullDate?: string // 添加完整日期字符串用于调试
}

interface ActivityCalendarProps {
  className?: string
  onDataUpdate?: (hasData: boolean) => void
}

// 月份常量
const MONTHS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]

// 星期标题
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// 辅助函数：获取本地日期字符串（避免时区问题）
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ActivityCalendar({
  className = '',
  onDataUpdate,
}: ActivityCalendarProps) {
  // 状态管理
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<DayRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 生成日历数据 - 完整的日历网格
  const generateCalendarData = useCallback(
    async (year: number, month: number): Promise<DayRecord[]> => {
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const today = new Date()

      // 计算完整日历网格的开始和结束日期
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay()) // 回到周日

      const endDate = new Date(lastDay)
      const daysAfterMonth = 6 - lastDay.getDay() // 到周六还需要几天
      endDate.setDate(lastDay.getDate() + daysAfterMonth)

      const startDateStr = getLocalDateString(startDate)
      const endDateStr = getLocalDateString(endDate)
      const todayStr = getLocalDateString(today)

      console.log('Calendar range:', {
        startDateStr,
        endDateStr,
        currentMonth: month,
      })

      try {
        // 请求完整网格范围的数据
        const response = await fetch(
          `/api/projects?startDate=${startDateStr}&endDate=${endDateStr}&userId=${DEFAULT_USER_ID}&isTemplate=false`
        )

        if (response.ok) {
          const allProjects: ProjectItem[] = await response.json()
          const projectsByDate = groupProjectsByDate(allProjects)

          console.log('Projects by date:', Object.fromEntries(projectsByDate))

          const days: DayRecord[] = []
          const currentIterDate = new Date(startDate)

          // 生成完整的日历网格
          while (currentIterDate <= endDate) {
            const isCurrentMonth = currentIterDate.getMonth() === month
            const dateStr = getLocalDateString(currentIterDate)
            const isToday = dateStr === todayStr

            const dayProjects = projectsByDate.get(dateStr) || []
            const focusTime = dataUtils.calculateFocusTime(dayProjects)
            const cycles = dataUtils.calculateCycles(dayProjects)
            const hasRecord = dayProjects.some(
              (p) => p.completed && p.durationMinutes > 0
            )

            days.push({
              date: currentIterDate.getDate(),
              focusTime,
              cycles,
              isToday,
              hasRecord: isCurrentMonth && hasRecord, // 只有当月的记录才算有效
              isCurrentMonth,
              fullDate: dateStr, // 用于调试
            })

            // 移动到下一天
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
            }))
          )

          return days
        }
      } catch (error) {
        console.error('Failed to load calendar data:', error)
      }

      return []
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

      {/* 日历网格 - 完整的周网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <CalendarDay key={`${day.fullDate}-${index}`} day={day} />
        ))}
      </div>

      {/* 颜色强度图例 */}
      <IntensityLegend />
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
            : 'bg-slate-700/30' // 其他月份显示淡色背景
        }`}
        title={
          day.isCurrentMonth && day.hasRecord
            ? `${day.fullDate}: ${formatTimeInHours(day.focusTime)}, ${
                day.cycles
              }循环`
            : day.isCurrentMonth
            ? `${day.fullDate}: 无专注记录`
            : `${day.fullDate}: 其他月份`
        }>
        <span
          className={`${
            day.isToday
              ? 'text-amber-200 font-medium'
              : day.isCurrentMonth
              ? day.hasRecord
                ? 'text-slate-200'
                : 'text-slate-500'
              : 'text-slate-600' // 其他月份显示更淡的颜色
          }`}>
          {day.date}
        </span>
      </div>
    )
  }

  // 强度图例组件
  const IntensityLegend = () => (
    <div className="flex items-center justify-center space-x-1 mt-3">
      <span className="text-xs text-slate-500">Less</span>
      <div className="w-2 h-2 rounded bg-slate-700"></div>
      <div className="w-2 h-2 rounded bg-amber-900/30"></div>
      <div className="w-2 h-2 rounded bg-amber-800/50"></div>
      <div className="w-2 h-2 rounded bg-amber-700/70"></div>
      <div className="w-2 h-2 rounded bg-amber-600"></div>
      <span className="text-xs text-slate-500">More</span>
    </div>
  )

  // 加载状态组件
  const LoadingState = () => (
    <div className="bg-slate-800 rounded-3xl p-3 h-48 flex items-center justify-center">
      <div className="text-slate-400 text-sm">加载中...</div>
    </div>
  )

  return (
    <div className={`flex-shrink-0 ${className}`}>
      <ActivityHeader />
      {isLoading ? <LoadingState /> : <CalendarGrid />}
    </div>
  )
}

// 导出组件引用接口
export interface ActivityCalendarRef {
  refreshData: () => void
}
