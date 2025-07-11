// 今日任务视图组件
import React, { useState, useEffect } from 'react'
import { todayTasksService, TodayTasksResponse } from '@/lib/today-api'

export default function TodayTasksView() {
  const [todaysData, setTodaysData] = useState<TodayTasksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取今天的任务
  async function loadTodaysTasks() {
    try {
      setLoading(true)
      setError(null)

      // 前端只需要调用这一个方法，所有复杂逻辑由后端处理
      const data = await todayTasksService.getTodaysTasks()
      setTodaysData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载数据
  useEffect(() => {
    loadTodaysTasks()
  }, [])

  // 下拉刷新
  const handleRefresh = () => {
    loadTodaysTasks()
  }

  if (loading) {
    return <div className="text-center py-8">Loading today&apos;s tasks...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Failed to fetch tasks: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    )
  }

  if (!todaysData) {
    return <div className="text-center py-8">No data</div>
  }

  const { tasks, stats } = todaysData

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部信息 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Today&apos;s Tasks ({todaysData.date})
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Total: {stats.total}</span>
          <span>Todo: {stats.todoTasks}</span>
          <span>Habits: {stats.checkInTasks}</span>
          <span>High Priority: {stats.highPriority}</span>
        </div>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No tasks for today</p>
          <p className="text-sm mt-2">Enjoy a relaxing day!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task._id}
              className={`p-4 rounded-lg border-l-4 ${
                task.priority === 'high'
                  ? 'border-red-500 bg-red-50'
                  : task.priority === 'medium'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-green-500 bg-green-50'
              }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{task.content}</p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        task.type === 'todo'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                      {task.type === 'todo' ? 'Todo' : 'Habit'}
                    </span>

                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                      {todayTasksService.getPriorityText(task.priority)}
                    </span>

                    {task.type === 'todo' &&
                      'dueDate' in task &&
                      task.dueDate && (
                        <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                          {todayTasksService.formatTaskTime(task)}
                        </span>
                      )}
                  </div>

                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4 text-right">
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                    {todayTasksService.getTaskStatusText(task.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="mt-8 text-center">
        <button
          onClick={handleRefresh}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Refresh Tasks
        </button>
      </div>
    </div>
  )
}
