'use client'

import { useEffect, useCallback, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { setWeeklyData, setStatsLoading } from '@/app/slices/statsSlice'
import { weeklyStatsAPI } from '@/lib/weekly-stats-api'

type DayData = {
  day: string
  focus: number
  cycles: number
}

interface WeekChartProps {
  userId?: string
  onDataUpdate?: (data: DayData[]) => void
}

// 计算过去N天的结束日期（从今天往前推N-1天）
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
  const dispatch = useDispatch()
  const { weeklyData, isLoading } = useSelector(
    (state: RootState) => state.stats
  )

  // 当前显示的7天期间的结束日期（默认为今天）
  const [endDate, setEndDate] = useState<Date>(() => getPastDaysEndDate(0))
  const isCurrentPeriod = endDate.toDateString() === new Date().toDateString()

  // 生成过去7天数据
  const loadWeekData = useCallback(async (): Promise<DayData[]> => {
    try {
      const endDateStr = endDate.toISOString().split('T')[0]
      console.log('Getting stats for 7 days ending:', endDateStr)

      // 使用weeklyStatsAPI获取7天数据，以endDate为结束日期
      const weeklyStats = await weeklyStatsAPI.getWeeklyStats(
        7,
        endDateStr,
        userId
      )

      // 转换为组件需要的数据格式（只统计TODO任务，不包含打卡任务）
      const data: DayData[] = weeklyStats.dailyStats.map((day) => ({
        day: day.dayLabel,
        focus: day.todoTime, // 只统计TODO任务执行时间（分钟），不包含打卡任务
        cycles: day.completedCount, // 完成的任务数量
      }))

      return data
    } catch (error) {
      console.error('Failed to load weekly data:', error)
      return []
    }
  }, [userId, endDate])

  // 计算最大专注时间（用于柱状图高度）
  const maxFocus =
    weeklyData.length > 0
      ? Math.max(...weeklyData.map((d) => d.focus), 120)
      : 120

  // 获取格式化的7天数据
  const getWeekDays = () => {
    const result = []
    const today = new Date().toDateString()

    for (let i = 0; i < weeklyData.length; i++) {
      const dayDate = new Date(endDate)
      dayDate.setDate(endDate.getDate() - (6 - i))
      const isToday = dayDate.toDateString() === today

      result.push({
        day: weeklyData[i].day,
        isToday,
        data: weeklyData[i],
      })
    }

    return result
  }

  // 刷新周数据
  const refreshWeekData = useCallback(async () => {
    dispatch(setStatsLoading(true))
    try {
      const newWeekData = await loadWeekData()
      dispatch(setWeeklyData(newWeekData))
      onDataUpdate?.(newWeekData)
    } catch (error) {
      console.error('Failed to refresh weekly data:', error)
    }
  }, [dispatch, onDataUpdate, loadWeekData])

  // 7天期间导航
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

  // 初始化数据
  useEffect(() => {
    refreshWeekData()
  }, [refreshWeekData, endDate])

  return (
    <div className="flex flex-col h-full">
      {/* 头部，与 ActivityCalendar 对齐 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-light text-slate-200">Past 7 Days</h3>
        <div className="flex items-center space-x-2">
          {/* 上一个7天按钮 */}
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
          {/* 期间范围标签 */}
          <span className="text-sm text-slate-400 min-w-[6rem] text-center">
            {periodLabel}
          </span>
          {/* 下一个7天按钮 */}
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
          {/* 刷新按钮 */}
          <button
            onClick={refreshWeekData}
            disabled={isLoading}
            className="p-1 rounded hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="刷新">
            <svg
              className={`w-4 h-4 text-slate-400 ${
                isLoading ? 'animate-spin' : ''
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

      {/* Chart 卡片 */}
      <div className="bg-slate-800 rounded-3xl p-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-400">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-end justify-between gap-2 flex-1">
              {getWeekDays().map((item, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full">
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
                      }}></div>
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
        )}
      </div>
    </div>
  )
}
