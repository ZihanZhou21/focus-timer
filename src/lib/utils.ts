// 时间格式化工具函数

/**
 * 格式化分钟数为小时显示格式
 * @param minutes 分钟数
 * @returns 格式化后的时间字符串，如 "2.5h"
 */
export function formatTimeInHours(minutes: number): string {
  if (minutes === 0) return '0h'
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

/**
 * 格式化秒数为 MM:SS 格式
 * @param seconds 秒数
 * @returns 格式化后的时间字符串，如 "25:30"
 */
export function formatTimeInMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

/**
 * 格式化时长为易读格式
 * @param minutes 分钟数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0h'
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

/**
 * 生成日期标签
 * @param start 开始日期
 * @param end 结束日期
 * @param period 时间段类型
 * @returns 日期标签数组
 */
export function generateDateLabels(
  start: Date,
  end: Date,
  period: 'week' | 'month' | 'year'
): string[] {
  const labels = []
  const current = new Date(start)

  while (current <= end) {
    switch (period) {
      case 'week':
        labels.push(`${current.getMonth() + 1}/${current.getDate()}`)
        current.setDate(current.getDate() + 1)
        break
      case 'month':
        labels.push(`${current.getDate()}`)
        current.setDate(current.getDate() + 1)
        break
      case 'year':
        labels.push(`${current.getMonth() + 1}月`)
        current.setMonth(current.getMonth() + 1)
        break
    }
  }

  return labels
}

/**
 * 获取日期范围
 * @param date 基准日期
 * @param period 时间段类型
 * @returns 开始和结束日期
 */
export function getDateRange(
  date: Date,
  period: 'week' | 'month' | 'year'
): { start: Date; end: Date } {
  const start = new Date(date)
  const end = new Date(date)

  switch (period) {
    case 'week':
      const dayOfWeek = start.getDay()
      start.setDate(start.getDate() - dayOfWeek)
      end.setDate(start.getDate() + 6)
      break
    case 'month':
      start.setDate(1)
      end.setMonth(end.getMonth() + 1, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      end.setMonth(11, 31)
      break
  }

  return { start, end }
}

/**
 * 获取专注时间强度颜色
 * @param focusTime 专注时间（分钟）
 * @returns CSS类名
 */
export function getIntensityColor(focusTime: number): string {
  if (focusTime === 0) return 'bg-slate-700'
  if (focusTime < 90) return 'bg-amber-900/30'
  if (focusTime < 180) return 'bg-amber-800/50'
  if (focusTime < 270) return 'bg-amber-700/70'
  return 'bg-amber-600'
}

/**
 * 按日期分组项目数据
 * @param projects 项目数组
 * @returns 按日期分组的Map
 */
export function groupProjectsByDate<T extends { date: string }>(
  projects: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  projects.forEach((project) => {
    if (!grouped.has(project.date)) {
      grouped.set(project.date, [])
    }
    grouped.get(project.date)!.push(project)
  })

  return grouped
}
