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

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

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

      // 模拟专注数据
      const hasRecord = isCurrentMonth && Math.random() > 0.3
      const focusTime = hasRecord ? Math.floor(Math.random() * 300) + 60 : 0
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
      return `${hours}h${mins}m`
    }
    return `${mins}m`
  }

  const getIntensityColor = (focusTime: number) => {
    if (focusTime === 0) return 'bg-stone-100 dark:bg-slate-800'
    if (focusTime < 90) return 'bg-amber-100 dark:bg-amber-900/30'
    if (focusTime < 180) return 'bg-amber-200 dark:bg-amber-800/50'
    if (focusTime < 270) return 'bg-amber-300 dark:bg-amber-700/70'
    return 'bg-amber-400 dark:bg-amber-600'
  }

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
              href="/stats"
              className="text-slate-400 hover:text-white transition-colors">
              Stats
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
              专注日历
            </h1>
            <p className="text-slate-400">可视化查看您的专注活动热力图</p>
          </div>

          <div className="space-y-8">
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

              {/* 日期网格 */}
              <div className="grid grid-cols-7 gap-2">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square p-2 rounded-lg transition-all duration-200 border-2 ${
                      day.isToday
                        ? 'border-amber-400 shadow-md'
                        : 'border-transparent'
                    } ${getIntensityColor(
                      day.focusTime
                    )} hover:scale-105 cursor-pointer`}>
                    <div className="h-full flex flex-col justify-between">
                      <div
                        className={`text-sm font-light ${
                          day.isToday
                            ? 'text-amber-300'
                            : day.hasRecord
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}>
                        {day.date}
                      </div>

                      {day.hasRecord && (
                        <div className="text-xs space-y-1">
                          <div
                            className={`font-light ${
                              day.isToday ? 'text-amber-300' : 'text-slate-300'
                            }`}>
                            {formatTime(day.focusTime)}
                          </div>
                          <div
                            className={`text-xs ${
                              day.isToday ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                            {day.cycles}循环
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 强度图例 */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-light text-slate-200 mb-4 text-center">
                专注强度
              </h3>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs text-slate-400 font-light">较少</span>
                <div className="w-4 h-4 rounded bg-slate-700"></div>
                <div className="w-4 h-4 rounded bg-amber-900/30"></div>
                <div className="w-4 h-4 rounded bg-amber-800/50"></div>
                <div className="w-4 h-4 rounded bg-amber-700/70"></div>
                <div className="w-4 h-4 rounded bg-amber-600"></div>
                <span className="text-xs text-slate-400 font-light">较多</span>
              </div>
            </div>

            {/* 本月统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-light text-amber-400 mb-2">
                    {calendarData.filter((d) => d.hasRecord).length}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    专注天数
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-light text-emerald-400 mb-2">
                    {formatTime(
                      calendarData.reduce((sum, d) => sum + d.focusTime, 0)
                    )}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    总专注时间
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-light text-blue-400 mb-2">
                    {calendarData.reduce((sum, d) => sum + d.cycles, 0)}
                  </div>
                  <div className="text-sm text-slate-400 font-light">
                    完成循环
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
