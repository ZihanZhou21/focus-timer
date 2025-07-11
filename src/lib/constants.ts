// 项目类型配置 - 统一管理
export const taskTypeConfig = {
  todo: {
    name: 'Todo',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-400',
    icon: '📋',
  },
  'check-in': {
    name: 'Check-in',
    color: 'bg-gray-500',
    lightColor: 'bg-gray-400',
    icon: '✅',
  },
} as const

export type TaskType = keyof typeof taskTypeConfig

// 时间段类型
export type TimePeriod = 'week' | 'month' | 'year'

// 用户ID常量
export const DEFAULT_USER_ID = 'user_001'

// 最小专注循环时间（分钟）
export const MIN_CYCLE_DURATION = 25

// 专注时间权重配置
export const FOCUS_TIME_WEIGHTS = {
  focus: 1.0,
  task: 1.0,
  exercise: 0.7,
  habit: 0.5,
} as const
