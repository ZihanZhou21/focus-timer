// 本地存储工具函数

export interface FocusSession {
  id: string
  date: string // YYYY-MM-DD 格式
  startTime: number // 时间戳
  duration: number // 实际专注时长（分钟）
  targetDuration: number // 目标时长（分钟）
  completed: boolean // 是否完成整个周期
}

export interface DailyStats {
  date: string
  totalFocusTime: number // 分钟
  completedSessions: number
  totalSessions: number
}

// 获取今日统计
export function getTodayStats(): DailyStats {
  const today = new Date().toISOString().split('T')[0]

  if (typeof window === 'undefined') {
    return {
      date: today,
      totalFocusTime: 0,
      completedSessions: 0,
      totalSessions: 0,
    }
  }

  const sessions = getFocusSessions()
  const todaySessions = sessions.filter((session) => session.date === today)

  return {
    date: today,
    totalFocusTime: todaySessions.reduce(
      (sum, session) => sum + session.duration,
      0
    ),
    completedSessions: todaySessions.filter((session) => session.completed)
      .length,
    totalSessions: todaySessions.length,
  }
}

// 获取所有专注记录
export function getFocusSessions(): FocusSession[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem('focus-sessions')
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading focus sessions from localStorage:', error)
    return []
  }
}

// 保存专注记录
export function saveFocusSession(session: Omit<FocusSession, 'id'>): void {
  if (typeof window === 'undefined') return

  try {
    const sessions = getFocusSessions()
    const newSession: FocusSession = {
      ...session,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    }

    sessions.push(newSession)
    localStorage.setItem('focus-sessions', JSON.stringify(sessions))
  } catch (error) {
    console.error('Error saving focus session to localStorage:', error)
  }
}

// 生成动态激励语句
export function getMotivationalMessage(stats: DailyStats): string {
  const { totalFocusTime, completedSessions } = stats

  if (totalFocusTime === 0) {
    return '新的一天开始了，让我们从第一次专注开始！'
  }

  if (totalFocusTime < 30) {
    return `今天你已专注 ${totalFocusTime} 分钟，良好的开始！`
  }

  if (totalFocusTime < 60) {
    return `今天已专注 ${totalFocusTime} 分钟，专注力正在提升！`
  }

  if (totalFocusTime < 120) {
    return `今天已专注 ${totalFocusTime} 分钟，你正在变得更专注！`
  }

  if (completedSessions >= 3) {
    return `太棒了！今天已完成 ${completedSessions} 个专注周期，你是专注大师！`
  }

  return `今天已专注 ${totalFocusTime} 分钟，继续保持这种专注状态！`
}

// 格式化时间显示
export function formatFocusTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}小时`
  }

  return `${hours}小时${remainingMinutes}分钟`
}
