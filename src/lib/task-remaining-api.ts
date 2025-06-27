// 任务剩余时间API服务
interface TaskRemainingData {
  taskId: string
  estimatedMinutes: number // 预估时间（分钟）
  executedMinutes: number // 已执行时间（分钟）
  remainingMinutes: number // 剩余时间（分钟）
  isCompleted: boolean
}

class TaskRemainingAPI {
  private cache = new Map<
    string,
    { data: TaskRemainingData; timestamp: number }
  >()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存

  /**
   * 获取任务剩余时间数据
   * @param taskId 任务ID
   * @returns 剩余时间数据
   */
  async getTaskRemaining(taskId: string): Promise<TaskRemainingData> {
    // 检查缓存
    const cached = this.cache.get(taskId)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/remaining`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: TaskRemainingData = await response.json()

      // 更新缓存
      this.cache.set(taskId, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      console.error(`获取任务剩余时间失败 (${taskId}):`, error)
      throw error
    }
  }

  /**
   * 批量获取多个任务的剩余时间
   * @param taskIds 任务ID数组
   * @returns 剩余时间数据映射
   */
  async getBatchTaskRemaining(
    taskIds: string[]
  ): Promise<Map<string, TaskRemainingData>> {
    const results = new Map<string, TaskRemainingData>()

    // 并行请求所有任务的剩余时间
    const promises = taskIds.map(async (taskId) => {
      try {
        const data = await this.getTaskRemaining(taskId)
        results.set(taskId, data)
      } catch (error) {
        console.error(`获取任务剩余时间失败 (${taskId}):`, error)
        // 失败时不添加到结果中，但不影响其他任务
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 获取任务剩余时间（分钟）
   * @param taskId 任务ID
   * @returns 剩余时间（分钟）
   */
  async getTaskRemainingMinutes(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskRemaining(taskId)
      return data.remainingMinutes
    } catch (error) {
      console.error(`获取任务剩余时间失败 (${taskId}):`, error)
      return 25 // 默认25分钟
    }
  }

  /**
   * 获取任务执行时间（分钟）
   * @param taskId 任务ID
   * @returns 执行时间（分钟）
   */
  async getTaskExecutedMinutes(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskRemaining(taskId)
      return data.executedMinutes
    } catch (error) {
      console.error(`获取任务执行时间失败 (${taskId}):`, error)
      return 0
    }
  }

  /**
   * 清除指定任务的缓存
   * @param taskId 任务ID
   */
  clearCache(taskId?: string) {
    if (taskId) {
      this.cache.delete(taskId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache() {
    const now = Date.now()
    for (const [taskId, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(taskId)
      }
    }
  }
}

// 导出单例实例
export const taskRemainingAPI = new TaskRemainingAPI()
export type { TaskRemainingData }
