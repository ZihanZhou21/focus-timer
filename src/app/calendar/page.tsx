'use client'

import { useState } from 'react'
import Link from 'next/link'

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
        { day: '周一', focus: 180, cycles: 2 },
        { day: '周二', focus: 240, cycles: 3 },
        { day: '周三', focus: 90, cycles: 1 },
        { day: '周四', focus: 270, cycles: 3 },
        { day: '周五', focus: 180, cycles: 2 },
        { day: '周六', focus: 150, cycles: 2 },
        { day: '周日', focus: 150, cycles: 1 },
      ],
    },
    month: {
      totalFocusTime: 5400,
      completedCycles: 60,
      averageSessionLength: 90,
      streakDays: 25,
      dailyData: [
        { day: '第1周', focus: 1260, cycles: 14 },
        { day: '第2周', focus: 1350, cycles: 15 },
        { day: '第3周', focus: 1440, cycles: 16 },
        { day: '第4周', focus: 1350, cycles: 15 },
      ],
    },
    year: {
      totalFocusTime: 64800,
      completedCycles: 720,
      averageSessionLength: 90,
      streakDays: 300,
      dailyData: [
        { day: '1月', focus: 5400, cycles: 60 },
        { day: '2月', focus: 4860, cycles: 54 },
        { day: '3月', focus: 5940, cycles: 66 },
        { day: '4月', focus: 5400, cycles: 60 },
        { day: '5月', focus: 5760, cycles: 64 },
        { day: '6月', focus: 5220, cycles: 58 },
        { day: '7月', focus: 5580, cycles: 62 },
        { day: '8月', focus: 5940, cycles: 66 },
        { day: '9月', focus: 5400, cycles: 60 },
        { day: '10月', focus: 5580, cycles: 62 },
        { day: '11月', focus: 5220, cycles: 58 },
        { day: '12月', focus: 5700, cycles: 63 },
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-slate-800">
        <div className="flex items-center space-x-12">
          <div className="text-xl font-bold text-slate-300">LOGO</div>
          <nav className="flex space-x-8">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/focus"
              className="text-slate-400 hover:text-white transition-colors">
              Focus
            </Link>
            <Link
              href="/calendar"
              className="text-white hover:text-amber-400 transition-colors">
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="p-8">
        <div className="container mx-auto max-w-6xl">
          {/* 页面标题 */}
          <div className="mb-12">
            <h1 className="text-4xl font-light text-slate-200 mb-2">
              历史记录
            </h1>
            <p className="text-slate-400">查看您的专注统计和历史活动</p>
          </div>

          <div className="space-y-8">
            {/* 时间周期选择 */}
            <div className="flex justify-center">
              <div className="bg-slate-800 rounded-lg p-1 border border-slate-700">
                {(['week', 'month', 'year'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                      selectedPeriod === period
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}>
                    {period === 'week' && '本周'}
                    {period === 'month' && '本月'}
                    {period === 'year' && '本年'}
                  </button>
                ))}
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-3xl font-light text-amber-400 mb-2">
                    {formatTime(currentStats.totalFocusTime)}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    总专注时间
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-3xl font-light text-emerald-400 mb-2">
                    {currentStats.completedCycles}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    完成循环
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-3xl font-light text-blue-400 mb-2">
                    {formatTime(currentStats.averageSessionLength)}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    平均时长
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-3xl font-light text-purple-400 mb-2">
                    {currentStats.streakDays}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    连续天数
                  </div>
                </div>
              </div>
            </div>

            {/* 专注趋势图 */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-light text-slate-200 mb-6">
                专注趋势
              </h3>
              <div className="flex items-end justify-between h-64 gap-2">
                {currentStats.dailyData.map((data, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="mb-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(data.focus)}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-700 hover:from-amber-500 hover:to-amber-300 cursor-pointer group"
                      style={{
                        height: `${Math.max(
                          (data.focus / maxFocus) * 100,
                          4
                        )}%`,
                      }}
                    />
                    <div className="mt-3 text-xs text-slate-400 text-center">
                      {data.day}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 月份导航 */}
            <div className="flex items-center justify-between bg-slate-800 rounded-lg p-6 border border-slate-700">
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

              <h2 className="text-xl font-light text-slate-200">
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
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-light text-slate-200 mb-6">
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
