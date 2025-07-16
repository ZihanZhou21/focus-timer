// 新的数据类型定义
export interface BaseTask {
  _id: string
  userId: string
  type: 'todo' | 'check-in'
  title: string
  content: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  createdAt: string
  updatedAt: string
  completedAt: string[] // 完成日期数组，格式: ["YYYY-MM-DD", "YYYY-MM-DD"]
  plannedTime?: string // 计划时间，格式: HH:MM
}

// 新增：每日时间统计接口
export interface DailyTimeStats {
  [date: string]: number // 日期(YYYY-MM-DD) -> 执行时间(秒)
}

export interface TodoTask extends BaseTask {
  type: 'todo'
  dueDate: string | null
  estimatedDuration: number // 秒
  dailyTimeStats: DailyTimeStats // 每日时间统计，唯一的时间数据源
}

export interface CheckInTask extends BaseTask {
  type: 'check-in'
  checkInHistory: CheckInEntry[]
  recurrence: RecurrencePattern
}

// TimeLogEntry 已移除 - 改用 DailyTimeStats 简化架构

export interface CheckInEntry {
  date: string
  note: string
  rating: number // 1-5
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly'
  daysOfWeek: number[] // 0=周日, 1=周一, ..., 6=周六
}

export type Task = TodoTask | CheckInTask

// 新增：任务进度API响应类型
export interface TaskProgressResponse {
  taskId: string
  totalExecutedTime: number // 今日执行时间（秒）
  estimatedDuration: number // 预估时间（秒）
  progressPercentage: number // 今日进度百分比
  isCompleted: boolean
  dailyProgress: Array<{
    date: string
    duration: number
    minutes: number
  }>
  todayProgress: {
    date: string
    duration: number
    minutes: number
  }
  todayOnly: boolean // 标记：返回的是今日进度
}

// 新增：剩余时间API响应类型
export interface TaskRemainingResponse {
  taskId: string
  estimatedMinutes: number
  executedMinutes: number // 今日已执行时间（分钟）
  remainingMinutes: number // 今日剩余时间（分钟）
  remainingSeconds: number // 今日剩余时间（秒）
  executedSeconds: number // 今日已执行时间（秒）
  estimatedSeconds: number
  isCompleted: boolean
  todayOnly: boolean // 标记：返回的是今日数据
  date: string // 计算基于的日期
}
