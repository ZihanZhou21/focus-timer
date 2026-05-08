// 预设图标选项
export const PRESET_ICONS = [
  '📝', '💻', '📚', '🏃', '💪', '🎯', '☕', '🍳', 
  '🥗', '👥', '🎬', '📖', '🧘', '☀️', '🛠️', '👨‍👩‍👧‍👦'
]

// 预设颜色选项
export const PRESET_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-slate-500', 
  'bg-amber-500', 'bg-emerald-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'
]

// 预设标签选项
export const PRESET_TAGS = [
  '重要', '紧急', '工作', '学习', '健康', '娱乐', '家庭', '社交', 
  '创意', '规划', '复习', '练习', '阅读', '写作', '思考', '放松', 
  '运动', '冥想', '会议', '项目', '技能', '爱好', '目标', '习惯'
]

// 一周天数配置
export const WEEKDAYS = [
  { key: 0, label: '周日', short: '日' },
  { key: 1, label: '周一', short: '一' },
  { key: 2, label: '周二', short: '二' },
  { key: 3, label: '周三', short: '三' },
  { key: 4, label: '周四', short: '四' },
  { key: 5, label: '周五', short: '五' },
  { key: 6, label: '周六', short: '六' },
]

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
