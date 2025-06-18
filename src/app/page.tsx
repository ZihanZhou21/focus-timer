'use client'

import { useState, useEffect, FormEvent, useRef } from 'react'
import Link from 'next/link'
import { getTodayStats, type DailyStats } from '@/lib/storage'
import {
  useProjectStore,
  categoryConfig,
  type ProjectCategory,
} from '@/lib/stores/projectStore'

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

// 常用图标列表
const commonIcons = [
  '🎯',
  '💪',
  '🧠',
  '💼',
  '📚',
  '⚙️',
  '📅',
  '⏰',
  '🏃',
  '🧘',
  '☕',
  '🥗',
  '🍳',
  '🌙',
  '☀️',
  '💡',
  '🎉',
  '📞',
  '💬',
  '👥',
  '🎧',
  '🎵',
  '📝',
  '✅',
  '🏠',
  '✈️',
  '🚢',
  '🚗',
]

const parseDetail = (detail: string) => {
  const parts = detail.split(' ')
  if (parts.length < 2) {
    return { title: detail, label: null, value: null }
  }

  const value = parts[parts.length - 1]
  const title = parts.slice(0, parts.length - 1).join(' ')
  let label = null

  if (/x\d+/.test(value)) {
    label = '次数'
  } else if (value.includes('公里') || value.includes('km')) {
    label = '路程'
  } else if (value.includes('分钟') || value.includes('分')) {
    label = '时长'
  }

  return { title, label, value }
}

export default function Home() {
  // Zustand store
  const {
    timelineItems,
    selectedItem,
    isEditingInPanel,
    isAddingInPanel,
    formData,
    setSelectedItem,
    startAdd,
    startEdit,
    cancelEdit,
    setFormData,
    addTimelineItem,
    updateTimelineItem,
    toggleHabitCheck,
    isHabitChecked,
    getCurrentTimelineItem,
    getItemProgress,
    getTodayStats: getProjectStats,
  } = useProjectStore()

  // 本地状态
  const [todayStats, setTodayStats] = useState<DailyStats>({
    date: '',
    totalFocusTime: 0,
    completedSessions: 0,
    totalSessions: 0,
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [weeklyData, setWeeklyData] = useState<DayData[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // 在客户端加载今日统计
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingSessions = localStorage.getItem('focus-sessions')
      if (!existingSessions) {
        const today = new Date().toISOString().split('T')[0]
        const sampleSessions = [
          {
            id: 'sample1',
            date: today,
            startTime: 1700000000000,
            duration: 25,
            targetDuration: 25,
            completed: true,
          },
          {
            id: 'sample2',
            date: today,
            startTime: 1700001800000,
            duration: 30,
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

  // 定期更新当前时间项目并自动滚动
  useEffect(() => {
    const updateCurrentItem = () => {
      const current = getCurrentTimelineItem()

      // 自动滚动到当前项目，使其处于第二项位置
      if (current && timelineContainerRef.current) {
        const currentElement = document.getElementById(
          `timeline-item-${current.id}`
        )
        if (currentElement) {
          const container = timelineContainerRef.current

          // 计算第一个项目的高度和间距，用于确定第二项位置
          const firstItem = container.querySelector('[id^="timeline-item-"]')
          let itemHeight = 120 // 默认项目高度
          let itemSpacing = 24 // 默认间距 (space-y-6)

          if (firstItem) {
            itemHeight = firstItem.getBoundingClientRect().height
            // 获取实际的间距
            const secondItem = firstItem.nextElementSibling
            if (secondItem) {
              const firstRect = firstItem.getBoundingClientRect()
              const secondRect = secondItem.getBoundingClientRect()
              itemSpacing = secondRect.top - firstRect.bottom
            }
          }

          // 计算目标滚动位置：当前项目位置 - (一个项目高度 + 间距)
          const elementTop = currentElement.offsetTop
          const targetScrollTop = elementTop - (itemHeight + itemSpacing)

          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth',
          })
        }
      }
    }

    // 立即执行一次
    updateCurrentItem()

    // 每分钟更新一次
    const interval = setInterval(updateCurrentItem, 60000)

    return () => clearInterval(interval)
  }, [getCurrentTimelineItem])

  // 添加全局点击事件监听器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (isEditingInPanel || isAddingInPanel) {
        if (!target.closest('.project-detail-panel')) {
          cancelEdit()
          return
        }
      }

      if (
        !target.closest('.timeline-item') &&
        !target.closest('.project-detail-panel')
      ) {
        setSelectedItem(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditingInPanel, isAddingInPanel, cancelEdit, setSelectedItem])

  // 时间线数据
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

        const isToday = i === 0
        const mockData = [240, 180, 120, 300, 150, 90, 210]
        const focus = isToday
          ? Math.max(todayStats.totalFocusTime, 0)
          : mockData[6 - i] || 120
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
      : 120

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
        data: weeklyData[6 - i],
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

  // 根据项目类别获取阴影颜色
  const getCategoryShadowColor = (category: ProjectCategory) => {
    switch (category) {
      case 'habit':
        return 'rgba(107,114,128,0.8)' // gray-500 的 rgba 值
      case 'task':
        return 'rgba(59,130,246,0.8)' // blue-500 的 rgba 值
      case 'focus':
        return 'rgba(245,158,11,0.8)' // amber-500 的 rgba 值
      case 'exercise':
        return 'rgba(34,197,94,0.8)' // green-500 的 rgba 值
      default:
        return 'rgba(234,179,8,0.8)' // 默认琥珀色
    }
  }

  // 检查项目是否为当前时间项目
  const isCurrentTimeItem = (item: { id: string; time: string }) => {
    const current = getCurrentTimelineItem()
    return current?.id === item.id
  }

  // 获取当前项目的高亮样式
  const getCurrentItemHighlightClass = (item: {
    id: string
    time: string
    category: ProjectCategory
  }) => {
    if (!isCurrentTimeItem(item)) return ''

    switch (item.category) {
      case 'habit':
        return 'border-gray-400 bg-slate-700/80 ring-4 ring-gray-400/50 shadow-lg shadow-gray-400/20 scale-[1.02]'
      case 'task':
        return 'border-blue-400 bg-slate-700/80 ring-4 ring-blue-400/50 shadow-lg shadow-blue-400/20 scale-[1.02]'
      case 'focus':
        return 'border-amber-400 bg-slate-700/80 ring-4 ring-amber-400/50 shadow-lg shadow-amber-400/20 scale-[1.02]'
      case 'exercise':
        return 'border-green-400 bg-slate-700/80 ring-4 ring-green-400/50 shadow-lg shadow-green-400/20 scale-[1.02]'
      default:
        return 'border-amber-400 bg-slate-700/80 ring-4 ring-amber-400/50 shadow-lg shadow-amber-400/20 scale-[1.02]'
    }
  }

  // 提交表单（添加或更新）
  const handleSubmitTimelineItem = (e: FormEvent) => {
    e.preventDefault()
    if (!formData.time || !formData.title) return

    const detailsArray = formData.details
      .split('\n')
      .filter((d) => d.trim() !== '')

    if (isEditingInPanel) {
      // 更新项目
      updateTimelineItem(selectedItem!.id, {
        time: formData.time,
        title: formData.title,
        duration: formData.duration,
        icon: formData.icon,
        details: detailsArray,
        category: formData.category,
        iconColor: categoryConfig[formData.category].color,
      })
    } else {
      // 添加项目
      addTimelineItem({
        time: formData.time,
        title: formData.title,
        duration: formData.duration,
        icon: formData.icon,
        details: detailsArray,
        category: formData.category,
      })
    }

    cancelEdit()
  }

  // 简化的月份数组
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

  if (!isMounted) {
    return null
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="text-xl font-bold text-slate-300">Focus Timer</div>

        <nav className="bg-slate-800 rounded-2xl p-1.5">
          <div className="flex space-x-2">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </Link>
            <Link
              href={(() => {
                const currentItem = getCurrentTimelineItem()
                if (currentItem) {
                  // 保存任务数据到 localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(
                      'currentTask',
                      JSON.stringify({
                        id: currentItem.id,
                        title: currentItem.title,
                        time: currentItem.time,
                        duration: currentItem.duration,
                        details: currentItem.details,
                        icon: currentItem.icon,
                      })
                    )
                  }
                  return `/focus?id=${currentItem.id}`
                } else {
                  return '/focus'
                }
              })()}
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
                {generateCalendarData(
                  currentDate.getFullYear(),
                  currentDate.getMonth()
                ).map((day, index) => (
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
            <button
              onClick={startAdd}
              className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
              <span className="text-lg">+</span>
            </button>
          </div>

          <div className="relative h-[calc(100vh-12rem)]">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-20"></div>

            <div className="h-full overflow-y-auto" ref={timelineContainerRef}>
              <div className="relative space-y-6 pt-6 pb-6">
                <div
                  className="absolute left-7 top-0 w-0.5 bg-slate-700"
                  style={{ height: 'calc(100% + 400px)' }}></div>
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    id={`timeline-item-${item.id}`}
                    className="relative flex items-start">
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
                        className={`timeline-item relative bg-slate-800 rounded-3xl p-4 mr-4 transition-all duration-200 cursor-pointer hover:bg-slate-700 group ${
                          selectedItem?.id === item.id
                            ? 'border border-amber-500 bg-slate-700'
                            : isCurrentTimeItem(item)
                            ? getCurrentItemHighlightClass(item)
                            : 'border border-slate-600 hover:border-slate-500'
                        }`}>
                        <div className="absolute inset-0 overflow-hidden rounded-3xl bg-slate-700/50">
                          <div
                            className={`absolute inset-0 rounded-r-3xl rounded-l-3xl transition-all duration-1000 ${(() => {
                              const progress = getItemProgress(item)
                              const isCompleted =
                                item.category === 'habit'
                                  ? isHabitChecked(item.id)
                                  : progress >= 100

                              return isCompleted
                                ? 'bg-slate-600/80'
                                : 'bg-gradient-to-r from-slate-600/80 to-slate-500/80'
                            })()}`}
                            style={{
                              width: `${getItemProgress(item)}%`,
                              boxShadow: `4px 0 8px ${getCategoryShadowColor(
                                item.category
                              )}`,
                            }}></div>
                        </div>

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
                            {item.duration && (
                              <span
                                className={`text-slate-400 text-xs bg-slate-700/80 backdrop-blur-sm px-2 py-1 rounded-md ml-2 ${
                                  isCurrentTimeItem(item) ||
                                  selectedItem?.id === item.id
                                    ? 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(255,255,255,0.05)]'
                                    : ''
                                }`}>
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
                                  <span
                                    className={`w-1 h-1 bg-slate-600 rounded-full mr-2 flex-shrink-0 ${
                                      isCurrentTimeItem(item) ||
                                      selectedItem?.id === item.id
                                        ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),inset_0_-1px_1px_rgba(255,255,255,0.05)]'
                                        : ''
                                    }`}></span>
                                  {detail}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className={`absolute inset-0 rounded-3xl pointer-events-none ${
                            selectedItem?.id === item.id
                              ? 'shadow-[inset_0_4px_8px_rgba(0,0,0,0.3),inset_0_-2px_4px_rgba(255,255,255,0.08)]'
                              : isCurrentTimeItem(item)
                              ? 'shadow-[inset_0_4px_8px_rgba(0,0,0,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)]'
                              : ''
                          }`}></div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 延长的时间线空间，确保最后的项目可以滚动到1/3位置 */}
                <div className="h-96"></div>
              </div>
            </div>

            <div className="absolute z-10 bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
          </div>
        </div>

        {/* 右侧面板 - 项目详情 */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="bg-slate-800 rounded-3xl p-8 flex-1 border-slate-700 flex flex-col overflow-hidden">
            <div className="project-detail-panel flex-1 overflow-y-auto">
              {isEditingInPanel || isAddingInPanel ? (
                // 编辑表单
                <form onSubmit={handleSubmitTimelineItem} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-sm mb-2">
                          时间
                        </label>
                        <input
                          type="time"
                          value={formData.time}
                          onChange={(e) =>
                            setFormData({ time: e.target.value })
                          }
                          required
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-sm mb-2">
                          时长
                        </label>
                        <input
                          type="text"
                          placeholder="可选"
                          value={formData.duration}
                          onChange={(e) =>
                            setFormData({ duration: e.target.value })
                          }
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-sm mb-2">
                        标题
                      </label>
                      <input
                        type="text"
                        placeholder="项目标题"
                        value={formData.title}
                        onChange={(e) => setFormData({ title: e.target.value })}
                        required
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-slate-400 text-sm">图标:</label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ icon: e.target.value })}
                        maxLength={2}
                        className="w-12 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setIsIconSelectorOpen(true)}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm text-white">
                        选择
                      </button>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-sm mb-2">
                        项目类别
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            category: e.target.value as ProjectCategory,
                          })
                        }
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400">
                        <option value="habit">
                          {categoryConfig.habit.name} -{' '}
                          {categoryConfig.habit.description}
                        </option>
                        <option value="task">
                          {categoryConfig.task.name} -{' '}
                          {categoryConfig.task.description}
                        </option>
                        <option value="focus">
                          {categoryConfig.focus.name} -{' '}
                          {categoryConfig.focus.description}
                        </option>
                        <option value="exercise">
                          {categoryConfig.exercise.name} -{' '}
                          {categoryConfig.exercise.description}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-sm mb-2">
                        详细内容
                      </label>
                      <textarea
                        value={formData.details}
                        onChange={(e) =>
                          setFormData({ details: e.target.value })
                        }
                        placeholder="每行一个详细信息"
                        rows={4}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-amber-600 hover:bg-amber-700 rounded-lg text-white font-medium transition-colors py-2 px-4">
                        {isEditingInPanel ? '更新项目' : '添加项目'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white transition-colors">
                        取消
                      </button>
                    </div>
                  </div>
                </form>
              ) : selectedItem ? (
                // 项目详情
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
                        {selectedItem.duration && (
                          <span className="mx-2">|</span>
                        )}
                        {selectedItem.duration && (
                          <span>时长 {selectedItem.duration}</span>
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
                    {selectedItem.category === 'habit' ? (
                      <button
                        onClick={() => toggleHabitCheck(selectedItem.id)}
                        className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-white text-lg transition shrink-0 ${
                          isHabitChecked(selectedItem.id)
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-slate-500 hover:border-green-400 hover:text-green-400'
                        }`}>
                        {isHabitChecked(selectedItem.id) ? (
                          <svg
                            className="w-8 h-8"
                            fill="currentColor"
                            viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          '打卡'
                        )}
                      </button>
                    ) : (
                      <Link
                        href={`/focus?id=${selectedItem.id}`}
                        onClick={() => {
                          // 保存任务数据到 localStorage
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(
                              'currentTask',
                              JSON.stringify({
                                id: selectedItem.id,
                                title: selectedItem.title,
                                time: selectedItem.time,
                                duration: selectedItem.duration,
                                details: selectedItem.details,
                                icon: selectedItem.icon,
                              })
                            )
                          }
                        }}
                        className="w-20 h-20 rounded-full border-2 border-slate-500 flex items-center justify-center text-white text-lg hover:border-white transition shrink-0">
                        开始
                      </Link>
                    )}
                  </div>

                  {/* Bottom Part */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-slate-400 text-sm font-medium">
                        准备信息
                      </h4>
                      <button
                        onClick={() => {
                          startEdit(selectedItem.id)
                        }}
                        className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
                        编辑
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedItem.details &&
                        selectedItem.details.map(
                          (detail: string, index: number) => {
                            const { title, label, value } = parseDetail(detail)
                            const colors = [
                              'bg-blue-500',
                              'bg-orange-500',
                              'bg-green-500',
                              'bg-purple-500',
                            ]
                            const color = colors[index % colors.length]

                            return (
                              <div
                                key={index}
                                className="bg-slate-700/50 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                  <p className="text-white font-medium">
                                    {title}
                                  </p>
                                  {label && value && (
                                    <p className="text-slate-400 text-sm">
                                      {label} {value}
                                    </p>
                                  )}
                                </div>
                                <div
                                  className={`w-8 h-8 rounded-full ${color} border-2 border-slate-900`}></div>
                              </div>
                            )
                          }
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                // 今日项目统计 - 简约设计
                <div className="flex flex-col h-full">
                  {/* 简约标题栏 */}
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-light text-slate-200">
                      今日项目
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-light text-amber-400">
                        {getProjectStats().completedProjects}
                      </div>
                      <div className="text-slate-500">/</div>
                      <div className="text-lg text-slate-400">
                        {getProjectStats().totalProjects}
                      </div>
                    </div>
                  </div>

                  {/* 已完成和未完成项目分列显示 */}
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
                          .filter((item) => {
                            const progress = getItemProgress(item)
                            return item.category === 'habit'
                              ? isHabitChecked(item.id)
                              : progress >= 80
                          })
                          .map((item) => {
                            const progress = getItemProgress(item)

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (item.category === 'habit') {
                                    toggleHabitCheck(item.id)
                                  } else {
                                    setSelectedItem(item)
                                  }
                                }}
                                className="group relative bg-slate-500/30 hover:bg-slate-400/50 rounded-3xl px-4.5 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm">
                                {item.category === 'habit' ? (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            categoryConfig[item.category].color
                                          }`}></span>
                                        <h5 className="text-slate-100 text-md truncate flex-1">
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
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          categoryConfig[item.category].color
                                        }`}></span>
                                      <h5 className="text-slate-100 text-md truncate flex-1">
                                        {item.title}
                                      </h5>
                                      {item.duration && (
                                        <span className="text-xs text-slate-400 ml-2">
                                          {item.duration}
                                        </span>
                                      )}
                                    </div>
                                    <div className="w-full h-1 bg-slate-600/20 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-700 rounded-full ${
                                          progress >= 80
                                            ? 'bg-green-400/50'
                                            : categoryConfig[
                                                item.category
                                              ].color.replace('bg-', 'bg-')
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                      </div>

                      {/* 未完成项目 */}
                      <div className="space-y-2 pl-2">
                        <h4 className="text-xs text-slate-400 font-medium mb-2">
                          未完成
                        </h4>
                        {timelineItems
                          .filter((item) => {
                            const progress = getItemProgress(item)
                            return item.category === 'habit'
                              ? !isHabitChecked(item.id)
                              : progress < 80
                          })
                          .map((item) => {
                            const progress = getItemProgress(item)

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (item.category === 'habit') {
                                    toggleHabitCheck(item.id)
                                  } else {
                                    setSelectedItem(item)
                                  }
                                }}
                                className="group relative bg-slate-600/70 hover:bg-slate-400/50 rounded-3xl px-4.5 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm">
                                {item.category === 'habit' ? (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            categoryConfig[item.category].color
                                          }`}></span>
                                        <h5 className="text-slate-200 text-md truncate flex-1">
                                          {item.title}
                                        </h5>
                                      </div>
                                      <div className="w-4 h-4 rounded-full flex items-center justify-center border-2 border-amber-400"></div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          categoryConfig[item.category].color
                                        }`}></span>
                                      <h5 className="text-slate-200 text-md truncate flex-1">
                                        {item.title}
                                      </h5>
                                      {item.duration && (
                                        <span className="text-xs text-slate-500 ml-2">
                                          {item.duration}
                                        </span>
                                      )}
                                    </div>
                                    <div className="w-full h-1 bg-slate-600/20 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-700 rounded-full ${
                                          progress > 0
                                            ? categoryConfig[
                                                item.category
                                              ].color.replace('bg-', 'bg-')
                                            : 'bg-slate-600'
                                        }`}
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </div>

                  {/* 简约底部统计 */}
                  <div className="mt-6 pt-4 border-t border-slate-700/30">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>
                        习惯 {getProjectStats().completedHabits}/
                        {getProjectStats().habitProjects}
                      </span>
                      <span>
                        任务 {getProjectStats().completedTasks}/
                        {getProjectStats().taskProjects}
                      </span>
                      <span>{getProjectStats().completionRate}% 完成</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 图标选择器模态框 */}
      {isIconSelectorOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setIsIconSelectorOpen(false)}
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60">
            <div className="bg-slate-800 p-4 rounded-lg shadow-2xl border border-slate-600 max-w-xs">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm text-slate-300">选择图标</h3>
                <button
                  onClick={() => setIsIconSelectorOpen(false)}
                  className="text-slate-400 hover:text-white text-lg leading-none">
                  ×
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setFormData({ icon })
                      setIsIconSelectorOpen(false)
                    }}
                    className={`text-lg p-1.5 rounded transition-all duration-200 ${
                      formData.icon === icon
                        ? 'bg-amber-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
