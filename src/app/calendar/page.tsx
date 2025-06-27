'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  categoryConfig,
  DEFAULT_USER_ID,
  ProjectCategory,
  TimePeriod,
} from '@/lib/constants'
import {
  formatTimeInHours,
  generateDateLabels,
  getDateRange,
} from '@/lib/utils'
import { dataUtils } from '@/lib/api'
import { dateRangeAPI } from '@/lib/date-range-api'
import AppNavigation from '@/components/AppNavigation'
import StatsCard from '@/components/StatsCard'

interface ProjectItem {
  id: string
  userId: string
  date: string
  time: string
  title: string
  durationMinutes: number
  icon: string
  iconColor: string
  category: ProjectCategory
  completed: boolean
  details?: string[]
}

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

  // 加载数据 - 优化为单次请求
  const loadPeriodData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(currentDate, selectedPeriod)

      // ✅ 使用批量API一次性获取日期范围的数据
      const startDateStr = start.toISOString().split('T')[0]
      const endDateStr = end.toISOString().split('T')[0]

      console.log(`批量获取日期范围数据: ${startDateStr} - ${endDateStr}`)
      const dateRangeData = await dateRangeAPI.getDateRangeData(
        startDateStr,
        endDateStr,
        DEFAULT_USER_ID
      )

      // 将批量数据转换为数组格式以保持兼容性
      const allProjects: ProjectItem[] = []
      Object.values(dateRangeData).forEach((dayProjects) => {
        allProjects.push(...dayProjects)
      })

      // 从批量数据创建分组数据
      const groupedData = new Map<string, ProjectItem[]>()
      Object.entries(dateRangeData).forEach(([dateStr, dayProjects]) => {
        groupedData.set(dateStr, dayProjects)
      })

      // 处理年视图的特殊分组（按月）
      if (selectedPeriod === 'year') {
        const monthlyGrouped = new Map<string, ProjectItem[]>()
        allProjects.forEach((project) => {
          const monthKey = project.date.substring(0, 7) // YYYY-MM
          if (!monthlyGrouped.has(monthKey)) {
            monthlyGrouped.set(monthKey, [])
          }
          monthlyGrouped.get(monthKey)!.push(project)
        })
        groupedData.clear()
        monthlyGrouped.forEach((projects, key) => {
          groupedData.set(key, projects)
        })
      }

      // 生成每日数据
      const dailyData: DayData[] = []
      const labels = generateDateLabels(start, end, selectedPeriod)

      labels.forEach((label, index) => {
        let dateKey: string
        const tempDate = new Date(start)

        if (selectedPeriod === 'year') {
          tempDate.setMonth(index)
          dateKey = `${tempDate.getFullYear()}-${(tempDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`
        } else if (selectedPeriod === 'month') {
          tempDate.setDate(index + 1)
          dateKey = tempDate.toISOString().split('T')[0]
        } else {
          tempDate.setDate(tempDate.getDate() + index)
          dateKey = tempDate.toISOString().split('T')[0]
        }

        const dayProjects = groupedData.get(dateKey) || []
        const totalFocusTime = dataUtils.calculateFocusTime(dayProjects)
        const completedCycles = dataUtils.calculateCycles(dayProjects)

        const categoryBreakdown = {
          habit: dataUtils.calculateFocusTime(
            dayProjects.filter((p) => p.category === 'habit')
          ),
          task: dataUtils.calculateFocusTime(
            dayProjects.filter((p) => p.category === 'task')
          ),
          focus: dataUtils.calculateFocusTime(
            dayProjects.filter((p) => p.category === 'focus')
          ),
          exercise: dataUtils.calculateFocusTime(
            dayProjects.filter((p) => p.category === 'exercise')
          ),
        }

        dailyData.push({
          date: dateKey,
          day: label,
          totalFocusTime,
          completedCycles,
          totalProjects: dayProjects.length,
          completedProjects: dayProjects.filter((p) => p.completed).length,
          categoryBreakdown,
        })
      })

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
