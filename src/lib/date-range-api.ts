// 日期范围数据API服务 - 用于优化Week和Activity组件的性能
import { ProjectItem } from '@/lib/api'

interface DateRangeData {
  [date: string]: ProjectItem[]
}

interface CacheEntry {
  data: DateRangeData
  timestamp: number
  expiry: number
}

class DateRangeAPIService {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取日期范围内的所有任务数据（批量获取）
   */
  async getDateRangeData(
    startDate: string,
    endDate: string,
    userId = 'user_001'
  ): Promise<DateRangeData> {
    const cacheKey = `${userId}_${startDate}_${endDate}`

    // 检查缓存
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      console.log(`使用缓存数据：${startDate} - ${endDate}`)
      return cached.data
    }

    try {
      console.log(`获取日期范围数据：${startDate} - ${endDate}`)

      // 单次API调用获取整个日期范围的数据
      const response = await fetch(
        `/api/tasks/date-range?userId=${userId}&startDate=${startDate}&endDate=${endDate}&format=project-items`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: DateRangeData = await response.json()

      // 缓存数据
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + this.CACHE_DURATION,
      })

      console.log(`获取成功：${Object.keys(data).length} 天的数据`)
      return data
    } catch (error) {
      console.error('获取日期范围数据失败:', error)
      return {}
    }
  }

  /**
   * 获取过去N天的数据
   */
  async getLastNDaysData(
    days: number,
    userId = 'user_001'
  ): Promise<DateRangeData> {
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - (days - 1))

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    return this.getDateRangeData(startDateStr, endDateStr, userId)
  }

  /**
   * 获取指定月份的数据
   */
  async getMonthData(
    year: number,
    month: number,
    userId = 'user_001'
  ): Promise<DateRangeData> {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // 扩展到包含完整的日历网格（前后月份的日期）
    const firstDayOfWeek = firstDay.getDay()
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDayOfWeek)

    const endDate = new Date(lastDay)
    const remainingDays = 6 - endDate.getDay()
    endDate.setDate(endDate.getDate() + remainingDays)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    return this.getDateRangeData(startDateStr, endDateStr, userId)
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
}

export const dateRangeAPI = new DateRangeAPIService()

// 定期清理过期缓存
setInterval(() => {
  dateRangeAPI.clearExpiredCache()
}, 60 * 1000) // 每分钟检查一次
