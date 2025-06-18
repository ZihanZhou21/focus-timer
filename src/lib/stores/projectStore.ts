import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 项目类别枚举
export type ProjectCategory = 'habit' | 'task' | 'focus' | 'exercise'

// 时间线项目接口
export interface TimelineItem {
  id: string
  time: string
  title: string
  duration?: string
  details?: string[]
  icon: string
  iconColor: string
  completed: boolean
  category: ProjectCategory
}

// 项目类别配置
export const categoryConfig = {
  habit: {
    name: '习惯',
    color: 'bg-gray-500',
    description: '日常习惯和待办事项',
  },
  task: {
    name: '任务',
    color: 'bg-blue-500',
    description: '重要任务，需要统计时长',
  },
  focus: {
    name: '专注',
    color: 'bg-amber-500',
    description: '深度专注工作，重点统计',
  },
  exercise: {
    name: '运动',
    color: 'bg-green-500',
    description: '运动健身，保持身体健康',
  },
}

// 项目表单数据接口
export interface ProjectFormData {
  time: string
  title: string
  duration: string
  icon: string
  details: string
  category: ProjectCategory
}

// Store状态接口
interface ProjectState {
  // 时间线项目列表
  timelineItems: TimelineItem[]

  // 当前选中的项目
  selectedItem: TimelineItem | null

  // 已打卡的习惯项目ID集合
  checkedHabits: Set<string>

  // 编辑状态
  editingItemId: string | null
  isEditingInPanel: boolean
  isAddingInPanel: boolean

  // 表单数据
  formData: ProjectFormData

  // Actions
  setTimelineItems: (items: TimelineItem[]) => void
  addTimelineItem: (
    item: Omit<TimelineItem, 'id' | 'iconColor' | 'completed'>
  ) => void
  updateTimelineItem: (id: string, updates: Partial<TimelineItem>) => void
  deleteTimelineItem: (id: string) => void
  setSelectedItem: (item: TimelineItem | null) => void

  // 习惯打卡
  toggleHabitCheck: (habitId: string) => void
  isHabitChecked: (habitId: string) => boolean

  // 编辑状态管理
  startEdit: (itemId: string) => void
  startAdd: () => void
  cancelEdit: () => void
  setEditingInPanel: (editing: boolean) => void
  setAddingInPanel: (adding: boolean) => void

  // 表单数据管理
  setFormData: (data: Partial<ProjectFormData>) => void
  resetFormData: () => void

  // 获取当前时间对应的项目
  getCurrentTimelineItem: () => TimelineItem | null

  // 获取项目进度
  getItemProgress: (item: TimelineItem) => number

  // 获取今日项目统计
  getTodayStats: () => {
    totalProjects: number
    completedProjects: number
    habitProjects: number
    completedHabits: number
    taskProjects: number
    completedTasks: number
    completionRate: number
  }
}

// 初始时间线数据
const initialTimelineData: TimelineItem[] = [
  {
    id: '1',
    time: '06:00',
    title: '起床',
    icon: '☀️',
    iconColor: 'bg-yellow-500',
    completed: true,
    category: 'habit',
  },
  {
    id: '2',
    time: '06:30',
    title: '晨练',
    duration: '30分钟',
    details: ['俯卧撑 x20', '仰卧起坐 x30', '拉伸运动'],
    icon: '💪',
    iconColor: 'bg-green-500',
    completed: true,
    category: 'exercise',
  },
  {
    id: '3',
    time: '07:30',
    title: '早餐',
    duration: '20分钟',
    icon: '🍳',
    iconColor: 'bg-amber-500',
    completed: true,
    category: 'habit',
  },
  {
    id: '4',
    time: '08:00',
    title: '深度专注',
    duration: '2小时',
    details: ['番茄钟工作法', '完成核心任务', '无干扰环境'],
    icon: '🎯',
    iconColor: 'bg-blue-500',
    completed: false,
    category: 'focus',
  },
  {
    id: '5',
    time: '10:30',
    title: '短暂休息',
    duration: '15分钟',
    icon: '☕',
    iconColor: 'bg-amber-600',
    completed: false,
    category: 'habit',
  },
  {
    id: '6',
    time: '12:00',
    title: '午餐时间',
    duration: '45分钟',
    icon: '🥗',
    iconColor: 'bg-emerald-500',
    completed: false,
    category: 'habit',
  },
  {
    id: '7',
    time: '14:00',
    title: '会议时间',
    duration: '1小时',
    details: ['团队会议', '项目进度讨论', '下午计划'],
    icon: '👥',
    iconColor: 'bg-purple-500',
    completed: false,
    category: 'task',
  },
  {
    id: '8',
    time: '18:00',
    title: '运动时间',
    duration: '1小时',
    details: ['跑步 5公里', '力量训练', '拉伸放松'],
    icon: '🏃',
    iconColor: 'bg-red-500',
    completed: false,
    category: 'exercise',
  },
]

// 默认表单数据
const defaultFormData: ProjectFormData = {
  time: '',
  title: '',
  duration: '',
  icon: '💡',
  details: '',
  category: 'task',
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // 初始状态
      timelineItems: initialTimelineData,
      selectedItem: null,
      checkedHabits: new Set<string>(),
      editingItemId: null,
      isEditingInPanel: false,
      isAddingInPanel: false,
      formData: { ...defaultFormData },

      // 时间线项目管理
      setTimelineItems: (items) => set({ timelineItems: items }),

      addTimelineItem: (itemData) => {
        const newItem: TimelineItem = {
          ...itemData,
          id: Date.now().toString(),
          iconColor: categoryConfig[itemData.category].color,
          completed: false,
        }

        set((state) => ({
          timelineItems: [...state.timelineItems, newItem].sort((a, b) =>
            a.time.localeCompare(b.time)
          ),
        }))
      },

      updateTimelineItem: (id, updates) => {
        set((state) => ({
          timelineItems: state.timelineItems.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },

      deleteTimelineItem: (id) => {
        set((state) => ({
          timelineItems: state.timelineItems.filter((item) => item.id !== id),
          selectedItem:
            state.selectedItem?.id === id ? null : state.selectedItem,
        }))
      },

      setSelectedItem: (item) => set({ selectedItem: item }),

      // 习惯打卡管理
      toggleHabitCheck: (habitId) => {
        set((state) => {
          const newCheckedHabits = new Set(state.checkedHabits)
          if (newCheckedHabits.has(habitId)) {
            newCheckedHabits.delete(habitId)
          } else {
            newCheckedHabits.add(habitId)
          }
          return { checkedHabits: newCheckedHabits }
        })
      },

      isHabitChecked: (habitId) => {
        return get().checkedHabits.has(habitId)
      },

      // 编辑状态管理
      startEdit: (itemId) => {
        const item = get().timelineItems.find((i) => i.id === itemId)
        if (item) {
          set({
            editingItemId: itemId,
            isEditingInPanel: true,
            formData: {
              time: item.time,
              title: item.title,
              duration: item.duration || '',
              icon: item.icon,
              details: (item.details || []).join('\n'),
              category: item.category,
            },
          })
        }
      },

      startAdd: () => {
        set({
          editingItemId: null,
          isAddingInPanel: true,
          formData: { ...defaultFormData },
        })
      },

      cancelEdit: () => {
        set({
          editingItemId: null,
          isEditingInPanel: false,
          isAddingInPanel: false,
          formData: { ...defaultFormData },
        })
      },

      setEditingInPanel: (editing) => set({ isEditingInPanel: editing }),
      setAddingInPanel: (adding) => set({ isAddingInPanel: adding }),

      // 表单数据管理
      setFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }))
      },

      resetFormData: () => set({ formData: { ...defaultFormData } }),

      // 获取当前时间对应的项目
      getCurrentTimelineItem: () => {
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`

        const { timelineItems } = get()
        let currentItem = null

        for (let i = 0; i < timelineItems.length; i++) {
          const item = timelineItems[i]
          if (item.time <= currentTime) {
            currentItem = item
          } else {
            break
          }
        }

        return currentItem
      },

      // 获取项目进度
      getItemProgress: (item) => {
        const now = new Date()
        const currentTime = now.getHours() * 60 + now.getMinutes()

        // 解析项目时间
        const [hours, minutes] = item.time.split(':').map(Number)
        const itemStartTime = hours * 60 + minutes

        // 解析项目时长，默认60分钟
        let durationMinutes = 60
        if (item.duration) {
          const hourMatch = item.duration.match(/(\d+)小时/)
          const minuteMatch = item.duration.match(/(\d+)分钟/)
          durationMinutes = 0
          if (hourMatch) durationMinutes += parseInt(hourMatch[1]) * 60
          if (minuteMatch) durationMinutes += parseInt(minuteMatch[1])
          if (durationMinutes === 0) durationMinutes = 60
        }

        const itemEndTime = itemStartTime + durationMinutes

        // 对于习惯项目，根据打卡状态显示进度
        if (item.category === 'habit') {
          return get().isHabitChecked(item.id) ? 100 : 0
        }

        // 对于其他项目，根据时间状态显示进度
        if (currentTime < itemStartTime) {
          return 0
        } else if (currentTime >= itemEndTime) {
          return item.completed ? 100 : 80
        } else {
          const elapsed = currentTime - itemStartTime
          return Math.min((elapsed / durationMinutes) * 100, 95)
        }
      },

      // 获取今日项目统计
      getTodayStats: () => {
        const { timelineItems, isHabitChecked, getItemProgress } = get()

        const totalProjects = timelineItems.length
        const completedProjects = timelineItems.filter((item) => {
          if (item.category === 'habit') {
            return isHabitChecked(item.id)
          } else {
            const progress = getItemProgress(item)
            return progress >= 80
          }
        }).length

        const habitProjects = timelineItems.filter(
          (item) => item.category === 'habit'
        )
        const completedHabits = habitProjects.filter((item) =>
          isHabitChecked(item.id)
        ).length

        const taskProjects = timelineItems.filter(
          (item) => item.category !== 'habit'
        )
        const completedTasks = taskProjects.filter(
          (item) => getItemProgress(item) >= 80
        ).length

        return {
          totalProjects,
          completedProjects,
          habitProjects: habitProjects.length,
          completedHabits,
          taskProjects: taskProjects.length,
          completedTasks,
          completionRate:
            totalProjects > 0
              ? Math.round((completedProjects / totalProjects) * 100)
              : 0,
        }
      },
    }),
    {
      name: 'project-store',
      partialize: (state) => ({
        timelineItems: state.timelineItems,
        checkedHabits: Array.from(state.checkedHabits), // Set需要转换为数组存储
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.checkedHabits)) {
          // 恢复时将数组转换回Set
          state.checkedHabits = new Set(state.checkedHabits)
        }
      },
    }
  )
)
