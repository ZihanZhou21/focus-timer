'use client'

import { useState, useEffect } from 'react'
import { ProjectItem } from '@/lib/api'
import { todayTasksService } from '@/lib/today-api'
import { categoryConfig, DEFAULT_USER_ID } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import AppNavigation from '@/components/AppNavigation'
import SimpleTaskModal from '@/components/SimpleTaskModal'
import ActivityCalendar from '@/components/ActivityCalendar'
import TaskDetailCard from '@/components/TaskDetailCard'
import WeekChart from '@/components/WeekChart'

export default function Home() {
  // 本地状态管理 - 统一使用ProjectItem
  const [timelineItems, setTimelineItems] = useState<ProjectItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // 处理新任务添加
  const handleTaskAdded = async () => {
    try {
      // 重新加载今日任务数据
      const projectItems = await todayTasksService.getTodaysTasksAsProjectItems(
        DEFAULT_USER_ID
      )
      setTimelineItems(projectItems)
      console.log('任务列表已更新')
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }

  // 处理任务更新
  const handleTaskUpdate = (updatedTask: ProjectItem) => {
    setTimelineItems((prev) =>
      prev.map((item) => (item.id === updatedTask.id ? updatedTask : item))
    )
    // 如果当前选中的是被更新的任务，也要更新选中项
    if (selectedItem?.id === updatedTask.id) {
      setSelectedItem(updatedTask)
    }
  }

  // 处理任务删除
  const handleTaskDelete = (taskId: string) => {
    setTimelineItems((prev) => prev.filter((item) => item.id !== taskId))
    setSelectedItem(null) // 关闭详情面板
  }

  // 关闭任务详情
  const handleCloseTaskDetail = () => {
    setSelectedItem(null)
  }

  // 初始化数据
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 加载今日任务数据
        const projectItems =
          await todayTasksService.getTodaysTasksAsProjectItems(DEFAULT_USER_ID)
        setTimelineItems(projectItems)

        console.log(
          `成功加载 ${projectItems.length} 个项目:`,
          projectItems.map((item) => item.title)
        )
      } catch (error) {
        console.error('Failed to initialize app:', error)
        // 设置空数据作为fallback
        setTimelineItems([])
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

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
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 左侧面板 - Week & Activity */}
        <div className="w-[30%] p-6 overflow-y-auto flex flex-col justify-between">
          {/* Week 区域 - 使用独立的WeekChart组件 */}
          <WeekChart userId={DEFAULT_USER_ID} />

          {/* Activity 区域 - 重新启用，现在使用tasks API */}
          <ActivityCalendar />
        </div>

        {/* 中间面板 - 工作时间流程 */}
        <div className="w-[30%] p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-light text-slate-200">所有项目</h2>
              <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md text-xs font-medium">
                {timelineItems.length} 个项目
              </span>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
              <span className="text-lg">+</span>
            </button>
          </div>

          <div className="relative h-[calc(100vh-12rem)]">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-20"></div>

            <div className="h-full overflow-y-auto">
              {timelineItems.length === 0 ? (
                // 空状态显示
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-slate-300 text-lg font-medium mb-2">
                    暂无项目
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-xs">
                    点击右上角的 + 按钮创建你的第一个项目
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    创建项目
                  </button>
                </div>
              ) : (
                // 正常的任务列表
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
                        } flex items-center justify-center text-white relative z-10 mx-2 flex-shrink-0 shadow-lg ${
                          item.completed ? 'opacity-75' : ''
                        }`}>
                        <span className="text-base">{item.icon}</span>
                        {item.completed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-2.5 h-2.5 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`relative rounded-3xl p-4 mr-4 transition-all duration-200 cursor-pointer group ${
                            item.completed
                              ? 'bg-slate-700/50 border-slate-600/50 opacity-80'
                              : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                          } ${
                            selectedItem?.id === item.id
                              ? 'border border-amber-500 bg-slate-700'
                              : 'border hover:bg-slate-700'
                          }`}>
                          {/* 可点击的主要区域 */}
                          <div
                            onClick={() => setSelectedItem(item)}
                            className="absolute inset-0 z-10"
                            style={{ right: '20%' }}></div>

                          {/* hover删除区域 - 右边1/5 */}
                          <div
                            className="absolute top-0 right-0 w-1/5 h-full z-20 group/delete"
                            onMouseEnter={(e) => e.stopPropagation()}>
                            {/* 删除按钮 */}
                            <div className="opacity-0 group-hover/delete:opacity-100 transition-opacity duration-200 absolute top-1/2 right-3 transform -translate-y-1/2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTaskDelete(item.id)
                                }}
                                className="w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 hover:border-red-400/60 text-red-400 hover:text-red-300 transition-all duration-200 flex items-center justify-center">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="relative z-10 overflow-hidden">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-1">
                                  <h3
                                    className={`font-medium text-base group-hover:text-white transition-colors ${
                                      selectedItem?.id === item.id
                                        ? 'text-amber-200'
                                        : item.completed
                                        ? 'text-slate-400'
                                        : 'text-slate-200'
                                    } ${item.completed ? 'line-through' : ''}`}>
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                        categoryConfig[item.category].color
                                      }`}></span>
                                    {item.title}
                                  </h3>
                                  {item.category !== 'habit' && (
                                    <span className="text-slate-400 text-xs font-normal">
                                      · {categoryConfig[item.category].name}
                                    </span>
                                  )}
                                  {item.completed && (
                                    <span className="text-green-400 text-xs font-normal">
                                      · 已完成
                                    </span>
                                  )}
                                </div>
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
              )}
            </div>

            <div className="absolute z-10 bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
          </div>
        </div>

        {/* 右侧面板 - 项目详情 */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="bg-slate-800 rounded-3xl p-8 flex-1 border-slate-700 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <TaskDetailCard
                selectedItem={selectedItem}
                timelineItems={timelineItems}
                onSelectItem={setSelectedItem}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onClose={handleCloseTaskDetail}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 简化的任务创建模态框 */}
      <SimpleTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  )
}
