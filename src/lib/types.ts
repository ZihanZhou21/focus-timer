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
  completedAt: string | null
  plannedTime?: string // 计划时间，格式: HH:MM
}

export interface TodoTask extends BaseTask {
  type: 'todo'
  dueDate: string | null
  estimatedDuration: number // 秒
  timeLog: TimeLogEntry[]
}

export interface CheckInTask extends BaseTask {
  type: 'check-in'
  checkInHistory: CheckInEntry[]
  recurrence: RecurrencePattern
}

export interface TimeLogEntry {
  startTime: string
  endTime: string
  duration: number // 秒
}

export interface CheckInEntry {
  date: string
  note: string
  duration: number // 秒
  rating: number // 1-5
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly'
  daysOfWeek: number[] // 0=周日, 1=周一, ..., 6=周六
}

export type Task = TodoTask | CheckInTask
