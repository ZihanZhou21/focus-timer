'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ProjectItem } from '@/lib/api'
import { categoryConfig } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import { taskProgressAPI, TaskProgressData } from '@/lib/task-progress-api'
import { taskRemainingAPI, TaskRemainingData } from '@/lib/task-remaining-api'

interface TaskDetailCardProps {
  selectedItem: ProjectItem | null
  timelineItems: ProjectItem[]
  onSelectItem: (item: ProjectItem) => void
  onTaskUpdate?: (task: ProjectItem) => void
  onTaskDelete?: (taskId: string) => void
  onClose?: () => void
}

export default function TaskDetailCard({
  selectedItem,
  timelineItems,
  onSelectItem,
  onTaskUpdate,
  onTaskDelete,
  onClose,
}: TaskDetailCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingDetail, setEditingDetail] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [completedDetails, setCompletedDetails] = useState<Set<number>>(
    new Set()
  )
  const [taskProgressData, setTaskProgressData] = useState<
    Map<string, TaskProgressData>
  >(new Map())
  const [taskRemainingData, setTaskRemainingData] = useState<
    Map<string, TaskRemainingData>
  >(new Map())

  const cardRef = useRef<HTMLDivElement>(null)

  // 处理点击外部区域关闭任务详情
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectedItem &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        onClose
      ) {
        onClose()
      }
    }

    if (selectedItem) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [selectedItem, onClose])

  // 加载选中任务的数据
  useEffect(() => {
    if (selectedItem && selectedItem.type !== 'check-in') {
      loadTaskProgress(selectedItem.id)
      loadTaskRemaining(selectedItem.id)
    }
  }, [selectedItem])

  // 批量加载所有TODO任务的数据
  useEffect(() => {
    const todoTasks = timelineItems.filter((item) => item.type !== 'check-in')
    todoTasks.forEach((task) => {
      if (!taskProgressData.has(task.id)) {
        loadTaskProgress(task.id)
      }
      if (!taskRemainingData.has(task.id)) {
        loadTaskRemaining(task.id)
      }
    })
  }, [timelineItems])

  // 处理打卡任务的完成/撤销操作
  const handleCheckInToggle = async (task: ProjectItem) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: task.completed ? 'in_progress' : 'completed',
          completedAt: task.completed ? null : new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const updatedTask = { ...task, completed: !task.completed }
        onTaskUpdate?.(updatedTask)
      }
    } catch (error) {
      console.error('更新任务失败:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // 计算任务进度（基于时间记录）
  const calculateProgress = (task: ProjectItem): number => {
    if (task.type === 'check-in' || task.completed) return 100

    // 对于todo任务，从缓存的进度数据中获取
    const progressData = taskProgressData.get(task.id)
    if (progressData) {
      return progressData.progressPercentage
    }

    // 如果没有进度数据，返回0
    return 0
  }

  // 获取任务执行时间（分钟）- 使用新的剩余时间API
  const getExecutedTime = (task: ProjectItem): number => {
    // 对于打卡任务，返回0
    if (task.type === 'check-in') return 0

    // 从剩余时间数据中获取已执行时间
    const remainingData = taskRemainingData.get(task.id)
    if (remainingData) {
      return remainingData.executedMinutes
    }

    // 降级到进度数据
    const progressData = taskProgressData.get(task.id)
    if (progressData) {
      return Math.floor(progressData.totalExecutedTime / 60)
    }

    return 0
  }

  // 计算任务剩余时间（分钟）- 使用新的剩余时间API，避免小数点问题
  const getRemainingTime = (task: ProjectItem): number => {
    // 对于打卡任务，没有剩余时间概念
    if (task.type === 'check-in') return 0

    // 从剩余时间数据中直接获取剩余时间（整数分钟）
    const remainingData = taskRemainingData.get(task.id)
    if (remainingData) {
      return remainingData.remainingMinutes
    }

    // 如果没有剩余时间数据，使用任务的durationMinutes或默认25分钟
    return task.durationMinutes || 25
  }

  // 加载任务进度数据
  const loadTaskProgress = async (taskId: string) => {
    try {
      const progressData = await taskProgressAPI.getTaskProgress(taskId)
      setTaskProgressData((prev) => new Map(prev.set(taskId, progressData)))
    } catch (error) {
      console.error(`加载任务进度失败 (${taskId}):`, error)
    }
  }

  // 加载任务剩余时间数据
  const loadTaskRemaining = async (taskId: string) => {
    try {
      const remainingData = await taskRemainingAPI.getTaskRemaining(taskId)
      setTaskRemainingData((prev) => new Map(prev.set(taskId, remainingData)))
    } catch (error) {
      console.error(`加载任务剩余时间失败 (${taskId}):`, error)
    }
  }

  // 开始编辑清单项
  const startEditing = (index: number, text: string) => {
    setEditingDetail(index)
    setEditingText(text)
  }

  // 保存编辑
  const saveEdit = async () => {
    if (editingDetail === null || !selectedItem) return

    const updatedDetails = [...(selectedItem.details || [])]
    updatedDetails[editingDetail] = editingText

    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: updatedDetails,
        }),
      })

      if (response.ok) {
        const updatedTask = { ...selectedItem, details: updatedDetails }
        onTaskUpdate?.(updatedTask)
      }
    } catch (error) {
      console.error('更新任务详情失败:', error)
    }

    setEditingDetail(null)
    setEditingText('')
  }

  // 取消编辑
  const cancelEdit = () => {
    if (!selectedItem || editingDetail === null) return

    // 检查是否是新添加的任务项（内容为"新任务项"）
    const detail = selectedItem.details?.[editingDetail]
    if (detail === '新任务项') {
      // 如果是新任务项，直接删除而不是取消编辑
      deleteDetail(editingDetail)
    }

    setEditingDetail(null)
    setEditingText('')
  }

  // 删除清单项
  const deleteDetail = async (index: number) => {
    if (!selectedItem) return

    const updatedDetails =
      selectedItem.details?.filter((_, i) => i !== index) || []

    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: updatedDetails,
        }),
      })

      if (response.ok) {
        const updatedTask = { ...selectedItem, details: updatedDetails }
        onTaskUpdate?.(updatedTask)
      }
    } catch (error) {
      console.error('删除任务详情失败:', error)
    }
  }

  // 添加新清单项
  const addNewDetail = async () => {
    if (!selectedItem) return

    const newDetail = '新任务项'
    const updatedDetails = [...(selectedItem.details || []), newDetail]

    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: updatedDetails,
        }),
      })

      if (response.ok) {
        const updatedTask = { ...selectedItem, details: updatedDetails }
        onTaskUpdate?.(updatedTask)
        // 自动进入编辑模式编辑新添加的项
        setEditingDetail(updatedDetails.length - 1)
        setEditingText(newDetail)
      }
    } catch (error) {
      console.error('添加任务详情失败:', error)
    }
  }

  // 切换清单项完成状态
  const toggleDetailCompletion = (index: number) => {
    if (!selectedItem) return

    // 检查是否是新添加的任务项（内容为"新任务项"）
    const detail = selectedItem.details?.[index]
    if (detail === '新任务项') {
      // 直接删除新任务项
      deleteDetail(index)
      return
    }

    // 对于其他任务项，切换完成状态
    setCompletedDetails((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // 删除任务
  const handleDeleteTask = async () => {
    if (!selectedItem || !onTaskDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onTaskDelete(selectedItem.id)
        onClose?.() // 关闭详情面板
      } else {
        console.error('删除任务失败')
      }
    } catch (error) {
      console.error('删除任务出错:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // 确认删除对话框
  const confirmDelete = () => {
    setShowDeleteConfirm(true)
  }

  // 取消删除
  const cancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  if (selectedItem) {
    const isCheckInTask = selectedItem.type === 'check-in'
    const progress = calculateProgress(selectedItem)

    return (
      <div ref={cardRef} className="flex flex-col h-full">
        <div className="pb-6">
          {/* 任务标题和操作按钮 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              {/* 任务类型标识和标题 */}
              <div className="flex items-center gap-3 mb-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    categoryConfig[selectedItem.category].color
                  }`}></div>
                <h1 className="text-white text-3xl font-bold leading-tight">
                  {selectedItem.title}
                </h1>
              </div>
              {/* 类型和标签在同一行 */}
              <div className="flex items-center gap-3 flex-wrap">
                {selectedItem.category !== 'habit' && (
                  <div className="text-slate-400 text-sm">
                    {categoryConfig[selectedItem.category].name}
                  </div>
                )}
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <>
                    {selectedItem.category !== 'habit' && (
                      <div className="text-slate-600">|</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-slate-700/30 rounded-md text-slate-400 text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 操作按钮组 */}
            <div className="flex items-center gap-3">
              {/* 主要操作按钮 */}
              {isCheckInTask ? (
                <button
                  onClick={() => handleCheckInToggle(selectedItem)}
                  disabled={isUpdating}
                  className={`w-16 h-16 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                    selectedItem.completed
                      ? 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : selectedItem.completed ? (
                    <svg
                      className="w-7 h-7"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ) : (
                <Link
                  href={`/focus?id=${
                    selectedItem.id
                  }&remaining=${getRemainingTime(
                    selectedItem
                  )}&elapsed=${getExecutedTime(selectedItem)}`}
                  className="inline-flex items-center justify-center w-16 h-16 border-2 border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white rounded-full transition-all duration-200">
                  <svg
                    className="w-7 h-7"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              )}

              {/* 删除按钮 */}
              <button
                onClick={confirmDelete}
                disabled={isUpdating || isDeleting}
                className="w-12 h-12 rounded-full border-2 border-red-600/50 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-500/50 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                <svg
                  className="w-5 h-5"
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

          {/* 总时长信息 - 仅非打卡任务显示 */}
          {!isCheckInTask && selectedItem.durationMinutes > 0 && (
            <div className="mb-6">
              <div className="flex items-baseline gap-6 mb-2">
                <div>
                  <div className="text-slate-400 text-xs font-medium mb-1">
                    总时长
                  </div>
                  <div className="text-white text-4xl font-light tracking-wide">
                    {formatDuration(selectedItem.durationMinutes)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 进度条 - 仅为非打卡任务显示 */}
          {!isCheckInTask && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">任务进度</span>
                  {getExecutedTime(selectedItem) > 0 && (
                    <span className="text-slate-500 text-xs">
                      已执行 {getExecutedTime(selectedItem)} 分钟
                    </span>
                  )}
                </div>
                <span className="text-white text-sm font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* 任务详情列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                {isCheckInTask ? '打卡清单' : '任务清单'}
              </h4>
              <div className="text-slate-600">|</div>
              <span className="text-slate-400 text-sm">
                {selectedItem.time}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {selectedItem.details &&
              selectedItem.details.map((detail: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-b-0 group">
                  {editingDetail === index ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="flex-1 bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 group/text">
                        <p className="text-white font-medium">{detail}</p>
                        <div className="flex items-center gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(index, detail)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 hover:text-slate-300 transition-colors">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteDetail(index)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 transition-colors">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 11a1 1 0 012 0v.01a1 1 0 01-2 0V11zm2-4a1 1 0 00-2 0v2a1 1 0 002 0V7z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div
                        onClick={() => toggleDetailCompletion(index)}
                        className={`w-5 h-5 rounded-full border-2 transition-colors cursor-pointer flex items-center justify-center ${
                          completedDetails.has(index)
                            ? 'border-green-400/40 bg-green-400/20 text-white'
                            : 'border-amber-400/80 hover:border-amber-300'
                        }`}>
                        {completedDetails.has(index) && (
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>

          {/* 添加新清单项按钮 */}
          <div className="mt-4">
            <button
              onClick={addNewDetail}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 删除确认模态框 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  确认删除任务
                </h3>
              </div>

              <p className="text-slate-300 mb-6">
                您确定要删除任务{' '}
                <span className="font-medium text-white">
                  &ldquo;{selectedItem.title}&rdquo;
                </span>{' '}
                吗？
                <br />
                <span className="text-slate-400 text-sm">
                  此操作无法撤销，所有相关数据将被永久删除。
                </span>
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50">
                  取消
                </button>
                <button
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      删除中...
                    </>
                  ) : (
                    '确认删除'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 没有选中任务时显示统计视图
  return (
    <div className="flex flex-col h-full">
      {/* 今日统计 */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-light text-slate-200">今日项目</h3>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-light text-amber-400">
            {timelineItems.filter((item) => item.completed).length}
          </div>
          <div className="text-slate-500">/</div>
          <div className="text-lg text-slate-400">{timelineItems.length}</div>
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
                    onClick={() => onSelectItem(item)}
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
                      <div className="flex items-center gap-2">
                        {item.type === 'check-in' && (
                          <span className="text-xs text-slate-400">打卡</span>
                        )}
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
                    {/* 进度条预览 */}
                    {item.type !== 'check-in' && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-600 rounded-full h-1">
                          <div
                            className="bg-green-400 h-1 rounded-full"
                            style={{
                              width: `${calculateProgress(item)}%`,
                            }}></div>
                        </div>
                      </div>
                    )}
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
                    onClick={() => onSelectItem(item)}
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
                      <div className="flex items-center gap-2">
                        {item.type === 'check-in' && (
                          <span className="text-xs text-slate-400">打卡</span>
                        )}
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400"></div>
                      </div>
                    </div>
                    {/* 进度条预览 */}
                    {item.type !== 'check-in' && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-600 rounded-full h-1">
                          <div
                            className="bg-amber-400 h-1 rounded-full"
                            style={{
                              width: `${calculateProgress(item)}%`,
                            }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* 底部统计 */}
          <div className="mt-6 pt-4 border-t border-slate-700/30">
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                打卡{' '}
                {
                  timelineItems.filter(
                    (item) => item.type === 'check-in' && item.completed
                  ).length
                }
                /
                {
                  timelineItems.filter((item) => item.type === 'check-in')
                    .length
                }
              </span>
              <span>
                任务{' '}
                {
                  timelineItems.filter(
                    (item) => item.type !== 'check-in' && item.completed
                  ).length
                }
                /
                {
                  timelineItems.filter((item) => item.type !== 'check-in')
                    .length
                }
              </span>
            </div>
            {timelineItems.length > 0 && (
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                <div
                  className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (timelineItems.filter((item) => item.completed).length /
                        timelineItems.length) *
                      100
                    }%`,
                  }}></div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-lg mb-2">暂无任务</p>
            <p className="text-sm">点击时间线中的任务查看详情</p>
          </div>
        </div>
      )}
    </div>
  )
}
