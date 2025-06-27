'use client'

import { useState, useEffect, useCallback } from 'react'
import { categoryConfig, DEFAULT_USER_ID, TimePeriod } from '@/lib/constants'
import { formatTimeInHours, getDateRange } from '@/lib/utils'
import { weeklyStatsAPI } from '@/lib/weekly-stats-api'
import { monthlyStatsAPI } from '@/lib/monthly-stats-api'
import AppNavigation from '@/components/AppNavigation'
import StatsCard from '@/components/StatsCard'

interface DayData {
  date: string
  day: string
  totalFocusTime: number
  completedCycles: number
  totalProjects: number
  completedProjects: number
  categoryBreakdown: {
    habit: number
    task: number
    focus: number
    exercise: number
  }
}

interface PeriodStats {
  totalFocusTime: number
  completedCycles: number
  averageSessionLength: number
  streakDays: number
  dailyData: DayData[]
}

export default function CalendarPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [periodStats, setPeriodStats] = useState<PeriodStats>({
    totalFocusTime: 0,
    completedCycles: 0,
    averageSessionLength: 0,
    streakDays: 0,
    dailyData: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据 - 使用新的统计API
  const loadPeriodData = useCallback(async () => {
    setIsLoading(true)
    try {
      let dailyData: DayData[] = []

      if (selectedPeriod === 'week') {
        // 使用周度统计API
        console.log('使用周度统计API获取数据')
        const weeklyStats = await weeklyStatsAPI.getLast7DaysStats(
          DEFAULT_USER_ID
        )

        dailyData = weeklyStats.dailyStats.map((day) => ({
          date: day.date,
          day: day.dayLabel,
          totalFocusTime: day.todoTime, // 只统计TODO任务时间
          completedCycles: day.completedCount,
          totalProjects: day.taskCount,
          completedProjects: day.completedCount,
          categoryBreakdown: {
            habit: 0, // 新API不区分类别，统一为TODO时间
            task: day.todoTime,
            focus: 0,
            exercise: 0,
          },
        }))
      } else if (selectedPeriod === 'month') {
        // 使用月度统计API
        console.log('使用月度统计API获取数据')
        const monthlyStats = await monthlyStatsAPI.getMonthlyStats(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          DEFAULT_USER_ID
        )

        dailyData = monthlyStats.dailyStats.map((day) => ({
          date: day.date,
          day: new Date(day.date).getDate().toString(),
          totalFocusTime: day.todoTime, // 只统计TODO任务时间
          completedCycles: day.completedCount,
          totalProjects: day.taskCount,
          completedProjects: day.completedCount,
          categoryBreakdown: {
            habit: 0, // 新API不区分类别，统一为TODO时间
            task: day.todoTime,
            focus: 0,
            exercise: 0,
          },
        }))
      } else {
        // 年视图：使用多个月度API
        console.log('使用多个月度API获取年度数据')
        const year = currentDate.getFullYear()
        const monthlyPromises = []

        for (let month = 1; month <= 12; month++) {
          monthlyPromises.push(
            monthlyStatsAPI.getMonthlyStats(year, month, DEFAULT_USER_ID)
          )
        }

        const monthlyResults = await Promise.all(monthlyPromises)

        dailyData = monthlyResults.map((monthlyStats, index) => {
          const monthTotalTime = monthlyStats.dailyStats.reduce(
            (sum, day) => sum + day.todoTime,
            0
          )
          const monthCompletedCount = monthlyStats.dailyStats.reduce(
            (sum, day) => sum + day.completedCount,
            0
          )
          const monthTaskCount = monthlyStats.dailyStats.reduce(
            (sum, day) => sum + day.taskCount,
            0
          )

          return {
            date: `${year}-${(index + 1).toString().padStart(2, '0')}`,
            day: `${index + 1}月`,
            totalFocusTime: monthTotalTime,
            completedCycles: monthCompletedCount,
            totalProjects: monthTaskCount,
            completedProjects: monthCompletedCount,
            categoryBreakdown: {
              habit: 0,
              task: monthTotalTime,
              focus: 0,
              exercise: 0,
            },
          }
        })
      }

      // 计算总体统计
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

      // 计算连续天数
      let streakDays = 0
      for (let i = dailyData.length - 1; i >= 0; i--) {
        if (dailyData[i].totalFocusTime > 0) {
          streakDays++
        } else {
          break
        }
      }

      setPeriodStats({
        totalFocusTime,
        completedCycles,
        averageSessionLength,
        streakDays,
        dailyData,
      })
    } catch (error) {
      console.error('Failed to load period data:', error)
      // 设置空数据以避免界面崩溃
      setPeriodStats({
        totalFocusTime: 0,
        completedCycles: 0,
        averageSessionLength: 0,
        streakDays: 0,
        dailyData: [],
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriod, currentDate])

  // 监听时间段和日期变化
  useEffect(() => {
    loadPeriodData()
  }, [loadPeriodData])

  // 导航函数
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

  // 获取当前时间段标题
  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'week':
        const { start, end } = getDateRange(currentDate, 'week')
        return `${start.getMonth() + 1}/${start.getDate()} - ${
          end.getMonth() + 1
        }/${end.getDate()}`
      case 'month':
        return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
      case 'year':
        return `${currentDate.getFullYear()}年`
    }
  }

  const maxFocusTime = Math.max(
    ...periodStats.dailyData.map((d) => d.totalFocusTime),
    60
  )

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="text-xl font-bold text-slate-300">Focus Timer</div>
        </div>

        <AppNavigation />

        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* 时间段选择器 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigatePeriod('prev')}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <svg
                  className="w-5 h-5 text-slate-400"
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

              <h1 className="text-2xl font-light text-slate-200 min-w-[200px] text-center">
                {getPeriodTitle()}
              </h1>

              <button
                onClick={() => navigatePeriod('next')}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <svg
                  className="w-5 h-5 text-slate-400"
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

            <div className="bg-slate-800 rounded-2xl p-1.5">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-6 py-2.5 rounded-xl font-medium text-base transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}>
                  {period === 'week' && '本周'}
                  {period === 'month' && '本月'}
                  {period === 'year' && '本年'}
                </button>
              ))}
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="总专注时间"
              value={formatTimeInHours(periodStats.totalFocusTime)}
              color="amber"
            />
            <StatsCard
              title="完成循环"
              value={periodStats.completedCycles}
              color="emerald"
            />
            <StatsCard
              title="平均时长"
              value={formatTimeInHours(periodStats.averageSessionLength)}
              color="blue"
            />
            <StatsCard
              title="连续天数"
              value={periodStats.streakDays}
              color="purple"
            />
          </div>

          {/* 专注趋势图 */}
          <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700/50">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-light text-slate-200">专注趋势</h2>
              <div className="flex items-center space-x-6">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded ${config.lightColor}`}></div>
                    <span className="text-sm text-slate-400">
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

                  // 计算每个类型的高度百分比
                  const habitHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown.habit / maxFocusTime) * 100
                      : 0
                  const taskHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown.task / maxFocusTime) * 100
                      : 0
                  const focusHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown.focus / maxFocusTime) * 100
                      : 0
                  const exerciseHeight =
                    maxFocusTime > 0
                      ? (categoryBreakdown.exercise / maxFocusTime) * 100
                      : 0

                  // 创建显示的分段数组
                  const segments = []
                  if (categoryBreakdown.habit > 0)
                    segments.push({
                      type: 'habit',
                      height: habitHeight,
                      value: categoryBreakdown.habit,
                    })
                  if (categoryBreakdown.task > 0)
                    segments.push({
                      type: 'task',
                      height: taskHeight,
                      value: categoryBreakdown.task,
                    })
                  if (categoryBreakdown.focus > 0)
                    segments.push({
                      type: 'focus',
                      height: focusHeight,
                      value: categoryBreakdown.focus,
                    })
                  if (categoryBreakdown.exercise > 0)
                    segments.push({
                      type: 'exercise',
                      height: exerciseHeight,
                      value: categoryBreakdown.exercise,
                    })

                  // 设置最小柱子宽度
                  const minBarWidth =
                    selectedPeriod === 'month'
                      ? 20
                      : selectedPeriod === 'year'
                      ? 60
                      : 40

                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center justify-end h-full group cursor-pointer"
                      style={{
                        minWidth: `${minBarWidth}px`,
                        flex: '1',
                      }}>
                      {/* 悬停时显示总时间 */}
                      <div className="mb-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatTimeInHours(data.totalFocusTime)}
                      </div>

                      {/* 堆叠柱状图 */}
                      <div className="w-full flex flex-col justify-end h-full min-h-[20px]">
                        {segments.length > 0 ? (
                          segments.map((segment, segmentIndex) => {
                            const colors: { [key: string]: string } = {
                              habit: 'bg-gray-400/70 hover:bg-gray-400/90',
                              task: 'bg-blue-400/70 hover:bg-blue-400/90',
                              focus: 'bg-amber-400/70 hover:bg-amber-400/90',
                              exercise: 'bg-green-400/70 hover:bg-green-400/90',
                            }

                            const names: { [key: string]: string } = {
                              habit: '习惯',
                              task: '任务',
                              focus: '专注',
                              exercise: '运动',
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
                          <div className="w-full h-2 bg-slate-700/50 rounded-md" />
                        )}
                      </div>

                      {/* 日期标签 */}
                      <div className="mt-3 text-xs text-slate-400 text-center whitespace-nowrap">
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
