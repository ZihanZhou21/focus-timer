// 任务进度API服务
interface TaskProgressData {
  taskId: string
  totalExecutedTime: number // 总执行时间（秒）
  estimatedDuration: number // 预估时间（秒）
  progressPercentage: number // 进度百分比
  isCompleted: boolean
  executionSessions: {
    date: string
    duration: number
    startTime: string
    endTime: string
  }[]
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
    // 检查缓存
    const cached = this.cache.get(taskId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`使用缓存的任务进度数据: ${taskId}`)
      return cached.data
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
        sessions: data.executionSessions.length,
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
        executionSessions: [],
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
  async getTaskExecutionSessions(
    taskId: string
  ): Promise<TaskProgressData['executionSessions']> {
    try {
      const data = await this.getTaskProgress(taskId)
      return data.executionSessions
    } catch (error) {
      console.error(`获取任务执行会话失败 (${taskId}):`, error)
      return []
    }
  }
}

// 导出单例实例
export const taskProgressAPI = new TaskProgressAPI()

// 导出类型
export type { TaskProgressData }
