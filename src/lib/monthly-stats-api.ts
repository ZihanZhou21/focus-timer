// 月度任务执行时间统计API服务

interface DailyStats {
  date: string
  totalDuration: number // 总执行时间（分钟）
  todoTime: number // TODO任务时间（分钟）
  checkInTime: number // 打卡任务时间（分钟）
  taskCount: number // 任务总数
  completedCount: number // 完成任务数
}

interface MonthlyStatsResponse {
  year: number
  month: number
  dailyStats: DailyStats[]
  summary: {
    totalDuration: number
    totalTasks: number
    totalCompleted: number
    averageDailyTime: number
  }
}

interface CacheEntry {
  data: MonthlyStatsResponse
  timestamp: number
  expiry: number
}

class MonthlyStatsAPIService {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 10 * 60 * 1000 // 10分钟缓存

  /**
   * 获取指定月份的每日任务执行时间统计
   */
  async getMonthlyStats(
    year: number,
    month: number,
    userId = 'user_001'
  ): Promise<MonthlyStatsResponse> {
    const cacheKey = `${userId}_${year}_${month}`

    // 检查缓存
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      console.log(`使用缓存的月度统计：${year}年${month}月`)
      return cached.data
    }

    try {
      console.log(`获取月度统计：${year}年${month}月，用户：${userId}`)

      const response = await fetch(
        `/api/tasks/monthly-stats?userId=${userId}&year=${year}&month=${month}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: MonthlyStatsResponse = await response.json()

      // 缓存数据
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + this.CACHE_DURATION,
      })

      console.log(`获取成功：${data.dailyStats.length} 天的统计数据`)
      return data
    } catch (error) {
      console.error('获取月度统计失败:', error)
      throw error
    }
  }

  /**
   * 获取当前月份的统计
   */
  async getCurrentMonthStats(
    userId = 'user_001'
  ): Promise<MonthlyStatsResponse> {
    const now = new Date()
    return this.getMonthlyStats(now.getFullYear(), now.getMonth() + 1, userId)
  }

  /**
   * 获取上个月的统计
   */
  async getLastMonthStats(userId = 'user_001'): Promise<MonthlyStatsResponse> {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    return this.getMonthlyStats(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      userId
    )
  }

  /**
   * 获取指定日期的统计（从月度数据中提取）
   */
  async getDayStats(
    date: string, // YYYY-MM-DD
    userId = 'user_001'
  ): Promise<DailyStats | null> {
    const [year, month] = date.split('-').map(Number)
    const monthlyStats = await this.getMonthlyStats(year, month, userId)

    return monthlyStats.dailyStats.find((day) => day.date === date) || null
  }

  /**
   * 获取最近N个月的对比数据
   */
  async getRecentMonthsComparison(
    months: number,
    userId = 'user_001'
  ): Promise<{
    monthlyData: Array<{
      yearMonth: string
      stats: MonthlyStatsResponse['summary']
    }>
    totalStats: {
      totalDuration: number
      totalTasks: number
      totalCompleted: number
      averageMonthlyTime: number
    }
  }> {
    const now = new Date()
    const monthlyData = []
    let totalDuration = 0
    let totalTasks = 0
    let totalCompleted = 0

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i)
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth() + 1

      try {
        const stats = await this.getMonthlyStats(year, month, userId)
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`

        monthlyData.push({
          yearMonth,
          stats: stats.summary,
        })

        totalDuration += stats.summary.totalDuration
        totalTasks += stats.summary.totalTasks
        totalCompleted += stats.summary.totalCompleted
      } catch (error) {
        console.warn(`获取 ${year}年${month}月 统计失败:`, error)
      }
    }

    return {
      monthlyData: monthlyData.reverse(), // 按时间正序排列
      totalStats: {
        totalDuration,
        totalTasks,
        totalCompleted,
        averageMonthlyTime: Math.round(totalDuration / months),
      },
    }
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
   * 手动刷新指定月份的缓存
   */
  async refreshMonthCache(
    year: number,
    month: number,
    userId = 'user_001'
  ): Promise<MonthlyStatsResponse> {
    const cacheKey = `${userId}_${year}_${month}`
    this.cache.delete(cacheKey)
    return this.getMonthlyStats(year, month, userId)
  }
}

// 导出单例实例
export const monthlyStatsAPI = new MonthlyStatsAPIService()

// 导出类型供其他文件使用
export type { DailyStats, MonthlyStatsResponse }

// 定期清理过期缓存
setInterval(() => {
  monthlyStatsAPI.clearExpiredCache()
}, 60 * 1000) // 每分钟检查一次
