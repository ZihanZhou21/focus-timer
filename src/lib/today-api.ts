// 今日任务客户端API服务
import { Task } from '@/lib/types'
import { ProjectItem } from '@/lib/api'

// API响应类型
export interface TodayTasksResponse {
  date: string
  dayOfWeek: number
  tasks: Task[]
  stats: {
    total: number
    todoTasks: number
    checkInTasks: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
  }
}

// 今日任务客户端服务
export class TodayTasksService {
  private baseUrl = '/api/tasks'

  /**
   * 获取今天的所有任务
   * 前端只需要调用这一个方法，所有复杂的筛选逻辑都由后端处理
   */
  async getTodaysTasks(userId = 'user_001'): Promise<TodayTasksResponse> {
    try {
      console.log('正在获取今天的任务...')

      const response = await fetch(`${this.baseUrl}/today?userId=${userId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`获取成功：共 ${data.stats.total} 个任务`)

      return data
    } catch (error) {
      console.error('获取今天任务失败:', error)
      throw new Error(
        error instanceof Error ? error.message : '获取今天任务失败'
      )
    }
  }

  /**
   * 获取今天的任务并转换为ProjectItem格式（用于兼容现有UI）
   */
  async getTodaysTasksAsProjectItems(
    userId = 'user_001'
  ): Promise<ProjectItem[]> {
    try {
      console.log('正在获取今天的任务(ProjectItem格式)...')

      const response = await fetch(
        `${this.baseUrl}/today?userId=${userId}&format=project-items`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`获取成功：共 ${data.length} 个任务`)

      return data
    } catch (error) {
      console.error('获取今天任务失败:', error)
      throw new Error(
        error instanceof Error ? error.message : '获取今天任务失败'
      )
    }
  }

  /**
   * 获取任务状态的中文描述
   */
  getTaskStatusText(status: string): string {
    const statusMap = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      archived: '已归档',
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  /**
   * 获取优先级的中文描述
   */
  getPriorityText(priority: string): string {
    const priorityMap = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    }
    return priorityMap[priority as keyof typeof priorityMap] || priority
  }

  /**
   * 格式化任务显示时间
   */
  formatTaskTime(task: Task): string {
    if (task.type === 'todo') {
      const todoTask = task as { dueDate?: string }
      if (todoTask.dueDate) {
        const dueDate = new Date(todoTask.dueDate)
        return dueDate.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      }
    }
    return ''
  }
}

// 单例导出
export const todayTasksService = new TodayTasksService()
