'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 项目类型配置
const categoryConfig = {
  habit: {
    name: '习惯',
    color: 'bg-gray-400',
    description: '日常习惯打卡',
  },
  task: {
    name: '任务',
    color: 'bg-blue-400',
    description: '工作任务',
  },
  focus: {
    name: '专注',
    color: 'bg-amber-400',
    description: '深度专注',
  },
  exercise: {
    name: '运动',
    color: 'bg-green-400',
    description: '运动健身',
  },
}

type ProjectCategory = 'habit' | 'task' | 'focus' | 'exercise'
type TimePeriod = 'week' | 'month' | 'year'

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

  // 格式化时间显示 - 统一使用小时格式
  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h'
    const hours = minutes / 60
    return `${hours.toFixed(1)}h`
  }

  // 计算专注时间（按项目类型加权）
  const calculateFocusTime = (projects: ProjectItem[]) => {
    return projects.reduce((total, project) => {
      if (!project.completed) return total

      const weight = {
        focus: 1.0,
        task: 1.0,
        exercise: 0.7,
        habit: 0.5,
      }[project.category]

      return total + project.durationMinutes * weight
    }, 0)
  }

  // 计算循环次数
  const calculateCycles = (projects: ProjectItem[]) => {
    return projects.filter((p) => p.completed && p.durationMinutes >= 25).length
  }

  // 获取日期范围
  const getDateRange = (date: Date, period: TimePeriod) => {
    const start = new Date(date)
    const end = new Date(date)

    switch (period) {
      case 'week':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        end.setDate(start.getDate() + 6)
        break
      case 'month':
        start.setDate(1)
        end.setMonth(end.getMonth() + 1, 0)
        break
      case 'year':
        start.setMonth(0, 1)
        end.setMonth(11, 31)
        break
    }

    return { start, end }
  }

  // 生成日期标签
  const generateDateLabels = (start: Date, end: Date, period: TimePeriod) => {
    const labels = []
    const current = new Date(start)

    while (current <= end) {
      switch (period) {
        case 'week':
          labels.push(`${current.getMonth() + 1}/${current.getDate()}`)
          current.setDate(current.getDate() + 1)
          break
        case 'month':
          labels.push(`${current.getDate()}`)
          current.setDate(current.getDate() + 1)
          break
        case 'year':
          labels.push(`${current.getMonth() + 1}月`)
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    return labels
  }

  // 加载数据
  const loadPeriodData = async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(currentDate, selectedPeriod)
      const allProjects: ProjectItem[] = []

      // 根据时间段获取数据
      const current = new Date(start)
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        try {
          const response = await fetch(
            `/api/projects?date=${dateStr}&userId=user_001`
          )
          if (response.ok) {
            const dayProjects: ProjectItem[] = await response.json()
            allProjects.push(
              ...dayProjects.map((p) => ({ ...p, date: dateStr }))
            )
          }
        } catch (error) {
          console.error(`Failed to load data for ${dateStr}:`, error)
        }

        if (selectedPeriod === 'year') {
          current.setMonth(current.getMonth() + 1)
        } else {
          current.setDate(current.getDate() + 1)
        }
      }

      // 按日期分组数据
      const groupedData = new Map<string, ProjectItem[]>()
      allProjects.forEach((project) => {
        const key =
          selectedPeriod === 'year'
            ? project.date.substring(0, 7) // YYYY-MM
            : project.date

        if (!groupedData.has(key)) {
          groupedData.set(key, [])
        }
        groupedData.get(key)!.push(project)
      })

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
        const totalFocusTime = calculateFocusTime(dayProjects)
        const completedCycles = calculateCycles(dayProjects)

        const categoryBreakdown = {
          habit: calculateFocusTime(
            dayProjects.filter((p) => p.category === 'habit')
          ),
          task: calculateFocusTime(
            dayProjects.filter((p) => p.category === 'task')
          ),
          focus: calculateFocusTime(
            dayProjects.filter((p) => p.category === 'focus')
          ),
          exercise: calculateFocusTime(
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
    } finally {
      setIsLoading(false)
    }
  }

  // 监听时间段和日期变化
  useEffect(() => {
    loadPeriodData()
  }, [selectedPeriod, currentDate])

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

        <nav className="bg-slate-800 rounded-2xl p-1.5">
          <div className="flex space-x-2">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </Link>
            <Link
              href="/focus"
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Focus
            </Link>
            <Link
              href="/calendar"
              className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              History
            </Link>
          </div>
        </nav>

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
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-light text-amber-400 mb-2">
                  {formatTime(periodStats.totalFocusTime)}
                </div>
                <div className="text-sm text-slate-400 font-light">
                  总专注时间
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-light text-emerald-400 mb-2">
                  {periodStats.completedCycles}
                </div>
                <div className="text-sm text-slate-400 font-light">
                  完成循环
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-light text-blue-400 mb-2">
                  {formatTime(periodStats.averageSessionLength)}
                </div>
                <div className="text-sm text-slate-400 font-light">
                  平均时长
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="text-3xl font-light text-purple-400 mb-2">
                  {periodStats.streakDays}
                </div>
                <div className="text-sm text-slate-400 font-light">
                  连续天数
                </div>
              </div>
            </div>
          </div>

          {/* 专注趋势图 */}
          <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700/50">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-light text-slate-200">专注趋势</h2>
              <div className="flex items-center space-x-6">
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded ${config.color}`}></div>
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
                        {formatTime(data.totalFocusTime)}
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
                                title={`${names[segment.type]}: ${formatTime(
                                  segment.value
                                )}`}
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
