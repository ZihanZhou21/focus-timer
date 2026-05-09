'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { completeTimer } from '@/app/slices/timerSlice'
import { ProjectItem } from '@/lib/api'
import {
  useGetBatchTaskInfoQuery,
  useUpdateTaskMutation,
} from '@/lib/services/tasks-api'

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
  onAddTask?: () => void
}

export default function TaskDetailCard({
  selectedItem,
  timelineItems,
  onSelectItem,
  onTaskUpdate,
  onTaskDelete,
  onClose,
  onAddTask,
}: TaskDetailCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingDetail, setEditingDetail] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [completedDetails, setCompletedDetails] = useState<Set<number>>(
    new Set()
  )
  const [isEditingTask, setIsEditingTask] = useState(false)
  const [editingTaskData, setEditingTaskData] = useState({
    title: '',
    time: '',
    tags: [] as string[],
    durationMinutes: 0,
  })

  const timer = useSelector((state: RootState) => state.timer)
  const dispatch = useDispatch()
  const cardRef = useRef<HTMLDivElement>(null)
  const [updateTaskMutation] = useUpdateTaskMutation()

  const todoTaskIds = useMemo(
    () =>
      Array.from(
        new Set(
          timelineItems
            .filter((item) => item.type !== 'check-in')
            .map((item) => item.id)
        )
      ).sort(),
    [timelineItems]
  )

  const { data: batchTaskInfo } = useGetBatchTaskInfoQuery(todoTaskIds, {
    skip: todoTaskIds.length === 0,
  })

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
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedItem, onClose])

  const getBatchItem = (taskId: string) => batchTaskInfo?.success[taskId]

  const handleCheckInToggle = async (task: ProjectItem) => {
    setIsUpdating(true)
    try {
      await updateTaskMutation({
        id: task.id,
        updates: {
          status: task.completed ? 'in_progress' : 'completed',
          completedAt: task.completed
            ? null
            : new Date().toISOString().split('T')[0],
        },
      }).unwrap()
      const updatedTask = { ...task, completed: !task.completed }
      onTaskUpdate?.(updatedTask)

      if (!task.completed && task.id === timer.taskId) {
        dispatch(completeTimer())
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const calculateProgress = (task: ProjectItem): number => {
    if (task.type === 'check-in' || task.completed) return 100

    if (task.id === timer.taskId && timer.totalEstimated > 0) {
      return Math.min((timer.totalElapsed / timer.totalEstimated) * 100, 100)
    }

    return getBatchItem(task.id)?.progress?.progressPercentage ?? 0
  }

  const getExecutedTime = (task: ProjectItem): number => {
    if (task.type === 'check-in') return 0

    if (task.id === timer.taskId) {
      return Math.floor(timer.totalElapsed / 60)
    }

    const batchItem = getBatchItem(task.id)
    if (batchItem?.remaining) return batchItem.remaining.executedMinutes
    if (batchItem?.progress) {
      return Math.floor(batchItem.progress.totalExecutedTime / 60)
    }
    return 0
  }

  const getRemainingTime = (task: ProjectItem): number => {
    if (task.type === 'check-in') return 0

    if (task.id === timer.taskId) {
      return Math.floor(timer.timeRemaining / 60)
    }

    return (
      getBatchItem(task.id)?.remaining?.remainingMinutes ||
      task.durationMinutes ||
      25
    )
  }

  const handleSaveEdit = async () => {
    if (editingDetail === null || !selectedItem) return
    const updatedDetails = [...(selectedItem.details || [])]
    updatedDetails[editingDetail] = editingText

    try {
      await updateTaskMutation({
        id: selectedItem.id,
        updates: { details: updatedDetails },
      }).unwrap()
      onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
    } catch (error) {
      console.error('Failed to update task details:', error)
    }
    setEditingDetail(null)
    setEditingText('')
  }

  const handleDeleteDetail = async (index: number) => {
    if (!selectedItem) return
    const updatedDetails =
      selectedItem.details?.filter((_, i) => i !== index) || []
    try {
      await updateTaskMutation({
        id: selectedItem.id,
        updates: { details: updatedDetails },
      }).unwrap()
      onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
    } catch (error) {
      console.error('Failed to delete task details:', error)
    }
  }

  const handleAddNewDetail = async () => {
    if (!selectedItem) return
    const newDetail = 'New task item'
    const updatedDetails = [...(selectedItem.details || []), newDetail]
    try {
      await updateTaskMutation({
        id: selectedItem.id,
        updates: { details: updatedDetails },
      }).unwrap()
      onTaskUpdate?.({ ...selectedItem, details: updatedDetails })
      setEditingDetail(updatedDetails.length - 1)
      setEditingText(newDetail)
    } catch (error) {
      console.error('Failed to add task details:', error)
    }
  }

  const handleSaveTaskEdit = async () => {
    if (!selectedItem) return
    setIsUpdating(true)
    try {
      await updateTaskMutation({
        id: selectedItem.id,
        updates: {
          title: editingTaskData.title,
          plannedTime: editingTaskData.time,
          tags: editingTaskData.tags,
          estimatedDuration: editingTaskData.durationMinutes * 60,
        },
      }).unwrap()
      onTaskUpdate?.({
        ...selectedItem,
        title: editingTaskData.title,
        time: editingTaskData.time,
        tags: editingTaskData.tags,
        durationMinutes: editingTaskData.durationMinutes,
      })
      setIsEditingTask(false)
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
      await onTaskDelete(selectedItem.id)

      if (selectedItem.id === timer.taskId) {
        dispatch(completeTimer())
      }

      onClose?.()
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
          onRemoveTag={(index) =>
            setEditingTaskData((p) => ({
              ...p,
              tags: p.tags.filter((_, i) => i !== index),
            }))
          }
          onAddTag={(tag) => {
            if (tag && !editingTaskData.tags.includes(tag)) {
              setEditingTaskData((p) => ({ ...p, tags: [...p.tags, tag] }))
            }
          }}
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
          onStartEditing={(index, text) => {
            setEditingDetail(index)
            setEditingText(text)
          }}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => {
            if (editingDetail !== null) {
              const currentText = selectedItem.details?.[editingDetail]
              if (currentText === 'New task item') {
                handleDeleteDetail(editingDetail)
              }
            }
            setEditingDetail(null)
            setEditingText('')
          }}
          onDeleteDetail={handleDeleteDetail}
          onToggleDetail={(index) =>
            setCompletedDetails((prev) => {
              if (selectedItem.details?.[index] === 'New task item') {
                handleDeleteDetail(index)
                return prev
              }
              const next = new Set(prev)
              if (next.has(index)) {
                next.delete(index)
              } else {
                next.add(index)
              }
              return next
            })
          }
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
      onAddTask={onAddTask}
    />
  )
}
