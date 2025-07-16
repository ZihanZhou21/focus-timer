// 客户端API服务层
import { Task, TodoTask, CheckInTask, CheckInEntry } from '@/lib/types'
import { TaskType } from '@/lib/constants'

// 兼容旧系统的ProjectItem类型
export interface ProjectItem {
  id: string
  userId: string
  date: string
  time: string
  title: string
  durationMinutes: number
  icon: string
  iconColor: string
  completed: boolean
  details?: string[]
  tags?: string[]
  priority?: string
  status?: string
  type: TaskType
  // 重复任务相关字段
  isRecurring?: boolean
  recurringDays?: number[]
  recurringWeeks?: number
  recurringParentId?: string
  recurringEndDate?: string
  isTemplate?: boolean
  recurringTemplateId?: string
}

// 客户端API服务 - 任务相关
export class TaskService {
  private baseUrl = '/api/tasks'

  // 获取任务列表
  async getTasks(
    userId = 'user_001',
    type?: 'todo' | 'check-in',
    status?: string
  ): Promise<Task[]> {
    const params = new URLSearchParams()
    params.append('userId', userId)
    if (type) params.append('type', type)
    if (status) params.append('status', status)

    const response = await fetch(`${this.baseUrl}?${params}`)
    if (!response.ok) throw new Error(`获取任务失败: ${response.statusText}`)
    return response.json()
  }

  // 获取单个任务
  async getTask(id: string): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    if (!response.ok) throw new Error(`获取任务失败: ${response.statusText}`)
    return response.json()
  }

  // 创建TODO任务
  async createTodoTask(
    taskData: Omit<TodoTask, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<TodoTask> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...taskData,
        type: 'todo',
      }),
    })

    if (!response.ok)
      throw new Error(`创建TODO任务失败: ${response.statusText}`)
    return response.json()
  }

  // 创建打卡任务
  async createCheckInTask(
    taskData: Omit<CheckInTask, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<CheckInTask> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...taskData,
        type: 'check-in',
      }),
    })

    if (!response.ok)
      throw new Error(`创建打卡任务失败: ${response.statusText}`)
    return response.json()
  }

  // 更新任务
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) throw new Error(`更新任务失败: ${response.statusText}`)
    return response.json()
  }

  // 删除任务
  async deleteTask(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })

    return response.ok
  }

  // 完成TODO任务
  async completeTodoTask(id: string): Promise<TodoTask> {
    const today = new Date().toISOString().split('T')[0]

    // 发送字符串日期，PUT API会自动将其添加到completedAt数组中
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        completedAt: today, // 字符串会被PUT API处理为添加到数组
      }),
    })

    if (!response.ok) throw new Error(`完成任务失败: ${response.statusText}`)
    return response.json()
  }

  // addTimeLog已弃用 - 改用session API直接更新dailyTimeStats
  // async addTimeLog() - 请使用 /api/tasks/[id]/session 端点

  // 添加打卡记录
  async addCheckIn(id: string, checkIn: CheckInEntry): Promise<CheckInTask> {
    const task = (await this.getTask(id)) as CheckInTask
    return this.updateTask(id, {
      checkInHistory: [...task.checkInHistory, checkIn],
    }) as Promise<CheckInTask>
  }

  // 获取今日打卡任务
  async getTodayCheckIns(userId = 'user_001'): Promise<CheckInTask[]> {
    const tasks = await this.getTasks(userId, 'check-in', 'in_progress')
    const today = new Date().getDay()

    return tasks.filter((task) => {
      const checkInTask = task as CheckInTask
      return checkInTask.recurrence.daysOfWeek.includes(today)
    }) as CheckInTask[]
  }

  // 获取统计数据
  async getStats(userId = 'user_001') {
    const tasks = await this.getTasks(userId)

    const todoTasks = tasks.filter((t) => t.type === 'todo') as TodoTask[]
    const checkInTasks = tasks.filter(
      (t) => t.type === 'check-in'
    ) as CheckInTask[]

    return {
      totalTodos: todoTasks.length,
      completedTodos: todoTasks.filter((t) => t.status === 'completed').length,
      totalCheckIns: checkInTasks.length,
      activeCheckIns: checkInTasks.filter((t) => t.status === 'in_progress')
        .length,
      totalFocusTime: this.calculateTotalFocusTime(todoTasks),
      totalCheckInTime: this.calculateTotalCheckInTime(),
    }
  }

  private calculateTotalFocusTime(todoTasks: TodoTask[]): number {
    return todoTasks.reduce((total, task) => {
      const taskTotal = task.dailyTimeStats
        ? Object.values(task.dailyTimeStats).reduce(
            (sum, time) => sum + time,
            0
          )
        : 0
      return total + taskTotal
    }, 0)
  }

  private calculateTotalCheckInTime(): number {
    // check-in任务不再有duration概念，返回0
    return 0
  }
}

// 单例服务实例
export const taskService = new TaskService()

// 保留必要的工具函数
export const dataUtils = {
  generateProjectId: (projects: ProjectItem[]): string => {
    const existingIds = projects.map((p) => p.id)
    let maxId = 0

    existingIds.forEach((id) => {
      const match = id.match(/^project_(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxId) maxId = num
      }
    })

    return `project_${maxId + 1}`
  },

  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0]
  },

  formatTime: (date: Date): string => {
    return date.toTimeString().substring(0, 5)
  },
}
