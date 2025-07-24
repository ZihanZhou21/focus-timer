// 周度任务执行时间统计API服务

interface DayStats {
  date: string
  dayLabel: string // MM/DD格式显示
  totalDuration: number // 总执行时间（分钟）
  todoTime: number // TODO任务时间（分钟）
  checkInTime: number // 打卡任务时间（分钟）
  taskCount: number // 任务总数
  completedCount: number // 完成任务数
  isToday: boolean // 是否今天
}

interface WeeklyStatsResponse {
  startDate: string
  endDate: string
  dailyStats: DayStats[]
  summary: {
    totalDuration: number
    totalCompleted: number
    averageDailyTime: number
    mostProductiveDay: string | null
  }
}

// 兼容WeekChart组件的数据格式
interface WeekChartData {
  day: string
  focus: number
  cycles: number
}

interface CacheEntry {
  data: WeeklyStatsResponse
  timestamp: number
  expiry: number
}

class WeeklyStatsAPIService {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取周度统计数据
   */
  async getWeeklyStats(
    days: number = 7,
    endDate?: string,
    userId = 'user_001'
  ): Promise<WeeklyStatsResponse> {
    const cacheKey = `${userId}_${days}_${endDate || 'current'}`

    // 检查缓存
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      console.log(`使用缓存的周度统计：过去${days}天`)
      return cached.data
    }

    try {
      console.log(`获取周度统计：过去${days}天，用户：${userId}`)

      const params = new URLSearchParams({
        userId,
        days: days.toString(),
      })

      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await fetch(`/api/tasks/weekly-stats?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: WeeklyStatsResponse = await response.json()

      // 缓存数据
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + this.CACHE_DURATION,
      })

      console.log(`获取成功：${data.dailyStats.length} 天的统计数据`)
      return data
    } catch (error) {
      console.error('获取周度统计失败:', error)
      throw error
    }
  }

  /**
   * 获取过去7天的数据（默认）
   */
  async getLast7DaysStats(userId = 'user_001'): Promise<WeeklyStatsResponse> {
    return this.getWeeklyStats(7, undefined, userId)
  }

  /**
   * 获取过去N天的数据
   */
  async getLastNDaysStats(
    days: number,
    userId = 'user_001'
  ): Promise<WeeklyStatsResponse> {
    return this.getWeeklyStats(days, undefined, userId)
  }

  /**
   * 获取指定周的数据（从周一开始）
   */
  async getWeekStats(
    weekStartDate: string, // YYYY-MM-DD 格式的周一日期
    userId = 'user_001'
  ): Promise<WeeklyStatsResponse> {
    const startDate = new Date(weekStartDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6) // 加6天得到周日

    return this.getWeeklyStats(7, endDate.toISOString().split('T')[0], userId)
  }

  /**
   * 转换为WeekChart组件兼容的数据格式
   */
  async getWeekChartData(userId = 'user_001'): Promise<WeekChartData[]> {
    const weeklyStats = await this.getLast7DaysStats(userId)

    return weeklyStats.dailyStats.map((day) => ({
      day: day.dayLabel,
      focus: day.totalDuration,
      cycles: day.completedCount,
    }))
  }

  /**
   * 获取多周对比数据
   */
  async getMultiWeekComparison(
    weeks: number,
    userId = 'user_001'
  ): Promise<{
    weeklyData: Array<{
      weekLabel: string
      startDate: string
      endDate: string
      stats: WeeklyStatsResponse['summary']
    }>
    totalStats: {
      totalDuration: number
      totalCompleted: number
      averageWeeklyTime: number
    }
  }> {
    const weeklyData = []
    let totalDuration = 0
    let totalCompleted = 0

    for (let i = 0; i < weeks; i++) {
      try {
        // 计算每周的结束日期（从今天往前推）
        const endDate = new Date()
        endDate.setDate(endDate.getDate() - i * 7)

        const stats = await this.getWeeklyStats(
          7,
          endDate.toISOString().split('T')[0],
          userId
        )

        const weekLabel = i === 0 ? '本周' : `${i}周前`

        weeklyData.push({
          weekLabel,
          startDate: stats.startDate,
          endDate: stats.endDate,
          stats: stats.summary,
        })

        totalDuration += stats.summary.totalDuration
        totalCompleted += stats.summary.totalCompleted
      } catch (error) {
        console.warn(`获取第 ${i} 周统计失败:`, error)
      }
    }

    return {
      weeklyData: weeklyData.reverse(), // 按时间正序排列
      totalStats: {
        totalDuration,
        totalCompleted,
        averageWeeklyTime: Math.round(totalDuration / weeks),
      },
    }
  }

  /**
   * 获取当前周统计（周一到今天）
   */
  async getCurrentWeekStats(userId = 'user_001'): Promise<WeeklyStatsResponse> {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周日是0，需要特殊处理

    // 计算本周已经过去的天数（从周一开始）
    const daysFromMonday = mondayOffset + 1

    return this.getWeeklyStats(daysFromMonday, undefined, userId)
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * 手动刷新缓存
   */
  async refreshStats(
    days: number = 7,
    endDate?: string,
    userId = 'user_001'
  ): Promise<WeeklyStatsResponse> {
    const cacheKey = `${userId}_${days}_${endDate || 'current'}`
    this.cache.delete(cacheKey)
    return this.getWeeklyStats(days, endDate, userId)
  }
}

// 导出单例实例
export const weeklyStatsAPI = new WeeklyStatsAPIService()

// 导出类型供其他文件使用
export type { DayStats, WeeklyStatsResponse, WeekChartData }

// 定期清理过期缓存
let weeklyStatsCleanupInterval: NodeJS.Timeout | null = null

// 启动清理服务
function startWeeklyStatsCleanup() {
  if (weeklyStatsCleanupInterval) return // 避免重复启动

  weeklyStatsCleanupInterval = setInterval(() => {
    weeklyStatsAPI.clearExpiredCache()
  }, 60 * 1000) // 每分钟检查一次
}

// 停止清理服务
function stopWeeklyStatsCleanup() {
  if (weeklyStatsCleanupInterval) {
    clearInterval(weeklyStatsCleanupInterval)
    weeklyStatsCleanupInterval = null
  }
}

import { cleanupManager } from './cleanup-manager'

// 在浏览器环境中自动启动
if (typeof window !== 'undefined') {
  startWeeklyStatsCleanup()

  // 注册到全局清理管理器
  cleanupManager.register(stopWeeklyStatsCleanup)
}

// 导出清理控制函数
export { startWeeklyStatsCleanup, stopWeeklyStatsCleanup }
