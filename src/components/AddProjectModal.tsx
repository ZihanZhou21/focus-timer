'use client'

import { useState } from 'react'
import { taskTypeConfig, DEFAULT_USER_ID } from '@/lib/constants'
import { ProjectItem } from '@/lib/api'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectAdded: (project: ProjectItem) => void
  selectedDate?: string
}

const icons = [
  '📝',
  '💻',
  '📚',
  '🏃',
  '💪',
  '🎯',
  '☕',
  '🍳',
  '🥗',
  '👥',
  '🎬',
  '📖',
  '🧘',
  '☀️',
  '🛠️',
  '👨‍👩‍👧‍👦',
]
const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-slate-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
]

// 预设标签选项
const presetTags = [
  '重要',
  '紧急',
  '工作',
  '学习',
  '健康',
  '娱乐',
  '家庭',
  '社交',
  '创意',
  '规划',
  '复习',
  '练习',
  '阅读',
  '写作',
  '思考',
  '放松',
  '运动',
  '冥想',
  '会议',
  '项目',
  '技能',
  '爱好',
  '目标',
  '习惯',
]

// 一周天数配置
const WEEKDAYS = [
  { key: 0, label: '周日', short: '日' },
  { key: 1, label: '周一', short: '一' },
  { key: 2, label: '周二', short: '二' },
  { key: 3, label: '周三', short: '三' },
  { key: 4, label: '周四', short: '四' },
  { key: 5, label: '周五', short: '五' },
  { key: 6, label: '周六', short: '六' },
]

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
    // 重复设置
    isRecurring: boolean
    recurringDays: number[]
    recurringWeeks: number
  }>({
    title: '',
    time: '',
    durationMinutes: 0,
    type: 'todo',
    icon: '📝',
    iconColor: 'bg-blue-500',
    details: [],
    tags: [],
    // 重复设置默认值
    isRecurring: false,
    recurringDays: [],
    recurringWeeks: 4, // 默认创建4周的重复任务
  })

  const [newDetail, setNewDetail] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)

    try {
      const baseDate = selectedDate || new Date().toISOString().split('T')[0]

      if (formData.isRecurring && formData.recurringDays.length > 0) {
        // 创建重复任务模板
        const parentId = `recurring-${Date.now()}` // 生成父ID用于关联
        const endDate = new Date(baseDate)
        endDate.setDate(endDate.getDate() + formData.recurringWeeks * 7)

        const recurringTaskTemplate = {
          title: formData.title,
          time: formData.time,
          durationMinutes: formData.durationMinutes,
          type: formData.type,
          icon: formData.icon,
          iconColor: formData.iconColor,
          details: formData.details.filter((d) => d.trim()),
          tags: [...formData.tags.filter((t) => t.trim()), '重复任务'],
          date: baseDate, // 起始日期
          userId: DEFAULT_USER_ID,
          completed: false,
          // 重复任务信息
          isRecurring: true,
          recurringDays: formData.recurringDays,
          recurringWeeks: formData.recurringWeeks,
          recurringParentId: parentId,
          recurringEndDate: endDate.toISOString().split('T')[0], // 重复结束日期
          isTemplate: true, // 标记为模板
        }

        // 保存重复任务模板
        const templateResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringTaskTemplate),
        })

        if (templateResponse.ok) {
          const templateProject = await templateResponse.json()

          // 检查今天是否需要创建实例
          const today = new Date(baseDate)
          const todayDayOfWeek = today.getDay()

          if (formData.recurringDays.includes(todayDayOfWeek)) {
            // 创建今天的实例
            const todayInstance = {
              ...recurringTaskTemplate,
              isTemplate: false, // 标记为实例，不是模板
              recurringTemplateId: templateProject.id, // 关联到模板
            }

            const instanceResponse = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(todayInstance),
            })

            if (instanceResponse.ok) {
              const todayProject = await instanceResponse.json()
              onProjectAdded(todayProject)
            }
          }
        }
      } else {
        // 创建单个任务
        const projectData = {
          title: formData.title,
          time: formData.time,
          durationMinutes: formData.durationMinutes,
          type: formData.type,
          details: formData.details.filter((d) => d.trim()),
          tags: formData.tags.filter((t) => t.trim()),
          date: baseDate,
          userId: DEFAULT_USER_ID,
          completed: false,
        }

        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        })

        if (response.ok) {
          const newProject = await response.json()
          onProjectAdded(newProject)
        }
      }

      handleClose()
    } catch (error) {
      console.error('创建项目失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      time: '',
      durationMinutes: 0,
      type: 'todo',
      icon: '📝',
      iconColor: 'bg-blue-500',
      details: [],
      tags: [],
      isRecurring: false,
      recurringDays: [],
      recurringWeeks: 4,
    })
    setNewDetail('')
    setNewTag('')
    onClose()
  }

  const addDetail = () => {
    if (newDetail.trim()) {
      setFormData((prev) => ({
        ...prev,
        details: [...prev.details, newDetail.trim()],
      }))
      setNewDetail('')
    }
  }

  const removeDetail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index),
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag('')
    }
  }

  const selectPresetTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t !== tag),
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }))
    }
  }

  const removeTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }))
  }

  // 处理重复天数选择
  const toggleRecurringDay = (dayIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayIndex)
        ? prev.recurringDays.filter((d) => d !== dayIndex)
        : [...prev.recurringDays, dayIndex].sort(),
    }))
  }

  // 快速选择预设
  const selectWorkdays = () => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: [1, 2, 3, 4, 5], // 周一到周五
    }))
  }

  const selectWeekends = () => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: [0, 6], // 周日和周六
    }))
  }

  const selectAllDays = () => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: [0, 1, 2, 3, 4, 5, 6], // 全部
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">添加新项目</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                项目标题
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-3 bg-slate-700 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="输入项目标题..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  开始时间
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, time: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  时长（分钟）
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      durationMinutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* 重复设置 */}
          <div className="bg-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-slate-300">
                重复任务设置
              </label>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    isRecurring: !prev.isRecurring,
                    recurringDays: prev.isRecurring ? [] : prev.recurringDays,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isRecurring ? 'bg-amber-600' : 'bg-slate-600'
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isRecurring ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">
                      选择重复的天数
                    </span>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectWorkdays}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 transition-colors">
                        工作日
                      </button>
                      <button
                        type="button"
                        onClick={selectWeekends}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 transition-colors">
                        周末
                      </button>
                      <button
                        type="button"
                        onClick={selectAllDays}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 transition-colors">
                        每天
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => toggleRecurringDay(day.key)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          formData.recurringDays.includes(day.key)
                            ? 'bg-amber-600 text-white ring-2 ring-amber-500'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}>
                        <div className="text-xs opacity-75">{day.short}</div>
                        <div className="text-xs mt-1">{day.label.slice(1)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    创建几周的重复任务
                  </label>
                  <select
                    value={formData.recurringWeeks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurringWeeks: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-2 bg-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value={1}>1周</option>
                    <option value={2}>2周</option>
                    <option value={4}>4周</option>
                    <option value={8}>8周</option>
                    <option value={12}>12周</option>
                  </select>
                </div>

                {formData.recurringDays.length > 0 && (
                  <div className="text-xs text-slate-400 bg-slate-700/50 rounded-xl p-3">
                    <div className="font-medium mb-1">将创建重复任务模板：</div>
                    <div>
                      每周{' '}
                      {formData.recurringDays
                        .map((d) => WEEKDAYS[d].label)
                        .join('、')}
                      ， 共 {formData.recurringWeeks} 周
                    </div>
                    <div className="mt-1 text-slate-500">
                      ⓘ 系统将根据设定自动在相应的日期生成任务实例
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 分类选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              项目分类
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(taskTypeConfig).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: key as 'todo' | 'check-in',
                    }))
                  }
                  className={`p-3 rounded-2xl border-2 transition-all ${
                    formData.type === key
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>
                  <div
                    className={`w-3 h-3 rounded-full ${config.color} mx-auto mb-1`}></div>
                  <div className="text-sm font-medium">{config.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 图标和颜色选择 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                图标
              </label>
              <div className="grid grid-cols-6 gap-2">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                    className={`p-3 rounded-xl transition-all ${
                      formData.icon === icon
                        ? 'bg-amber-500/20 ring-2 ring-amber-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}>
                    <span className="text-lg">{icon}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                颜色
              </label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, iconColor: color }))
                    }
                    className={`w-10 h-10 rounded-xl ${color} transition-all ${
                      formData.iconColor === color
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                        : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 准备事项 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              准备事项
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addDetail())
                  }
                  className="flex-1 px-4 py-2 bg-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="添加准备事项..."
                />
                <button
                  type="button"
                  onClick={addDetail}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-white font-medium transition-colors">
                  添加
                </button>
              </div>
              {formData.details.length > 0 && (
                <div className="space-y-1">
                  {formData.details.map((detail, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-xl">
                      <span className="text-slate-300 flex-1">{detail}</span>
                      <button
                        type="button"
                        onClick={() => removeDetail(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags 标签 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              标签
            </label>
            <div className="space-y-4">
              {/* 预设标签选择 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">快速选择</div>
                <div className="flex flex-wrap gap-2">
                  {presetTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => selectPresetTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-all cursor-pointer ${
                        formData.tags.includes(tag)
                          ? 'bg-green-600/30 border border-green-600/60 text-green-200 hover:bg-green-600/40 hover:border-green-600/80'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500'
                      }`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 自定义标签输入 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">自定义标签</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addTag())
                    }
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="输入自定义标签..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-white font-medium transition-colors">
                    添加
                  </button>
                </div>
              </div>

              {/* 已选标签显示 */}
              {formData.tags.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2">已选标签</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600/20 border border-green-600/40 rounded-full text-green-200">
                        <span className="text-sm">#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="text-green-400 hover:text-red-400 transition-colors ml-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-2xl text-slate-300 font-medium transition-colors">
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:text-slate-400 rounded-2xl text-white font-medium transition-colors">
              {isSubmitting
                ? '创建中...'
                : formData.isRecurring
                ? '创建重复任务'
                : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
