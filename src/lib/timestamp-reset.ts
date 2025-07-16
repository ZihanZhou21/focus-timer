// 基于时间戳的逻辑重置工具
import { Task, TodoTask, CheckInTask } from '@/lib/types'

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * 检查日期是否是今天
 * 支持时间戳格式 (YYYY-MM-DDTHH:mm:ss.sssZ) 和日期格式 (YYYY-MM-DD)
 */
export function isToday(dateString: string): boolean {
  // 如果包含 'T'，说明是时间戳格式，需要提取日期部分
  const date = dateString.includes('T') ? dateString.split('T')[0] : dateString
  return date === getTodayDateString()
}

/**
 * 检查任务是否应该被视为今日状态（逻辑重置）
 * 规则：
 * 1. 任务的最后更新时间是今天 -> 保持原状态
 * 2. 任务的最后更新时间不是今天 -> 视为重置状态
 */
export function shouldShowResetState(task: Task): boolean {
  // 检查任务的更新时间
  if (task.updatedAt && isToday(task.updatedAt)) {
    return false // 今天有更新，不需要重置
  }

  // 检查任务的完成时间 - 现在是数组格式
  if (Array.isArray(task.completedAt) && task.completedAt.length > 0) {
    const today = getTodayDateString()
    if (task.completedAt.includes(today)) {
      return false // 今天有完成，不需要重置
    }
  }

  // 对于 TODO 任务，检查每日时间统计
  if (task.type === 'todo') {
    const todoTask = task as TodoTask
    const today = getTodayDateString()
    if (todoTask.dailyTimeStats && todoTask.dailyTimeStats[today] > 0) {
      return false // 今天有时间记录，不需要重置
    }
  }

  // 对于打卡任务，检查打卡历史
  if (task.type === 'check-in') {
    const checkInTask = task as CheckInTask
    if (checkInTask.checkInHistory && checkInTask.checkInHistory.length > 0) {
      // 检查是否有今天的打卡记录
      const hasTodayCheckIn = checkInTask.checkInHistory.some((entry) =>
        isToday(entry.date)
      )
      if (hasTodayCheckIn) {
        return false // 今天有打卡，不需要重置
      }
    }
  }

  return true // 需要显示重置状态
}

/**
 * 应用逻辑重置到任务
 * 返回重置后的任务状态（不修改原任务）
 */
export function applyLogicalReset<T extends Task>(task: T): T {
  if (!shouldShowResetState(task)) {
    return task // 不需要重置，返回原任务
  }

  // 创建重置后的任务副本
  const resetTask = { ...task }

  // 重置基础状态
  if (resetTask.status === 'completed') {
    resetTask.status = 'pending'
  }
  // 从 completedAt 数组中移除今天的日期（逻辑重置）
  const today = getTodayDateString()
  if (Array.isArray(resetTask.completedAt)) {
    resetTask.completedAt = resetTask.completedAt.filter(
      (date) => date !== today
    )
  } else {
    resetTask.completedAt = []
  }

  // 针对不同类型的任务进行特殊处理
  if (task.type === 'todo') {
    const todoTask = resetTask as TodoTask
    // 清空今日时间记录（逻辑上）
    const today = getTodayDateString()
    if (todoTask.dailyTimeStats && todoTask.dailyTimeStats[today]) {
      delete todoTask.dailyTimeStats[today]
    }
  } else if (task.type === 'check-in') {
    const checkInTask = resetTask as CheckInTask
    // 清空打卡历史（逻辑上）
    checkInTask.checkInHistory = []
  }

  return resetTask
}

/**
 * 计算任务今天的执行时间（秒）
 * 简化版本：直接从dailyTimeStats获取
 */
export function getTodayExecutedTime(task: TodoTask): number {
  const today = getTodayDateString()
  return task.dailyTimeStats?.[today] || 0
}

/**
 * 计算任务今天的进度百分比
 */
export function getTodayProgress(task: TodoTask): number {
  const todayExecutedTime = getTodayExecutedTime(task)
  const estimatedDuration = task.estimatedDuration || 1500 // 默认25分钟

  const progress = Math.min((todayExecutedTime / estimatedDuration) * 100, 100)
  return Math.round(progress * 10) / 10 // 保留1位小数
}

/**
 * 初始化任务的dailyTimeStats (确保字段存在)
 */
export function initializeDailyTimeStats(task: TodoTask): void {
  if (!task.dailyTimeStats) {
    task.dailyTimeStats = {}
  }
}

/**
 * 批量应用逻辑重置到任务列表
 */
export function applyLogicalResetToTasks<T extends Task>(tasks: T[]): T[] {
  return tasks.map((task) => applyLogicalReset(task))
}

/**
 * 检查是否已经是新的一天（用于前端缓存失效）
 */
export function isNewDay(lastCheckDate?: string): boolean {
  if (!lastCheckDate) return true

  const lastDate = lastCheckDate.split('T')[0]
  const today = getTodayDateString()

  return lastDate !== today
}
