// 批量任务API服务 - 解决重复网络请求问题

interface BatchProgressResponse {
  success: Record<
    string,
    {
      taskId: string
      totalExecutedTime: number
      estimatedDuration: number
      progressPercentage: number
      isCompleted: boolean
      todayProgress: {
        date: string
        duration: number
        minutes: number
      }
      todayOnly: boolean
    }
  >
  errors: Record<string, string>
  count: {
    requested: number
    successful: number
    failed: number
  }
}

interface BatchRemainingResponse {
  success: Record<
    string,
    {
      taskId: string
      executedMinutes: number
      remainingMinutes: number
      estimatedMinutes: number
      executedSeconds: number
      remainingSeconds: number
      estimatedSeconds: number
      progressPercentage: number
      isCompleted: boolean
      todayOnly: boolean
    }
  >
  errors: Record<string, string>
  count: {
    requested: number
    successful: number
    failed: number
  }
}

interface BatchInfoResponse {
  success: Record<
    string,
    {
      _id: string
      title: string
      status: string
      type: string
      priority: string
      tags: string[]
      createdAt: string
      updatedAt: string
      progress?: {
        totalExecutedTime: number
        estimatedDuration: number
        progressPercentage: number
        isCompleted: boolean
        todayProgress: {
          date: string
          duration: number
          minutes: number
        }
      }
      remaining?: {
        executedMinutes: number
        remainingMinutes: number
        estimatedMinutes: number
        executedSeconds: number
        remainingSeconds: number
        estimatedSeconds: number
      }
    }
  >
  errors: Record<string, string>
  count: {
    requested: number
    successful: number
    failed: number
  }
  timestamp: string
}

// 批量任务数据接口
export interface BatchTaskData {
  [taskId: string]: {
    info?: {
      _id: string
      title: string
      status: string
      type: string
      priority: string
      tags: string[]
      createdAt: string
      updatedAt: string
    }
    progress?: {
      totalExecutedTime: number
      estimatedDuration: number
      progressPercentage: number
      isCompleted: boolean
      todayProgress: {
        date: string
        duration: number
        minutes: number
      }
    }
    remaining?: {
      executedMinutes: number
      remainingMinutes: number
      estimatedMinutes: number
      executedSeconds: number
      remainingSeconds: number
      estimatedSeconds: number
    }
    error?: string
  }
}

class BatchTaskAPI {
  private cache = new Map<string, { data: BatchTaskData; timestamp: number }>()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存

  /**
   * 批量获取任务进度数据
   */
  async getBatchProgress(taskIds: string[]): Promise<BatchProgressResponse> {
    if (taskIds.length === 0) {
      return {
        success: {},
        errors: {},
        count: { requested: 0, successful: 0, failed: 0 },
      }
    }

    try {
      const response = await fetch('/api/tasks/batch/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('批量获取任务进度失败:', error)
      throw error
    }
  }

  /**
   * 批量获取任务剩余时间数据
   */
  async getBatchRemaining(taskIds: string[]): Promise<BatchRemainingResponse> {
    if (taskIds.length === 0) {
      return {
        success: {},
        errors: {},
        count: { requested: 0, successful: 0, failed: 0 },
      }
    }

    try {
      const response = await fetch('/api/tasks/batch/remaining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('批量获取任务剩余时间失败:', error)
      throw error
    }
  }

  /**
   * 批量获取完整任务信息（整合info + progress + remaining）
   */
  async getBatchInfo(taskIds: string[]): Promise<BatchInfoResponse> {
    if (taskIds.length === 0) {
      return {
        success: {},
        errors: {},
        count: { requested: 0, successful: 0, failed: 0 },
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const response = await fetch('/api/tasks/batch/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('批量获取任务信息失败:', error)
      throw error
    }
  }

  /**
   * 智能批量获取 - 优先使用缓存，自动处理缺失数据
   */
  async getTaskDataBatch(taskIds: string[]): Promise<BatchTaskData> {
    if (taskIds.length === 0) return {}

    // 构建缓存键
    const cacheKey = taskIds.sort().join(',')
    const cached = this.cache.get(cacheKey)

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`使用缓存的批量任务数据 (${taskIds.length} 个任务)`)
      return cached.data
    }

    try {
      console.log(`批量获取任务数据: ${taskIds.length} 个任务`)

      // 使用最优化的批量接口 - 一次请求获取所有数据
      const response = await this.getBatchInfo(taskIds)

      // 转换为统一格式
      const result: BatchTaskData = {}

      // 处理成功的任务
      Object.entries(response.success).forEach(([taskId, taskData]) => {
        result[taskId] = {
          info: {
            _id: taskData._id,
            title: taskData.title,
            status: taskData.status,
            type: taskData.type,
            priority: taskData.priority,
            tags: taskData.tags,
            createdAt: taskData.createdAt,
            updatedAt: taskData.updatedAt,
          },
          progress: taskData.progress,
          remaining: taskData.remaining,
        }
      })

      // 处理失败的任务
      Object.entries(response.errors).forEach(([taskId, errorMsg]) => {
        result[taskId] = { error: errorMsg }
      })

      // 缓存结果
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      })

      console.log(
        `批量获取成功: ${response.count.successful}/${response.count.requested} 个任务`
      )

      return result
    } catch (error) {
      console.error('批量获取任务数据失败:', error)

      // 返回错误状态
      const result: BatchTaskData = {}
      taskIds.forEach((taskId) => {
        result[taskId] = { error: 'Network error or server unavailable' }
      })

      return result
    }
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`清理了 ${keysToDelete.length} 个过期的批量任务缓存`)
    }
  }

  /**
   * 手动清理所有缓存
   */
  clearAllCache(): void {
    this.cache.clear()
    console.log('已清理所有批量任务缓存')
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// 创建全局实例
export const batchTaskAPI = new BatchTaskAPI()

// 定期清理过期缓存
let batchTaskCleanupInterval: NodeJS.Timeout | null = null

function startBatchTaskCleanup() {
  if (batchTaskCleanupInterval) return

  batchTaskCleanupInterval = setInterval(() => {
    batchTaskAPI.clearExpiredCache()
  }, 60 * 1000) // 每分钟清理一次
}

function stopBatchTaskCleanup() {
  if (batchTaskCleanupInterval) {
    clearInterval(batchTaskCleanupInterval)
    batchTaskCleanupInterval = null
  }
}

// 在浏览器环境中自动启动
if (typeof window !== 'undefined') {
  startBatchTaskCleanup()

  // 注册到全局清理管理器
  import('./cleanup-manager').then(({ cleanupManager }) => {
    cleanupManager.register(stopBatchTaskCleanup)
  })
}

export { startBatchTaskCleanup, stopBatchTaskCleanup }
export default batchTaskAPI
