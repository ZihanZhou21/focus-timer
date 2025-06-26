'use client'

import { useState } from 'react'
import type { TimeLogEntry, CheckInEntry } from '@/lib/types'

interface SimpleTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskAdded: () => void
}

const TASK_TYPES = [
  { value: 'todo', label: '待办任务', icon: '📝' },
  { value: 'check-in', label: '习惯打卡', icon: '✅' },
]

const PRIORITIES = [
  { value: 'low', label: '低', color: 'text-green-400' },
  { value: 'medium', label: '中', color: 'text-yellow-400' },
  { value: 'high', label: '高', color: 'text-red-400' },
]

const COMMON_TAGS = [
  '工作',
  '学习',
  '健康',
  '运动',
  '习惯',
  '阅读',
  '编程',
  '设计',
  '会议',
  '家务',
  '娱乐',
  '社交',
]

export default function SimpleTaskModal({
  isOpen,
  onClose,
  onTaskAdded,
}: SimpleTaskModalProps) {
  const [taskType, setTaskType] = useState<'todo' | 'check-in'>('todo')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState([''])
  const [plannedTime, setPlannedTime] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState(60) // 分钟
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const weekDays = [
    { value: 1, label: '周一' },
    { value: 2, label: '周二' },
    { value: 3, label: '周三' },
    { value: 4, label: '周四' },
    { value: 5, label: '周五' },
    { value: 6, label: '周六' },
    { value: 0, label: '周日' },
  ]

  const addContentItem = () => {
    setContent([...content, ''])
  }

  const updateContentItem = (index: number, value: string) => {
    const newContent = [...content]
    newContent[index] = value
    setContent(newContent)
  }

  const removeContentItem = (index: number) => {
    if (content.length > 1) {
      setContent(content.filter((_, i) => i !== index))
    }
  }

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()])
      setCustomTag('')
    }
  }

  const toggleRecurringDay = (day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const resetForm = () => {
    setTaskType('todo')
    setTitle('')
    setContent([''])
    setPlannedTime('')
    setPriority('medium')
    setTags([])
    setCustomTag('')
    setEstimatedDuration(60)
    setDueDate('')
    setIsRecurring(false)
    setRecurringDays([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const baseTask = {
        userId: 'user_001',
        type: taskType,
        title: title.trim(),
        content: content.filter((item) => item.trim()),
        status: 'pending' as const,
        priority,
        tags,
        plannedTime: plannedTime || '09:00',
      }

      let taskData: {
        userId: string
        type: 'todo' | 'check-in'
        title: string
        content: string[]
        status: 'pending'
        priority: 'low' | 'medium' | 'high'
        tags: string[]
        plannedTime: string
        dueDate?: string | null
        estimatedDuration?: number
        timeLog?: TimeLogEntry[]
        checkInHistory?: CheckInEntry[]
        recurrence?: {
          frequency: 'daily' | 'weekly'
          daysOfWeek: number[]
        }
      } = baseTask

      if (taskType === 'todo') {
        taskData = {
          ...baseTask,
          dueDate: dueDate || null,
          estimatedDuration: estimatedDuration * 60, // 转换为秒
          timeLog: [],
        }
      } else {
        taskData = {
          ...baseTask,
          checkInHistory: [],
          recurrence: {
            frequency: isRecurring ? 'daily' : 'weekly',
            daysOfWeek: isRecurring ? [1, 2, 3, 4, 5, 6, 0] : recurringDays,
          },
        }
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        resetForm()
        onTaskAdded()
        onClose()
      } else {
        console.error('Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-medium text-slate-200 mb-6">创建新任务</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 任务类型选择 */}
          <div>
            <label className="block text-sm text-slate-400 mb-3">
              任务类型
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TASK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setTaskType(type.value as 'todo' | 'check-in')}
                  className={`p-3 rounded-lg border transition-colors ${
                    taskType === type.value
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>
                  <span className="text-lg mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 任务标题 */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              任务标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
              placeholder={
                taskType === 'todo' ? '输入待办事项...' : '输入习惯名称...'
              }
              required
            />
          </div>

          {/* 任务内容 */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {taskType === 'todo' ? '任务详情' : '打卡内容'}
            </label>
            <div className="space-y-2">
              {content.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateContentItem(index, e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                    placeholder={`${taskType === 'todo' ? '步骤' : '内容'} ${
                      index + 1
                    }`}
                  />
                  {content.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContentItem(index)}
                      className="px-3 py-2 text-slate-400 hover:text-red-400 transition-colors">
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addContentItem}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                + 添加{taskType === 'todo' ? '步骤' : '内容'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 计划时间 */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                计划时间
              </label>
              <input
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* 优先级 */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                优先级
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'low' | 'medium' | 'high')
                }
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none">
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}优先级
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Todo特有字段 */}
          {taskType === 'todo' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  预计时长（分钟）
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  min="5"
                  max="480"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  截止日期
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Check-in特有字段 */}
          {taskType === 'check-in' && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                重复设置
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="mr-2 rounded"
                  />
                  <span className="text-slate-300">每日重复</span>
                </label>

                {!isRecurring && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">
                      选择重复日期：
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleRecurringDay(day.value)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            recurringDays.includes(day.value)
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}>
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 标签 */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">标签</label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      tags.includes(tag)
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addCustomTag())
                  }
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-sm text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  placeholder="自定义标签..."
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-3 py-1 text-sm bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-colors">
                  添加
                </button>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              disabled={isSubmitting}>
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting || !title.trim()}>
              {isSubmitting
                ? '创建中...'
                : `创建${taskType === 'todo' ? '任务' : '习惯'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
