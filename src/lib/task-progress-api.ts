// 任务进度API服务
import { isNewDay } from '@/lib/timestamp-reset'

interface TaskProgressData {
  taskId: string
  totalExecutedTime: number // 今日执行时间（秒）
  estimatedDuration: number // 预估时间（秒）
  progressPercentage: number // 今日进度百分比
  isCompleted: boolean
  dailyProgress: {
    date: string
    duration: number
    minutes: number
  }[]
  todayProgress?: {
    date: string
    duration: number
    minutes: number
  }
  todayOnly?: boolean // 标记：返回的是今日进度
}

interface TaskProgressError {
  error: string
  details?: string
}

class TaskProgressAPI {
  private cache = new Map<
    string,
    { data: TaskProgressData; timestamp: number }
  >()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存

  /**
   * 获取任务执行进度
   * @param taskId 任务ID
   * @returns 任务进度数据
   */
  async getTaskProgress(taskId: string): Promise<TaskProgressData> {
    // 检查缓存 - 如果是新的一天，缓存自动失效
    const cached = this.cache.get(taskId)
    const cacheValid =
      cached &&
      Date.now() - cached.timestamp < this.CACHE_DURATION &&
      !isNewDay(new Date(cached.timestamp).toISOString())

    if (cacheValid) {
      console.log(`使用缓存的任务进度数据: ${taskId}`)
      return cached.data
    }

    // 如果是新的一天，清除该任务的缓存
    if (cached && isNewDay(new Date(cached.timestamp).toISOString())) {
      this.cache.delete(taskId)
      console.log(`新的一天，清除任务缓存: ${taskId}`)
    }

    try {
      console.log(`获取任务进度: ${taskId}`)
      const response = await fetch(`/api/tasks/${taskId}/progress`)

      if (!response.ok) {
        const errorData: TaskProgressError = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: TaskProgressData = await response.json()

      // 缓存结果
      this.cache.set(taskId, {
        data,
        timestamp: Date.now(),
      })

      console.log(`任务进度获取成功:`, {
        taskId: data.taskId,
        progress: data.progressPercentage,
        executedTime: data.totalExecutedTime,
        sessions: data.dailyProgress?.length || 0,
      })

      return data
    } catch (error) {
      console.error(`获取任务进度失败 (${taskId}):`, error)

      // 如果有缓存数据，即使过期也返回
      if (cached) {
        console.log(`使用过期缓存数据: ${taskId}`)
        return cached.data
      }

      // 返回默认数据
      return {
        taskId,
        totalExecutedTime: 0,
        estimatedDuration: 1500,
        progressPercentage: 0,
        isCompleted: false,
        dailyProgress: [],
      }
    }
  }

  /**
   * 批量获取多个任务的进度
   * @param taskIds 任务ID数组
   * @returns 任务进度数据数组
   */
  async getBatchTaskProgress(taskIds: string[]): Promise<TaskProgressData[]> {
    const promises = taskIds.map((taskId) => this.getTaskProgress(taskId))
    return Promise.all(promises)
  }

  /**
   * 清除指定任务的缓存
   * @param taskId 任务ID
   */
  clearTaskCache(taskId: string): void {
    this.cache.delete(taskId)
    console.log(`清除任务进度缓存: ${taskId}`)
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear()
    console.log('清除所有任务进度缓存')
  }

  /**
   * 清除过期的缓存（包括跨日的缓存）
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []

    for (const [taskId, cached] of this.cache.entries()) {
      const isExpired = now - cached.timestamp >= this.CACHE_DURATION
      const isNewDayCache = isNewDay(new Date(cached.timestamp).toISOString())

      if (isExpired || isNewDayCache) {
        entriesToDelete.push(taskId)
      }
    }

    entriesToDelete.forEach((taskId) => {
      this.cache.delete(taskId)
      console.log(`清除过期缓存: ${taskId}`)
    })

    if (entriesToDelete.length > 0) {
      console.log(`共清除 ${entriesToDelete.length} 个过期缓存`)
    }
  }

  /**
   * 获取任务进度百分比（简化版本）
   * @param taskId 任务ID
   * @returns 进度百分比
   */
  async getTaskProgressPercentage(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskProgress(taskId)
      return data.progressPercentage
    } catch (error) {
      console.error(`获取任务进度百分比失败 (${taskId}):`, error)
      return 0
    }
  }

  /**
   * 获取任务执行时间（分钟）
   * @param taskId 任务ID
   * @returns 执行时间（分钟）
   */
  async getTaskExecutedTime(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskProgress(taskId)
      return Math.round(data.totalExecutedTime / 60) // 转换为分钟
    } catch (error) {
      console.error(`获取任务执行时间失败 (${taskId}):`, error)
      return 0
    }
  }

  /**
   * 获取任务执行会话列表
   * @param taskId 任务ID
   * @returns 执行会话数组
   */
  async getTaskDailyProgress(
    taskId: string
  ): Promise<TaskProgressData['dailyProgress']> {
    try {
      const data = await this.getTaskProgress(taskId)
      return data.dailyProgress
    } catch (error) {
      console.error(`获取任务每日进度失败 (${taskId}):`, error)
      return []
    }
  }
}

// 导出单例实例
export const taskProgressAPI = new TaskProgressAPI()

// 导出类型
export type { TaskProgressData }
