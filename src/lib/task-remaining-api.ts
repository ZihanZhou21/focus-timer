// Task remaining time API service
interface TaskRemainingData {
  taskId: string
  estimatedMinutes: number
  executedMinutes: number
  remainingMinutes: number
  remainingSeconds?: number
  executedSeconds?: number
  estimatedSeconds?: number
  isCompleted: boolean
  todayOnly?: boolean
  date?: string
}

class TaskRemainingAPI {
  private cache = new Map<
    string,
    { data: TaskRemainingData; timestamp: number }
  >()
  private readonly CACHE_DURATION = 10 * 1000

  async getTaskRemaining(taskId: string): Promise<TaskRemainingData> {
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
      this.cache.set(taskId, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      console.error(`Failed to get task remaining time (${taskId}):`, error)
      throw error
    }
  }

  async getBatchTaskRemaining(
    taskIds: string[]
  ): Promise<Map<string, TaskRemainingData>> {
    const results = new Map<string, TaskRemainingData>()
    const missingTaskIds: string[] = []
    const uniqueTaskIds = Array.from(new Set(taskIds))

    uniqueTaskIds.forEach((taskId) => {
      const cached = this.cache.get(taskId)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        results.set(taskId, cached.data)
      } else {
        missingTaskIds.push(taskId)
      }
    })

    if (missingTaskIds.length === 0) return results

    try {
      const response = await fetch('/api/tasks/batch/remaining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: missingTaskIds }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: { success: Record<string, TaskRemainingData> } =
        await response.json()

      Object.entries(data.success).forEach(([taskId, remainingData]) => {
        this.cache.set(taskId, {
          data: remainingData,
          timestamp: Date.now(),
        })
        results.set(taskId, remainingData)
      })
    } catch (error) {
      console.error('Batch remaining request failed, falling back:', error)
      await Promise.all(
        missingTaskIds.map(async (taskId) => {
          try {
            const data = await this.getTaskRemaining(taskId)
            results.set(taskId, data)
          } catch (fallbackError) {
            console.error(
              `Failed to get fallback remaining time (${taskId}):`,
              fallbackError
            )
          }
        })
      )
    }

    return results
  }

  async getTaskRemainingMinutes(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskRemaining(taskId)
      return data.remainingMinutes
    } catch (error) {
      console.error(`Failed to get task remaining minutes (${taskId}):`, error)
      return 25
    }
  }

  async getTaskExecutedMinutes(taskId: string): Promise<number> {
    try {
      const data = await this.getTaskRemaining(taskId)
      return data.executedMinutes
    } catch (error) {
      console.error(`Failed to get task executed minutes (${taskId}):`, error)
      return 0
    }
  }

  clearCache(taskId?: string) {
    if (taskId) {
      this.cache.delete(taskId)
    } else {
      this.cache.clear()
    }
  }

  clearExpiredCache() {
    const now = Date.now()
    for (const [taskId, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(taskId)
      }
    }
  }
}

export const taskRemainingAPI = new TaskRemainingAPI()
export type { TaskRemainingData }
