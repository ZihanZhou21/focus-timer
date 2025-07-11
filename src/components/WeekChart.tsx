// Week组件 - 显示过去7天的专注时间统计
import React, { useState, useEffect } from 'react'
import { formatTimeInHours } from '@/lib/utils'
import { weeklyStatsAPI } from '@/lib/weekly-stats-api'

interface DayData {
  day: string
  focus: number
  cycles: number
}

interface WeekChartProps {
  userId?: string
  onDataUpdate?: (weekData: DayData[]) => void
}

export default function WeekChart({
  userId = 'user_001',
  onDataUpdate,
}: WeekChartProps) {
  const [weeklyData, setWeeklyData] = useState<DayData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 生成过去7天数据
  const generateLast7DaysData = async (): Promise<DayData[]> => {
    try {
      // ✅ 使用专门的周度统计API，获取真实的任务执行时间
      console.log('Getting last 7 days task execution time statistics')
      const weeklyStats = await weeklyStatsAPI.getLast7DaysStats(userId)

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
  }

  // 计算最大专注时间（用于柱状图高度）
  const maxFocus =
    weeklyData.length > 0
      ? Math.max(...weeklyData.map((d) => d.focus), 120)
      : 120

  // 获取格式化的周数据
  const getWeekDays = () => {
    const today = new Date()
    const result = []

    for (let i = 0; i < weeklyData.length; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - i))
      const isToday = i === weeklyData.length - 1

      result.push({
        day: weeklyData[i].day,
        isToday,
        data: weeklyData[i],
      })
    }

    return result
  }

  // 刷新周数据
  const refreshWeekData = async () => {
    setIsLoading(true)
    try {
      const newWeekData = await generateLast7DaysData()
      setWeeklyData(newWeekData)
      onDataUpdate?.(newWeekData)
    } catch (error) {
      console.error('Failed to refresh weekly data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化数据
  useEffect(() => {
    refreshWeekData()
  }, [userId])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <h3 className="text-lg font-light mb-4 text-slate-200">Week</h3>
        <div className="bg-slate-800 rounded-3xl p-4 flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-light text-slate-200">Week</h3>
        <button
          onClick={refreshWeekData}
          className="text-slate-400 hover:text-slate-300 transition-colors"
          title="Refresh data">
          <svg
            className="w-4 h-4"
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

      <div className="bg-slate-800 rounded-3xl p-4 flex-1 flex flex-col mb-4">
        <h4 className="text-xs text-slate-400 mb-4">Last 7 Days Focus Time</h4>

        {/* 柱状图区域 */}
        <div className="flex items-end justify-between flex-1 mb-3">
          {getWeekDays().map(({ day, isToday, data }) => (
            <div
              key={day}
              className="flex flex-col items-center flex-1 mx-1 h-full">
              {/* 显示时间 */}
              <div
                className={`text-xs mb-2 transition-opacity duration-300 ${
                  data && (data.focus > 0 || isToday)
                    ? 'opacity-100'
                    : 'opacity-0'
                } ${isToday ? 'text-amber-400' : 'text-slate-300'}`}>
                {data && (data.focus > 0 || isToday)
                  ? formatTimeInHours(data.focus)
                  : ''}
              </div>

              {/* 柱状图条 */}
              <div className="w-full max-w-8 h-full flex flex-col justify-end">
                <div
                  className={`w-full rounded-xl transition-all duration-700 cursor-pointer hover:opacity-80 ${
                    isToday ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                  style={{
                    height: `${
                      data && data.focus > 0
                        ? Math.max((data.focus / maxFocus) * 100, 8)
                        : isToday
                        ? 8
                        : 0
                    }%`,
                  }}
                  title={`${day}: ${formatTimeInHours(
                    data?.focus || 0
                  )} focus time, ${data?.cycles || 0} pomodoros`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 日期标签 */}
        <div className="flex justify-between">
          {getWeekDays().map(({ day, isToday }) => (
            <div key={day} className="flex-1 mx-1">
              <div
                className={`text-xs text-center ${
                  isToday ? 'text-amber-400 font-medium' : 'text-slate-500'
                }`}>
                {day}
              </div>
            </div>
          ))}
        </div>

        {/* 统计汇总 */}
        {weeklyData.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                This Week Total:{' '}
                {formatTimeInHours(
                  weeklyData.reduce((sum, day) => sum + day.focus, 0)
                )}
              </span>
              <span>
                {weeklyData.reduce((sum, day) => sum + day.cycles, 0)} pomodoros
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 导出类型供其他组件使用
export type { DayData }
