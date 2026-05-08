'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/app/store'
import { completeTimer } from '@/app/slices/timerSlice'
import { ProjectItem } from '@/lib/api'
import { taskProgressAPI, TaskProgressData } from '@/lib/task-progress-api'
import { taskRemainingAPI, TaskRemainingData } from '@/lib/task-remaining-api'

// Import sub-components
import TaskHeaderSection from './task-detail/TaskHeaderSection'
import TaskProgressTracker from './task-detail/TaskProgressTracker'
import TaskChecklist from './task-detail/TaskChecklist'
import DeleteConfirmModal from './task-detail/DeleteConfirmModal'
import TaskSummaryView from './task-detail/TaskSummaryView'

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
  const [completedDetails, setCompletedDetails] = useState<Set<number>>(new Set())

  // 任务基本信息编辑状态
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editingTaskData, setEditingTaskData] = useState({
    title: '',
    time: '',
    tags: [] as string[],
    durationMinutes: 0,
  })
  const [taskProgressData, setTaskProgressData] = useState<Map<string, TaskProgressData>>(new Map())
  const [taskRemainingData, setTaskRemainingData] = useState<Map<string, TaskRemainingData>>(new Map())

  const timer = useSelector((state: RootState) => state.timer)
  const dispatch = useDispatch()
  const cardRef = useRef<HTMLDivElement>(null)
  const loadedBatchKeyRef = useRef('')

  // 处理点击外部区域关闭任务详情
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedItem && cardRef.current && !cardRef.current.contains(event.target as Node) && onClose) {
        onClose()
      }
    }

    if (selectedItem) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedItem, onClose])

  // 加载选中任务的数据
  const loadTaskProgress = useCallback(async (taskId: string) => {
    try {
      const progressData = await taskProgressAPI.getTaskProgress(taskId)
      setTaskProgressData((prev) => new Map(prev.set(taskId, progressData)))
    } catch (error) {
      console.error(`Failed to load task progress (${taskId}):`, error)
    }
  }, [])

  const loadTaskRemaining = useCallback(async (taskId: string) => {
    try {
      const remainingData = await taskRemainingAPI.getTaskRemaining(taskId)
      setTaskRemainingData((prev) => new Map(prev.set(taskId, remainingData)))
    } catch (error) {
      console.error(`Failed to load task remaining time (${taskId}):`, error)
    }
  }, [])

  useEffect(() => {
    if (selectedItem && selectedItem.type !== 'check-in') {
      loadTaskProgress(selectedItem.id)
      loadTaskRemaining(selectedItem.id)
    }
  }, [selectedItem, loadTaskProgress, loadTaskRemaining])

  // 优化：智能批量加载任务数据
  useEffect(() => {
    const loadTasksOptimized = async () => {
      const todoTasks = timelineItems.filter((item) => item.type !== 'check-in')
      if (todoTasks.length === 0) return

      const taskIds = todoTasks.map((task) => task.id)
      const batchKey = [...taskIds].sort().join(',')
      if (batchKey === loadedBatchKeyRef.current) return
      loadedBatchKeyRef.current = batchKey

      const promises: Promise<void>[] = []

      promises.push(
        taskProgressAPI
          .getBatchTaskProgress(taskIds)
          .then((progressDataArray) => {
            setTaskProgressData((prev) => {
              const newProgressData = new Map(prev)
              progressDataArray.forEach((data) => {
                if (data.taskId) newProgressData.set(data.taskId, data)
              })
              return newProgressData
            })
          })
          .catch(() => taskIds.forEach((taskId) => loadTaskProgress(taskId)))
      )

      promises.push(
        taskRemainingAPI
          .getBatchTaskRemaining(taskIds)
          .then((remainingDataMap) => {
            setTaskRemainingData((prev) => {
              const newRemainingData = new Map(prev)
              remainingDataMap.forEach((data, taskId) => {
                newRemainingData.set(taskId, data)
              })
              return newRemainingData
            })
          })
          .catch(() => taskIds.forEach((taskId) => loadTaskRemaining(taskId)))
      )

      if (promises.length > 0) await Promise.allSettled(promises)
    }

    loadTasksOptimized()
  }, [timelineItems, loadTaskProgress, loadTaskRemaining])

  const handleCheckInToggle = async (task: ProjectItem) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: task.completed ? 'in_progress' : 'completed',
          completedAt: task.completed ? null : new Date().toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        const updatedTask = { ...task, completed: !task.completed }
        onTaskUpdate?.(updatedTask)

        // 如果当前完成的任务是正在计时的任务，则完成计时器
        if (!task.completed && task.id === timer.taskId) {
          dispatch(completeTimer())
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const calculateProgress = (task: ProjectItem): number => {
    if (task.type === 'check-in' || task.completed) return 100

    // 如果是当前正在计时的任务，从 Redux 获取实时进度
    if (task.id === timer.taskId && timer.totalEstimated > 0) {
      return Math.min((timer.totalElapsed / timer.totalEstimated) * 100, 100)
    }

    const progressData = taskProgressData.get(task.id)
    return progressData ? progressData.progressPercentage : 0
  }

  const getExecutedTime = (task: ProjectItem): number => {
    if (task.type === 'check-in') return 0

    // 如果是当前正在计时的任务，从 Redux 获取实时执行时长
    if (task.id === timer.taskId) {
      return Math.floor(timer.totalElapsed / 60)
    }

    const remainingData = taskRemainingData.get(task.id)
    if (remainingData) return remainingData.executedMinutes
    const progressData = taskProgressData.get(task.id)
    return progressData ? Math.floor(progressData.totalExecutedTime / 60) : 0
  }

  const getRemainingTime = (task: ProjectItem): number => {
    if (task.type === 'check-in') return 0

    // 如果是当前正在计时的任务，从 Redux 获取实时剩余时长
    if (task.id === timer.taskId) {
      return Math.floor(timer.timeRemaining / 60)
    }

    const remainingData = taskRemainingData.get(task.id)
    return remainingData ? remainingData.remainingMinutes : task.durationMinutes || 25
  }

  const handleSaveEdit = async () => {
    if (editingDetail === null || !selectedItem) return
    const updatedDetails = [...(selectedItem.details || [])]
    updatedDetails[editingDetail] = editingText

    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: updatedDetails }),
      })
      if (response.ok) {
        onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
      }
    } catch (error) {
      console.error('Failed to update task details:', error)
    }
    setEditingDetail(null)
    setEditingText('')
  }

  const handleDeleteDetail = async (index: number) => {
    if (!selectedItem) return
    const updatedDetails = selectedItem.details?.filter((_, i) => i !== index) || []
    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: updatedDetails }),
      })
      if (response.ok) {
        onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
      }
    } catch (error) {
      console.error('Failed to delete task details:', error)
    }
  }

  const handleAddNewDetail = async () => {
    if (!selectedItem) return
    const newDetail = '新任务项'
    const updatedDetails = [...(selectedItem.details || []), newDetail]
    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: updatedDetails }),
      })
      if (response.ok) {
        onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
        setEditingDetail(updatedDetails.length - 1)
        setEditingText(newDetail)
      }
    } catch (error) {
      console.error('Failed to add task details:', error)
    }
  }

  const handleSaveTaskEdit = async () => {
    if (!selectedItem) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTaskData.title,
          plannedTime: editingTaskData.time,
          tags: editingTaskData.tags,
          estimatedDuration: editingTaskData.durationMinutes * 60,
        }),
      })
      if (response.ok) {
        onTaskUpdate?.({
          ...selectedItem,
          title: editingTaskData.title,
          time: editingTaskData.time,
          tags: editingTaskData.tags,
          durationMinutes: editingTaskData.durationMinutes,
        })
        setIsEditingTask(false)
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedItem || !onTaskDelete) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${selectedItem.id}`, { method: 'DELETE' })
      if (response.ok) {
        onTaskDelete(selectedItem.id)

        // 如果删除的是当前正在计时的任务，需要清除计时器状态
        if (selectedItem.id === timer.taskId) {
          dispatch(completeTimer())
        }

        onClose?.()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (selectedItem) {
    return (
      <div ref={cardRef} className="flex flex-col h-full">
        <TaskHeaderSection
          selectedItem={selectedItem}
          isEditingTask={isEditingTask}
          isUpdating={isUpdating}
          editingTaskData={editingTaskData}
          setEditingTaskData={setEditingTaskData}
          onStartEditingTask={() => {
            setEditingTaskData({
              title: selectedItem.title,
              time: selectedItem.time,
              tags: selectedItem.tags || [],
              durationMinutes: selectedItem.durationMinutes || 0,
            })
            setIsEditingTask(true)
          }}
          onSaveTaskEdit={handleSaveTaskEdit}
          onCancelTaskEdit={() => setIsEditingTask(false)}
          onRemoveTag={(index) => setEditingTaskData(p => ({ ...p, tags: p.tags.filter((_, i) => i !== index) }))}
          onAddTag={(tag) => { if (tag && !editingTaskData.tags.includes(tag)) setEditingTaskData(p => ({ ...p, tags: [...p.tags, tag] })) }}
          onHandleCheckInToggle={handleCheckInToggle}
          getRemainingTime={getRemainingTime}
          getExecutedTime={getExecutedTime}
        />

        <TaskProgressTracker
          durationMinutes={selectedItem.durationMinutes}
          executedMinutes={getExecutedTime(selectedItem)}
          remainingMinutes={getRemainingTime(selectedItem)}
          progress={calculateProgress(selectedItem)}
          isCheckInTask={selectedItem.type === 'check-in'}
          taskId={selectedItem.id}
        />

        <TaskChecklist
          details={selectedItem.details}
          editingDetail={editingDetail}
          editingText={editingText}
          completedDetails={completedDetails}
          onStartEditing={(index, text) => { setEditingDetail(index); setEditingText(text); }}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => {
            if (selectedItem.details?.[editingDetail!] === '新任务项') handleDeleteDetail(editingDetail!)
            setEditingDetail(null); setEditingText('');
          }}
          onDeleteDetail={handleDeleteDetail}
          onToggleDetail={(index) => setCompletedDetails(prev => {
            if (selectedItem.details?.[index] === '新任务项') { handleDeleteDetail(index); return prev; }
            const next = new Set(prev);
            if (next.has(index)) {
              next.delete(index);
            } else {
              next.add(index);
            }
            return next;
          })}
          onAddNewDetail={handleAddNewDetail}
          setEditingText={setEditingText}
          isCheckInTask={selectedItem.type === 'check-in'}
          time={selectedItem.time}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          title={selectedItem.title}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteTask}
        />
      </div>
    )
  }

  return (
    <TaskSummaryView
      timelineItems={timelineItems}
      onSelectItem={onSelectItem}
      calculateProgress={calculateProgress}
    />
  )
}
