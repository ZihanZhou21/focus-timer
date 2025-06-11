'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function StatsPage() {
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

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
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
              href="/stats"
              className="text-white hover:text-amber-400 transition-colors">
              Stats
            </Link>
            <Link
              href="/calendar"
              className="text-slate-400 hover:text-white transition-colors">
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
              专注统计
            </h1>
            <p className="text-slate-400">追踪您的专注习惯和进步</p>
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

            {/* 每日数据图表 */}
            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-lg font-light text-slate-200 mb-6">
                {selectedPeriod === 'week' && '每日专注时间'}
                {selectedPeriod === 'month' && '每周专注时间'}
                {selectedPeriod === 'year' && '每月专注时间'}
              </h3>
              <div className="space-y-4">
                {currentStats.dailyData.map((day: DayData) => (
                  <div key={day.day} className="flex items-center space-x-4">
                    <div className="w-12 text-sm text-slate-400 font-light">
                      {day.day}
                    </div>
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(day.focus / maxFocus) * 100}%` }}
                      />
                    </div>
                    <div className="w-20 text-sm text-slate-400 font-light text-right">
                      {formatTime(day.focus)}
                    </div>
                    <div className="w-16 text-sm text-slate-500 font-light text-right">
                      {day.cycles}个循环
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 成就徽章 */}
            <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
              <h3 className="text-lg font-light text-slate-200 mb-6">
                成就徽章
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <div className="text-sm font-light text-slate-400">
                    连续7天专注
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">⭐</div>
                  <div className="text-sm font-light text-slate-400">
                    完成100个循环
                  </div>
                </div>
                <div className="text-center opacity-50">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-sm font-light text-slate-400">
                    月度专注王
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
