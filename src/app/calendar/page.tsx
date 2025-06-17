'use client'

import { useState } from 'react'
import Link from 'next/link'

// 项目类型配置
const categoryConfig = {
  habit: {
    name: '习惯',
    color: 'bg-gray-500',
  },
  task: {
    name: '任务',
    color: 'bg-blue-500',
  },
  focus: {
    name: '专注',
    color: 'bg-amber-500',
  },
  exercise: {
    name: '运动',
    color: 'bg-green-500',
  },
}

interface DayRecord {
  date: number
  focusTime: number
  cycles: number
  isToday?: boolean
  hasRecord?: boolean
}

interface DayData {
  day: string
  focus: number
  cycles: number
  taskBreakdown?: {
    habit: number
    task: number
    focus: number
    exercise: number
  }
}

interface StatsData {
  totalFocusTime: number
  completedCycles: number
  averageSessionLength: number
  streakDays: number
  dailyData: DayData[]
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'year'
  >('week')

  // 模拟统计数据
  const stats: Record<'week' | 'month' | 'year', StatsData> = {
    week: {
      totalFocusTime: 1260, // 分钟
      completedCycles: 14,
      averageSessionLength: 90,
      streakDays: 7,
      dailyData: [
        {
          day: '周一',
          focus: 180,
          cycles: 2,
          taskBreakdown: { habit: 30, task: 60, focus: 60, exercise: 30 },
        },
        {
          day: '周二',
          focus: 240,
          cycles: 3,
          taskBreakdown: { habit: 40, task: 80, focus: 80, exercise: 40 },
        },
        {
          day: '周三',
          focus: 90,
          cycles: 1,
          taskBreakdown: { habit: 20, task: 30, focus: 30, exercise: 10 },
        },
        {
          day: '周四',
          focus: 270,
          cycles: 3,
          taskBreakdown: { habit: 50, task: 90, focus: 90, exercise: 40 },
        },
        {
          day: '周五',
          focus: 180,
          cycles: 2,
          taskBreakdown: { habit: 30, task: 60, focus: 60, exercise: 30 },
        },
        {
          day: '周六',
          focus: 150,
          cycles: 2,
          taskBreakdown: { habit: 25, task: 50, focus: 50, exercise: 25 },
        },
        {
          day: '周日',
          focus: 150,
          cycles: 1,
          taskBreakdown: { habit: 25, task: 50, focus: 50, exercise: 25 },
        },
      ],
    },
    month: {
      totalFocusTime: 5400,
      completedCycles: 60,
      averageSessionLength: 90,
      streakDays: 25,
      dailyData: [
        {
          day: '第1周',
          focus: 1260,
          cycles: 14,
          taskBreakdown: { habit: 200, task: 420, focus: 420, exercise: 220 },
        },
        {
          day: '第2周',
          focus: 1350,
          cycles: 15,
          taskBreakdown: { habit: 220, task: 450, focus: 450, exercise: 230 },
        },
        {
          day: '第3周',
          focus: 1440,
          cycles: 16,
          taskBreakdown: { habit: 240, task: 480, focus: 480, exercise: 240 },
        },
        {
          day: '第4周',
          focus: 1350,
          cycles: 15,
          taskBreakdown: { habit: 220, task: 450, focus: 450, exercise: 230 },
        },
      ],
    },
    year: {
      totalFocusTime: 64800,
      completedCycles: 720,
      averageSessionLength: 90,
      streakDays: 300,
      dailyData: [
        {
          day: '1月',
          focus: 5400,
          cycles: 60,
          taskBreakdown: { habit: 900, task: 1800, focus: 1800, exercise: 900 },
        },
        {
          day: '2月',
          focus: 4860,
          cycles: 54,
          taskBreakdown: { habit: 810, task: 1620, focus: 1620, exercise: 810 },
        },
        {
          day: '3月',
          focus: 5940,
          cycles: 66,
          taskBreakdown: { habit: 990, task: 1980, focus: 1980, exercise: 990 },
        },
        {
          day: '4月',
          focus: 5400,
          cycles: 60,
          taskBreakdown: { habit: 900, task: 1800, focus: 1800, exercise: 900 },
        },
        {
          day: '5月',
          focus: 5760,
          cycles: 64,
          taskBreakdown: { habit: 960, task: 1920, focus: 1920, exercise: 960 },
        },
        {
          day: '6月',
          focus: 5220,
          cycles: 58,
          taskBreakdown: { habit: 870, task: 1740, focus: 1740, exercise: 870 },
        },
        {
          day: '7月',
          focus: 5580,
          cycles: 62,
          taskBreakdown: { habit: 930, task: 1860, focus: 1860, exercise: 930 },
        },
        {
          day: '8月',
          focus: 5940,
          cycles: 66,
          taskBreakdown: { habit: 990, task: 1980, focus: 1980, exercise: 990 },
        },
        {
          day: '9月',
          focus: 5400,
          cycles: 60,
          taskBreakdown: { habit: 900, task: 1800, focus: 1800, exercise: 900 },
        },
        {
          day: '10月',
          focus: 5580,
          cycles: 62,
          taskBreakdown: { habit: 930, task: 1860, focus: 1860, exercise: 930 },
        },
        {
          day: '11月',
          focus: 5220,
          cycles: 58,
          taskBreakdown: { habit: 870, task: 1740, focus: 1740, exercise: 870 },
        },
        {
          day: '12月',
          focus: 5700,
          cycles: 63,
          taskBreakdown: { habit: 950, task: 1900, focus: 1900, exercise: 950 },
        },
      ],
    },
  }

  const currentStats = stats[selectedPeriod]

  // 生成模拟日历数据
  const generateCalendarData = (year: number, month: number): DayRecord[] => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const today = new Date()

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days: DayRecord[] = []
    const currentIterDate = new Date(startDate)

    while (currentIterDate <= endDate) {
      const isCurrentMonth = currentIterDate.getMonth() === month
      const isToday = currentIterDate.toDateString() === today.toDateString()

      // 模拟专注数据 - 使用固定算法避免水合问题
      const dayHash =
        (currentIterDate.getDate() + currentIterDate.getMonth()) % 10
      const hasRecord = isCurrentMonth && dayHash > 3
      const focusTime = hasRecord ? 60 + dayHash * 30 : 0
      const cycles = hasRecord ? Math.floor(focusTime / 90) : 0

      days.push({
        date: currentIterDate.getDate(),
        focusTime,
        cycles,
        isToday,
        hasRecord: isCurrentMonth && hasRecord,
      })

      currentIterDate.setDate(currentIterDate.getDate() + 1)
    }

    return days
  }

  const calendarData = generateCalendarData(
    currentDate.getFullYear(),
    currentDate.getMonth()
  )

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const months = [
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

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    )
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getIntensityColor = (focusTime: number) => {
    if (focusTime === 0) return 'bg-slate-700'
    if (focusTime < 90) return 'bg-amber-900/30'
    if (focusTime < 180) return 'bg-amber-800/50'
    if (focusTime < 270) return 'bg-amber-700/70'
    return 'bg-amber-600'
  }

  const maxFocus = Math.max(
    ...currentStats.dailyData.map((d: DayData) => d.focus)
  )

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* 顶部导航栏 - 与主页面风格一致 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="text-xl font-bold text-slate-300">LOGO</div>

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
            <div className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              History
            </div>
          </div>
        </nav>

        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-200 mb-2">
              历史记录
            </h1>
            <p className="text-slate-400">查看您的专注统计和历史活动</p>
          </div>

          <div className="space-y-8">
            {/* 时间周期选择 */}
            <div className="flex justify-center mb-6">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-light text-amber-400 mb-2">
                    {formatTime(currentStats.totalFocusTime)}
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    总专注时间
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-light text-emerald-400 mb-2">
                    {currentStats.completedCycles}
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    完成循环
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-light text-blue-400 mb-2">
                    {formatTime(currentStats.averageSessionLength)}
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    平均时长
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
                <div className="text-center">
                  <div className="text-2xl font-light text-purple-400 mb-2">
                    {currentStats.streakDays}
                  </div>
                  <div className="text-xs text-slate-400 font-light">
                    连续天数
                  </div>
                </div>
              </div>
            </div>

            {/* 专注趋势图 */}
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-light text-slate-200">专注趋势</h3>
                {/* 图例 */}
                <div className="flex items-center gap-4">
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${config.color}`}></div>
                      <span className="text-xs text-slate-400">
                        {config.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-end justify-between h-80 gap-3">
                {currentStats.dailyData.map((data, index) => {
                  const breakdown = data.taskBreakdown || {
                    habit: 0,
                    task: 0,
                    focus: 0,
                    exercise: 0,
                  }

                  // 计算每个类型的高度百分比（基于320px容器高度）
                  const habitHeight =
                    data.focus > 0 ? (breakdown.habit / maxFocus) * 100 : 0
                  const taskHeight =
                    data.focus > 0 ? (breakdown.task / maxFocus) * 100 : 0
                  const focusHeight =
                    data.focus > 0 ? (breakdown.focus / maxFocus) * 100 : 0
                  const exerciseHeight =
                    data.focus > 0 ? (breakdown.exercise / maxFocus) * 100 : 0

                  // 创建显示的分段数组
                  const segments = []
                  if (breakdown.habit > 0)
                    segments.push({
                      type: 'habit',
                      height: habitHeight,
                      value: breakdown.habit,
                    })
                  if (breakdown.task > 0)
                    segments.push({
                      type: 'task',
                      height: taskHeight,
                      value: breakdown.task,
                    })
                  if (breakdown.focus > 0)
                    segments.push({
                      type: 'focus',
                      height: focusHeight,
                      value: breakdown.focus,
                    })
                  if (breakdown.exercise > 0)
                    segments.push({
                      type: 'exercise',
                      height: exerciseHeight,
                      value: breakdown.exercise,
                    })

                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end h-full group">
                      <div className="mb-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTime(data.focus)}
                      </div>
                      <div className="w-full flex flex-col justify-end cursor-pointer h-full">
                        {segments.map((segment, segmentIndex) => {
                          const isLast = segmentIndex === segments.length - 1
                          const colors: { [key: string]: string } = {
                            habit: 'bg-gray-400/70 hover:bg-gray-400/80',
                            task: 'bg-blue-400/70 hover:bg-blue-400/80',
                            focus: 'bg-amber-400/70 hover:bg-amber-400/80',
                            exercise: 'bg-green-400/70 hover:bg-green-400/80',
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
                              } rounded-md ${!isLast ? 'mb-0.5' : ''}`}
                              style={{ height: `${segment.height}%` }}
                              title={`${names[segment.type]}: ${formatTime(
                                segment.value
                              )}`}
                            />
                          )
                        })}
                      </div>
                      <div className="mt-3 text-xs text-slate-400 text-center">
                        {data.day}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 月份导航 */}
            <div className="flex items-center justify-between bg-slate-800 rounded-3xl p-4 border border-slate-700/50 mb-6">
              <button
                onClick={prevMonth}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors duration-200">
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

              <h2 className="text-lg font-light text-slate-200">
                {currentDate.getFullYear()}年 {months[currentDate.getMonth()]}
              </h2>

              <button
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors duration-200">
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

            {/* 日历网格 */}
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-light text-slate-200 mb-6">
                专注日历
              </h3>

              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-light text-slate-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日历格子 */}
              <div className="grid grid-cols-7 gap-2">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg p-2 text-xs flex flex-col items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 ${
                      day.isToday ? 'ring-2 ring-amber-400' : ''
                    } ${getIntensityColor(day.focusTime)}`}
                    title={
                      day.hasRecord
                        ? `${formatTime(day.focusTime)}, ${day.cycles}循环`
                        : '无专注记录'
                    }>
                    <span
                      className={`font-medium ${
                        day.isToday
                          ? 'text-amber-200'
                          : day.hasRecord
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}>
                      {day.date}
                    </span>
                    {day.hasRecord && (
                      <span className="text-xs text-slate-300 mt-1">
                        {formatTime(day.focusTime)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* 强度图例 */}
              <div className="flex items-center justify-center space-x-2 mt-6">
                <span className="text-xs text-slate-500">Less</span>
                <div className="w-3 h-3 rounded bg-slate-700"></div>
                <div className="w-3 h-3 rounded bg-amber-900/30"></div>
                <div className="w-3 h-3 rounded bg-amber-800/50"></div>
                <div className="w-3 h-3 rounded bg-amber-700/70"></div>
                <div className="w-3 h-3 rounded bg-amber-600"></div>
                <span className="text-xs text-slate-500">More</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
