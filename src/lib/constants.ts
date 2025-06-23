// 项目类型配置 - 统一管理
export const categoryConfig = {
  habit: {
    name: '习惯',
    color: 'bg-gray-500',
    lightColor: 'bg-gray-400',
    description: '日常习惯打卡',
    icon: '🔄',
  },
  task: {
    name: '任务',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-400',
    description: '工作任务',
    icon: '📋',
  },
  focus: {
    name: '专注',
    color: 'bg-amber-500',
    lightColor: 'bg-amber-400',
    description: '深度专注',
    icon: '🎯',
  },
  exercise: {
    name: '运动',
    color: 'bg-green-500',
    lightColor: 'bg-green-400',
    description: '运动健身',
    icon: '💪',
  },
} as const

export type ProjectCategory = keyof typeof categoryConfig

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
