'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getTodayStats, formatFocusTime, type DailyStats } from '@/lib/storage'

// 数据接口定义
interface DayData {
  day: string
  focus: number
  cycles: number
}

interface DayRecord {
  date: number
  focusTime: number
  cycles: number
  isToday?: boolean
  hasRecord?: boolean
}

interface TimelineItem {
  id: string
  time: string
  title: string
  duration?: string
  details?: string[]
  icon: string
  iconColor: string
}

export default function Home() {
  const [todayStats, setTodayStats] = useState<DailyStats>({
    date: '',
    totalFocusTime: 0,
    completedSessions: 0,
    totalSessions: 0,
  })

  const [tasks, setTasks] = useState<string[]>([])
  const [newTask, setNewTask] = useState('')
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks'>('timer')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weeklyData, setWeeklyData] = useState<DayData[]>([])
  const [isMounted, setIsMounted] = useState(false)

  // 在客户端加载今日统计
  useEffect(() => {
    // 为开发阶段添加一些示例数据（如果localStorage为空的话）
    if (typeof window !== 'undefined') {
      const existingSessions = localStorage.getItem('focus-sessions')
      if (!existingSessions) {
        const today = new Date().toISOString().split('T')[0]
        const sampleSessions = [
          {
            id: 'sample1',
            date: today,
            startTime: 1700000000000, // 固定时间戳
            duration: 25, // 25分钟
            targetDuration: 25,
            completed: true,
          },
          {
            id: 'sample2',
            date: today,
            startTime: 1700001800000, // 固定时间戳
            duration: 30, // 30分钟
            targetDuration: 30,
            completed: true,
          },
        ]
        localStorage.setItem('focus-sessions', JSON.stringify(sampleSessions))
      }
    }

    setTodayStats(getTodayStats())
    setIsMounted(true)
  }, [])

  // 时间线数据
  const timelineData: TimelineItem[] = [
    {
      id: '1',
      time: '06:00',
      title: '起床',
      icon: '☀️',
      iconColor: 'bg-yellow-500',
    },
    {
      id: '2',
      time: '06:30',
      title: '晨练',
      duration: '30 分钟',
      details: ['俯卧撑 x20', '仰卧起坐 x30', '拉伸运动'],
      icon: '💪',
      iconColor: 'bg-green-500',
    },
    {
      id: '3',
      time: '07:30',
      title: '早餐',
      duration: '20 分钟',
      icon: '🍳',
      iconColor: 'bg-orange-500',
    },
    {
      id: '4',
      time: '08:00',
      title: '深度专注',
      duration: '2 小时',
      details: ['番茄钟工作法', '完成核心任务', '无干扰环境'],
      icon: '🎯',
      iconColor: 'bg-blue-500',
    },
    {
      id: '5',
      time: '10:30',
      title: '短暂休息',
      duration: '15 分钟',
      icon: '☕',
      iconColor: 'bg-amber-600',
    },
    {
      id: '6',
      time: '12:00',
      title: '午餐时间',
      duration: '45 分钟',
      icon: '🥗',
      iconColor: 'bg-emerald-500',
    },
    {
      id: '7',
      time: '14:00',
      title: '会议时间',
      duration: '1 小时',
      details: ['团队会议', '项目进度讨论', '下午计划'],
      icon: '👥',
      iconColor: 'bg-purple-500',
    },
    {
      id: '8',
      time: '18:00',
      title: '运动时间',
      duration: '1 小时',
      details: ['跑步 5公里', '力量训练', '拉伸放松'],
      icon: '🏃',
      iconColor: 'bg-red-500',
    },
  ]

  // 当todayStats更新后，重新生成过去7天的数据
  useEffect(() => {
    const generateLast7DaysData = (): DayData[] => {
      const data: DayData[] = []
      const today = new Date()

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)

        const dayNames = [
          '周日',
          '周一',
          '周二',
          '周三',
          '周四',
          '周五',
          '周六',
        ]
        const dayName = dayNames[date.getDay()]

        // 模拟专注数据，今天的数据可以是实际数据
        const isToday = i === 0
        // 使用固定的模拟数据避免水合问题
        const mockData = [240, 180, 120, 300, 150, 90, 210] // 固定的7天数据
        const focus = isToday
          ? Math.max(todayStats.totalFocusTime, 0) // 今天使用真实数据，但至少为0
          : mockData[6 - i] || 120 // 使用固定数据
        const cycles = Math.floor(focus / 90)

        data.push({
          day: dayName,
          focus,
          cycles,
        })
      }

      return data
    }

    setWeeklyData(generateLast7DaysData())
  }, [todayStats])

  const maxFocus =
    weeklyData.length > 0
      ? Math.max(...weeklyData.map((d) => d.focus), 120)
      : 120 // 至少120分钟作为最大值

  // 生成日历数据
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
      const hasRecord = isCurrentMonth && dayHash > 3 // 固定的模式
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

  // 添加任务
  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()])
      setNewTask('')
    }
  }

  // 删除任务
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  // 获取过去7天的显示数据
  const getWeekDays = () => {
    const today = new Date()
    const result = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayAbbrev = dayAbbrevs[date.getDay()]
      const isToday = i === 0

      result.push({
        day: dayAbbrev,
        isToday,
        data: weeklyData[6 - i], // 对应数据数组中的位置
      })
    }

    return result
  }

  // 格式化时间显示
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h${mins}m`
    }
    return `${mins}m`
  }

  // 获取专注强度颜色
  const getIntensityColor = (focusTime: number) => {
    if (focusTime === 0) return 'bg-slate-700'
    if (focusTime < 90) return 'bg-amber-900/30'
    if (focusTime < 180) return 'bg-amber-800/50'
    if (focusTime < 270) return 'bg-amber-700/70'
    return 'bg-amber-600'
  }

  // 月份导航
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

  // 防止水合问题，在客户端完全加载后才渲染
  if (!isMounted) {
    return null
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 py-6 flex-shrink-0">
        {/* Logo */}
        <div className="text-xl font-bold text-slate-300">LOGO</div>

        {/* 中间导航 */}
        <nav className="bg-slate-800 rounded-2xl p-1 ">
          <div className="flex space-x-1">
            <Link
              href="/"
              className="px-4 py-2 rounded-2xl text-white bg-slate-700 transition-colors">
              Dashboard
            </Link>
            <Link
              href="/stats"
              className="px-4 py-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              Stats
            </Link>
            <Link
              href="/calendar"
              className="px-4 py-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              History
            </Link>
          </div>
        </nav>

        {/* 右侧操作 */}
        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 左侧面板 - Today & Activity */}
        <div className="w-1/3 p-6 overflow-y-auto flex flex-col justify-between">
          {/* Today 区域 - 每日专注时间柱状图 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-light mb-4 text-slate-200">Today</h3>

            {/* 过去7天专注时间竖向柱状图 */}
            <div className="bg-slate-800 rounded-2xl p-4 flex-1 flex flex-col mb-4">
              <h4 className="text-xs text-slate-400 mb-4">过去7天专注时间</h4>
              <div className="flex items-end justify-between flex-1 mb-3">
                {getWeekDays().map(({ day, isToday, data }) => (
                  <div
                    key={day}
                    className="flex flex-col items-center flex-1 mx-1 h-full">
                    {/* 时间标签 */}
                    <div
                      className={`text-xs mb-2 transition-opacity duration-300 ${
                        data && (data.focus > 0 || isToday)
                          ? 'opacity-100'
                          : 'opacity-0'
                      } ${isToday ? 'text-amber-400' : 'text-slate-300'}`}>
                      {data && (data.focus > 0 || isToday)
                        ? formatTime(data.focus)
                        : ''}
                    </div>

                    {/* 柱子容器 */}
                    <div className="w-full max-w-8 h-full flex flex-col justify-end">
                      {/* 柱子 */}
                      <div
                        className={`w-full rounded-t-md transition-all duration-700 cursor-pointer hover:opacity-80 ${
                          isToday ? 'bg-amber-500' : 'bg-slate-600'
                        }`}
                        style={{
                          height: `${
                            data && data.focus > 0
                              ? Math.max((data.focus / maxFocus) * 100, 8)
                              : isToday
                              ? 8 // 今天即使没有数据也显示最小高度
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 星期标签 */}
              <div className="flex justify-between">
                {getWeekDays().map(({ day, isToday }) => (
                  <div key={day} className="flex-1 mx-1">
                    <div
                      className={`text-xs text-center ${
                        isToday
                          ? 'text-amber-400 font-medium'
                          : 'text-slate-500'
                      }`}>
                      {day}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity 区域 - 专注日历 */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-light text-slate-200">Activity</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={prevMonth}
                  className="p-1 rounded hover:bg-slate-800 transition-colors">
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
                  {months[currentDate.getMonth()]}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1 rounded hover:bg-slate-800 transition-colors">
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

            {/* 专注日历热力图 */}
            <div className="bg-slate-800 rounded-2xl p-3">
              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div
                    key={index}
                    className="text-center text-xs text-slate-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日历网格 */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded text-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${
                      day.isToday ? 'ring-1 ring-amber-400' : ''
                    } ${getIntensityColor(day.focusTime)}`}
                    title={
                      day.hasRecord
                        ? `${formatTime(day.focusTime)}, ${day.cycles}循环`
                        : '无专注记录'
                    }>
                    <span
                      className={`${
                        day.isToday
                          ? 'text-amber-200 font-medium'
                          : day.hasRecord
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}>
                      {day.date}
                    </span>
                  </div>
                ))}
              </div>

              {/* 强度图例 */}
              <div className="flex items-center justify-center space-x-1 mt-3">
                <span className="text-xs text-slate-500">Less</span>
                <div className="w-2 h-2 rounded bg-slate-700"></div>
                <div className="w-2 h-2 rounded bg-amber-900/30"></div>
                <div className="w-2 h-2 rounded bg-amber-800/50"></div>
                <div className="w-2 h-2 rounded bg-amber-700/70"></div>
                <div className="w-2 h-2 rounded bg-amber-600"></div>
                <span className="text-xs text-slate-500">More</span>
              </div>
            </div>
          </div>
        </div>

        {/* 中间面板 - 工作时间流程 */}
        <div className="w-1/3 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-light text-slate-200">今日流程</h2>
            <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
              <span className="text-lg">+</span>
            </button>
          </div>

          {/* 时间线 */}
          <div className="relative">
            {/* 垂直连接线 */}
            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-700"></div>

            {/* 时间线项目 */}
            <div className="space-y-6">
              {timelineData.map((item) => (
                <div key={item.id} className="relative flex items-start">
                  {/* 时间 */}
                  <div className="text-slate-400 text-sm font-mono w-16 pt-2 text-right pr-2">
                    {item.time}
                  </div>

                  {/* 图标 */}
                  <div
                    className={`w-10 h-10 rounded-full ${item.iconColor} flex items-center justify-center text-white relative z-10 mx-2 flex-shrink-0 shadow-lg`}>
                    <span className="text-base">{item.icon}</span>
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-800 rounded-xl p-4 mr-4 border-1 border-solid !border-slate-600 hover:!border-slate-500 transition-all duration-200 cursor-pointer hover:bg-slate-700 group">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-slate-200 font-medium text-base group-hover:text-white transition-colors">
                          {item.title}
                        </h3>
                        {item.duration && (
                          <span className="text-slate-400 text-xs bg-slate-700 px-2 py-1 rounded-md">
                            {item.duration}
                          </span>
                        )}
                      </div>

                      {item.details && (
                        <div className="space-y-1 mt-3">
                          {item.details.map((detail, detailIndex) => (
                            <div
                              key={detailIndex}
                              className="text-slate-400 text-sm flex items-center">
                              <span className="w-1 h-1 bg-slate-600 rounded-full mr-2 flex-shrink-0"></span>
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧面板 - My Focus */}
        <div className="w-1/3 p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl p-8 h-full border-slate-700">
            <h1 className="text-3xl font-light mb-6 text-slate-200">
              My Focus
            </h1>

            {/* 标签页 */}
            <div className="flex mb-6 bg-slate-700 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'tasks'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}>
                Tasks
              </button>
              <button
                onClick={() => setActiveTab('timer')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'timer'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}>
                Timer
              </button>
            </div>

            {/* 计时器内容 */}
            {activeTab === 'timer' && (
              <>
                {/* 计时器圆形显示 */}
                <div className="flex flex-col items-center my-8">
                  <div className="relative w-48 h-48 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl font-mono text-slate-200 mb-2">
                        00:00
                      </div>
                      <div className="text-slate-400">Focus</div>
                    </div>
                  </div>
                  <Link
                    href="/timer"
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-2xl text-white font-medium transition-colors">
                    Start
                  </Link>
                </div>

                {/* 统计信息 */}
                <div className="">
                  <h3 className="text-2xl font-medium mb-4 text-slate-300">
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-400 text-sm mb-1">
                        Focused Time
                      </div>
                      <div className="text-white text-lg font-medium">
                        {formatFocusTime(todayStats.totalFocusTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">
                        Sessions
                      </div>
                      <div className="text-white text-lg font-medium">
                        {todayStats.completedSessions}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">
                        Success Rate
                      </div>
                      <div className="text-white text-lg font-medium">
                        {todayStats.totalSessions > 0
                          ? Math.round(
                              (todayStats.completedSessions /
                                todayStats.totalSessions) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-sm mb-1">
                        Total Time
                      </div>
                      <div className="text-white text-lg font-medium">
                        {formatFocusTime(todayStats.totalFocusTime * 7)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 任务内容 */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                    placeholder="Add a new task..."
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={addTask}
                    className="ml-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-2xl text-white transition-colors">
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-700 rounded-2xl">
                      <span className="text-slate-200">{task}</span>
                      <button
                        onClick={() => removeTask(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
