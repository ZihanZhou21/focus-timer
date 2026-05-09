'use client'

import { DEFAULT_USER_ID } from '@/lib/constants'
import {
  useGetTodayTasksQuery,
  type TodayTasksResponse,
} from '@/lib/services/tasks-api'
import type { Task } from '@/lib/types'

const getTaskStatusText = (status: Task['status']) => {
  const statusMap = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    archived: 'Archived',
  }

  return statusMap[status] || status
}

const getPriorityText = (priority: Task['priority']) => {
  const priorityMap = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  }

  return priorityMap[priority] || priority
}

const formatTaskTime = (task: Task) => {
  if (task.type !== 'todo' || !task.dueDate) {
    return ''
  }

  return new Date(task.dueDate).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TodayTasksView() {
  const {
    data: todaysData,
    error,
    isLoading,
    refetch,
  } = useGetTodayTasksQuery(DEFAULT_USER_ID)

  const handleRefresh = () => {
    void refetch()
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading today&apos;s tasks...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Failed to fetch tasks</p>
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

  return <TodayTasksContent todaysData={todaysData} onRefresh={handleRefresh} />
}

function TodayTasksContent({
  todaysData,
  onRefresh,
}: {
  todaysData: TodayTasksResponse
  onRefresh: () => void
}) {
  const { tasks, stats } = todaysData

  return (
    <div className="max-w-4xl mx-auto p-6">
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
                      {getPriorityText(task.priority)}
                    </span>

                    {task.type === 'todo' && task.dueDate && (
                      <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">
                        {formatTaskTime(task)}
                      </span>
                    )}
                  </div>

                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4 text-right flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                    {getTaskStatusText(task.status)}
                    {task.status === 'completed' &&
                      task.completedCount?.[todaysData.date] &&
                      task.completedCount[todaysData.date] > 1 && (
                        <span className="ml-1 font-bold">
                          x{task.completedCount[todaysData.date]}
                        </span>
                      )}
                  </span>
                  {task.status === 'completed' && task.type !== 'check-in' && (
                    <button
                      onClick={() =>
                        (window.location.href = `/focus?id=${task._id}&repeat=true`)
                      }
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors">
                      Repeat
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={onRefresh}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Refresh Tasks
        </button>
      </div>
    </div>
  )
}
