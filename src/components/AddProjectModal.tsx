'use client'

import { useState } from 'react'
import {
  PRESET_ICONS,
  PRESET_COLORS,
  PRESET_TAGS,
  WEEKDAYS,
  taskTypeConfig,
  DEFAULT_USER_ID,
} from '@/lib/constants'
import { ProjectItem, taskService } from '@/lib/api'
import { CheckInTask, TodoTask } from '@/lib/types'
import VisualPicker from './add-project/VisualPicker'
import { FormField } from './add-project/FormHelpers'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectAdded: (project: ProjectItem) => void
  selectedDate?: string
}

export default function AddProjectModal({
  isOpen,
  onClose,
  onProjectAdded,
  selectedDate,
}: AddProjectModalProps) {
  const [formData, setFormData] = useState<{
    title: string
    time: string
    durationMinutes: number
    type: 'todo' | 'check-in'
    icon: string
    iconColor: string
    details: string[]
    tags: string[]
    isRecurring: boolean
    recurringDays: number[]
  }>({
    title: '',
    time: new Date().toTimeString().substring(0, 5),
    durationMinutes: 25,
    type: 'todo',
    icon: PRESET_ICONS[0],
    iconColor: PRESET_COLORS[0],
    details: [],
    tags: [],
    isRecurring: false,
    recurringDays: [1, 2, 3, 4, 5],
  })

  const [newDetail, setNewDetail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAddDetail = () => {
    if (newDetail.trim()) {
      setFormData((prev) => ({
        ...prev,
        details: [...prev.details, newDetail.trim()],
      }))
      setNewDetail('')
    }
  }

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const toggleDay = (dayKey: number) => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayKey)
        ? prev.recurringDays.filter((d) => d !== dayKey)
        : [...prev.recurringDays, dayKey],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      const today = selectedDate || new Date().toISOString().split('T')[0]
      
      const newTaskData = {
        userId: DEFAULT_USER_ID,
        title: formData.title,
        plannedTime: formData.time,
        content: formData.details,
        estimatedDuration: formData.durationMinutes * 60,
        type: formData.type,
        icon: formData.icon,
        iconColor: formData.iconColor,
        details: formData.details,
        tags: formData.tags,
        status: 'in_progress' as const,
        priority: 'medium' as const,
        completedAt: [],
        date: today,
        ...(formData.isRecurring && {
          isRecurring: true,
          recurrence: {
            frequency: 'weekly' as const,
            daysOfWeek: formData.recurringDays,
          }
        })
      }

      const result = formData.type === 'todo'
        ? await taskService.createTodoTask({
            ...newTaskData,
            type: 'todo',
            dueDate: null,
            dailyTimeStats: {},
          } satisfies Omit<TodoTask, '_id' | 'createdAt' | 'updatedAt'>)
        : await taskService.createCheckInTask({
            ...newTaskData,
            type: 'check-in',
            checkInHistory: [],
            recurrence: {
              frequency: 'weekly',
              daysOfWeek: formData.recurringDays,
            },
          } satisfies Omit<CheckInTask, '_id' | 'createdAt' | 'updatedAt'>)

      // Convert back to ProjectItem for UI
      const projectItem: ProjectItem = {
        id: result._id || result.id || `task_${Date.now()}`,
        userId: DEFAULT_USER_ID,
        date: today,
        time: formData.time,
        title: formData.title,
        durationMinutes: formData.durationMinutes,
        icon: result.icon || '📝',
        iconColor: formData.iconColor,
        completed: false,
        details: formData.details,
        tags: formData.tags,
        type: formData.type,
      }

      onProjectAdded(projectItem)
      onClose()
      // Reset form
      setFormData({
        title: '',
        time: new Date().toTimeString().substring(0, 5),
        durationMinutes: 25,
        type: 'todo',
        icon: PRESET_ICONS[0],
        iconColor: PRESET_COLORS[0],
        details: [],
        tags: [],
        isRecurring: false,
        recurringDays: [1, 2, 3, 4, 5],
      })
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Project</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Plan your focus session or daily habit</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField label="Title">
                <input
                  type="text"
                  required
                  placeholder="What are you working on?"
                  value={formData.title}
                  onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Time">
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  />
                </FormField>
                <FormField label="Duration (min)">
                  <input
                    type="number"
                    min="1"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData(p => ({ ...p, durationMinutes: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                  />
                </FormField>
              </div>

              <FormField label="Type">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  {(['todo', 'check-in'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, type }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.type === type
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {taskTypeConfig[type].name}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>

            {/* Visuals */}
            <VisualPicker
              selectedIcon={formData.icon}
              selectedColor={formData.iconColor}
              onIconSelect={(icon) => setFormData(p => ({ ...p, icon }))}
              onColorSelect={(iconColor) => setFormData(p => ({ ...p, iconColor }))}
            />
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Checklist & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <FormField label="Checklist Items">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add step..."
                    value={newDetail}
                    onChange={(e) => setNewDetail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDetail())}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={handleAddDetail} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Add</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {formData.details.map((detail, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg group">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{detail}</span>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, details: p.details.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">×</button>
                    </div>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="space-y-4">
              <FormField label="Tags">
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs transition-all ${
                        formData.tags.includes(tag)
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          </div>

          {/* Recurring Options */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">Recurring Project</h4>
                <p className="text-xs text-slate-500">Automatically repeat this task on specific days</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, isRecurring: !p.isRecurring }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.isRecurring ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isRecurring ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {formData.isRecurring && (
              <div className="flex justify-between pt-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                      formData.recurringDays.includes(day.key)
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white dark:bg-slate-700 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim()}
            className="flex-[2] py-3 px-6 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
