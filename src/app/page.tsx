'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { dataUtils, ProjectItem, formatDuration } from '@/lib/api'

// 项目类型配置
const categoryConfig = {
  habit: {
    name: '习惯',
    color: 'bg-gray-500',
    description: '日常习惯打卡',
  },
  task: {
    name: '任务',
    color: 'bg-blue-500',
    description: '工作任务',
  },
  focus: {
    name: '专注',
    color: 'bg-amber-500',
    description: '深度专注',
  },
  exercise: {
    name: '运动',
    color: 'bg-green-500',
    description: '运动健身',
  },
}

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

export default function Home() {
  // 本地状态管理 - 统一使用ProjectItem
  const [timelineItems, setTimelineItems] = useState<ProjectItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weeklyData, setWeeklyData] = useState<DayData[]>([])
  const [calendarData, setCalendarData] = useState<DayRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 生成过去7天数据 - 直接使用原始API
  const generateLast7DaysData = async (): Promise<DayData[]> => {
    const data: DayData[] = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const month = date.getMonth() + 1
      const day = date.getDate()
      const dayLabel = `${month}/${day}`

      try {
        // 直接获取ProjectItem数据
        const response = await fetch(
          `/api/projects?date=${dateStr}&userId=user_001`
        )
        if (response.ok) {
          const dayProjects: ProjectItem[] = await response.json()
          const focus = dataUtils.calculateFocusTime(dayProjects)
          const cycles = dataUtils.calculateCycles(dayProjects)

          data.push({
            day: dayLabel,
            focus,
            cycles,
          })
        } else {
          data.push({
            day: dayLabel,
            focus: 0,
            cycles: 0,
          })
        }
      } catch (error) {
        console.error(`Failed to load data for ${dateStr}:`, error)
        data.push({
          day: dayLabel,
          focus: 0,
          cycles: 0,
        })
      }
    }

    return data
  }

  // 更新日历数据 - 直接使用ProjectItem
  const generateCalendarData = async (
    year: number,
    month: number
  ): Promise<DayRecord[]> => {
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
      const dateStr = currentIterDate.toISOString().split('T')[0]

      let focusTime = 0
      let hasRecord = false
      let cycles = 0

      if (isCurrentMonth) {
        try {
          // 直接获取ProjectItem数据
          const response = await fetch(
            `/api/projects?date=${dateStr}&userId=user_001`
          )
          if (response.ok) {
            const dayProjects: ProjectItem[] = await response.json()
            focusTime = dataUtils.calculateFocusTime(dayProjects)
            cycles = dataUtils.calculateCycles(dayProjects)
            hasRecord = dayProjects.some(
              (p) => p.completed && p.durationMinutes > 0
            )
          }
        } catch (error) {
          console.error(`Failed to load data for ${dateStr}:`, error)
        }
      }

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

  // 初始化数据
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]

        // 并行加载所有初始数据
        const [projectsResponse, weekData, calData] = await Promise.all([
          fetch(`/api/projects?date=${today}&userId=user_001`),
          generateLast7DaysData(),
          generateCalendarData(new Date().getFullYear(), new Date().getMonth()),
        ])

        if (projectsResponse.ok) {
          const projects: ProjectItem[] = await projectsResponse.json()
          setTimelineItems(projects)
        }

        setWeeklyData(weekData)
        setCalendarData(calData)
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  // 当月份改变时更新日历数据
  useEffect(() => {
    if (!isLoading) {
      const updateCalendarData = async () => {
        try {
          const newCalendarData = await generateCalendarData(
            currentDate.getFullYear(),
            currentDate.getMonth()
          )
          setCalendarData(newCalendarData)
        } catch (error) {
          console.error('Failed to update calendar data:', error)
        }
      }
      updateCalendarData()
    }
  }, [currentDate, isLoading])

  // 辅助函数 - 统一使用小时格式
  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0h'
    const hours = minutes / 60
    return `${hours.toFixed(1)}h`
  }

  const getIntensityColor = (focusTime: number) => {
    if (focusTime === 0) return 'bg-slate-700'
    if (focusTime < 90) return 'bg-amber-900/30'
    if (focusTime < 180) return 'bg-amber-800/50'
    if (focusTime < 270) return 'bg-amber-700/70'
    return 'bg-amber-600'
  }

  const maxFocus =
    weeklyData.length > 0
      ? Math.max(...weeklyData.map((d) => d.focus), 120)
      : 120

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
              className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </Link>
            <Link
              href="/focus"
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Focus
            </Link>
            <Link
              href="/calendar"
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
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

      <div className="flex flex-1 min-h-0">
        {/* 左侧面板 - Week & Activity */}
        <div className="w-[30%] p-6 overflow-y-auto flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            <h3 className="text-lg font-light mb-4 text-slate-200">Week</h3>
            <div className="bg-slate-800 rounded-3xl p-4 flex-1 flex flex-col mb-4">
              <h4 className="text-xs text-slate-400 mb-4">过去7天专注时间</h4>
              <div className="flex items-end justify-between flex-1 mb-3">
                {getWeekDays().map(({ day, isToday, data }) => (
                  <div
                    key={day}
                    className="flex flex-col items-center flex-1 mx-1 h-full">
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
                      />
                    </div>
                  </div>
                ))}
              </div>

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

            <div className="bg-slate-800 rounded-3xl p-3">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div
                    key={index}
                    className="text-center text-md text-slate-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-full text-xs flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${
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
        <div className="w-[30%] p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-light text-slate-200">Today</h2>
            <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
              <span className="text-lg">+</span>
            </button>
          </div>

          <div className="relative h-[calc(100vh-12rem)]">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-20"></div>

            <div className="h-full overflow-y-auto">
              <div className="relative space-y-6 pt-6 pb-6">
                <div
                  className="absolute left-7 top-0 w-0.5 bg-slate-700"
                  style={{ height: 'calc(100% + 400px)' }}></div>
                {timelineItems.map((item) => (
                  <div key={item.id} className="relative flex items-start">
                    <div className="text-slate-400 text-sm font-mono w-16 pt-2 text-right pr-2">
                      {item.time}
                    </div>

                    <div
                      className={`w-10 h-10 rounded-full ${
                        categoryConfig[item.category].color
                      } flex items-center justify-center text-white relative z-10 mx-2 flex-shrink-0 shadow-lg`}>
                      <span className="text-base">{item.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => setSelectedItem(item)}
                        className={`relative bg-slate-800 rounded-3xl p-4 mr-4 transition-all duration-200 cursor-pointer hover:bg-slate-700 group ${
                          selectedItem?.id === item.id
                            ? 'border border-amber-500 bg-slate-700'
                            : 'border border-slate-600 hover:border-slate-500'
                        }`}>
                        <div className="relative z-10 overflow-hidden">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-medium text-base group-hover:text-white transition-colors ${
                                  selectedItem?.id === item.id
                                    ? 'text-amber-200'
                                    : 'text-slate-200'
                                }`}>
                                <span
                                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    categoryConfig[item.category].color
                                  }`}></span>
                                {item.title}
                                {item.category !== 'habit' && (
                                  <span className="text-slate-400 text-xs ml-2 font-normal">
                                    · {categoryConfig[item.category].name}
                                  </span>
                                )}
                              </h3>
                            </div>
                            {item.durationMinutes > 0 && (
                              <span className="text-slate-400 text-xs bg-slate-700/80 backdrop-blur-sm px-2 py-1 rounded-md ml-2">
                                {formatDuration(item.durationMinutes)}
                              </span>
                            )}
                          </div>

                          {item.details && (
                            <div className="space-y-1 mt-3">
                              {item.details.map(
                                (detail: string, detailIndex: number) => (
                                  <div
                                    key={detailIndex}
                                    className="text-slate-400 text-sm flex items-center">
                                    <span className="w-1 h-1 bg-slate-600 rounded-full mr-2 flex-shrink-0"></span>
                                    {detail}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="h-96"></div>
              </div>
            </div>

            <div className="absolute z-10 bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
          </div>
        </div>

        {/* 右侧面板 - 项目详情 */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="bg-slate-800 rounded-3xl p-8 flex-1 border-slate-700 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {selectedItem ? (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start pb-6">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400 mb-2">当前任务</p>
                      <h3 className="text-4xl font-bold text-white my-1 flex items-center">
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-3 ${
                            categoryConfig[selectedItem.category].color
                          }`}></span>
                        {selectedItem.title}
                      </h3>
                      <div className="text-slate-400 text-sm">
                        <span>计划 {selectedItem.time}</span>
                        {selectedItem.durationMinutes > 0 && (
                          <>
                            <span className="mx-2">|</span>
                            <span>
                              时长{' '}
                              {formatDuration(selectedItem.durationMinutes)}
                            </span>
                          </>
                        )}
                        {selectedItem.category !== 'habit' && (
                          <>
                            <span className="mx-2">|</span>
                            <span>
                              {categoryConfig[selectedItem.category].name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/focus?id=${selectedItem.id}`}
                      className="w-20 h-20 rounded-full border-2 border-slate-500 flex items-center justify-center text-white text-lg hover:border-white transition shrink-0">
                      开始
                    </Link>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-slate-400 text-sm font-medium">
                        准备信息
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {selectedItem.details &&
                        selectedItem.details.map(
                          (detail: string, index: number) => (
                            <div
                              key={index}
                              className="bg-slate-700/50 rounded-2xl p-4 flex justify-between items-center">
                              <div>
                                <p className="text-white font-medium">
                                  {detail}
                                </p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-slate-900"></div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* 今日统计 */}
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-light text-slate-200">
                      今日项目
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-light text-amber-400">
                        {timelineItems.filter((item) => item.completed).length}
                      </div>
                      <div className="text-slate-500">/</div>
                      <div className="text-lg text-slate-400">
                        {timelineItems.length}
                      </div>
                    </div>
                  </div>

                  {timelineItems.length > 0 ? (
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4 relative">
                        {/* 渐变分隔线 */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px transform -translate-x-1/2 bg-gradient-to-b from-transparent via-slate-500/60 to-transparent"></div>

                        {/* 已完成项目 */}
                        <div className="space-y-2 pr-2">
                          <h4 className="text-xs text-slate-400 font-medium mb-2">
                            已完成
                          </h4>
                          {timelineItems
                            .filter((item) => item.completed)
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="group relative bg-slate-500/30 hover:bg-slate-400/50 rounded-3xl px-4 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        categoryConfig[item.category].color
                                      }`}></span>
                                    <h5 className="text-slate-100 text-sm truncate flex-1">
                                      {item.title}
                                    </h5>
                                  </div>
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 ml-2">
                                    <svg
                                      className="w-3 h-3 text-green-400"
                                      fill="currentColor"
                                      viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* 未完成项目 */}
                        <div className="space-y-2 pl-2">
                          <h4 className="text-xs text-slate-400 font-medium mb-2">
                            未完成
                          </h4>
                          {timelineItems
                            .filter((item) => !item.completed)
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="group relative bg-slate-600/70 hover:bg-slate-400/50 rounded-3xl px-4 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        categoryConfig[item.category].color
                                      }`}></span>
                                    <h5 className="text-slate-200 text-sm truncate flex-1">
                                      {item.title}
                                    </h5>
                                  </div>
                                  <div className="w-4 h-4 rounded-full border-2 border-amber-400"></div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* 底部统计 */}
                      <div className="mt-6 pt-4 border-t border-slate-700/30">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>
                            习惯{' '}
                            {
                              timelineItems.filter(
                                (item) =>
                                  item.category === 'habit' && item.completed
                              ).length
                            }
                            /
                            {
                              timelineItems.filter(
                                (item) => item.category === 'habit'
                              ).length
                            }
                          </span>
                          <span>
                            任务{' '}
                            {
                              timelineItems.filter(
                                (item) =>
                                  item.category !== 'habit' && item.completed
                              ).length
                            }
                            /
                            {
                              timelineItems.filter(
                                (item) => item.category !== 'habit'
                              ).length
                            }
                          </span>
                          <span>
                            {timelineItems.length > 0
                              ? Math.round(
                                  (timelineItems.filter(
                                    (item) => item.completed
                                  ).length /
                                    timelineItems.length) *
                                    100
                                )
                              : 0}
                            % 完成
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full items-center justify-center">
                      <div className="text-slate-400 mb-4">
                        <svg
                          className="w-12 h-12 mx-auto mb-4 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <p className="text-slate-500 text-sm text-center mb-2">
                        今日暂无项目
                      </p>
                      <p className="text-slate-600 text-xs text-center">
                        点击左侧的 + 按钮添加项目
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
