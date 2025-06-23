// API服务层 - 提供前端调用后端API的方法

// API相关类型定义
export interface ProjectItem {
  id: string
  userId: string
  date: string
  time: string
  title: string
  durationMinutes: number
  icon: string
  iconColor: string
  category: 'habit' | 'task' | 'focus' | 'exercise'
  completed: boolean
  details?: string[]
}

export interface TimelineItem {
  id: string
  time: string
  title: string
  duration?: string
  details?: string[]
  icon: string
  iconColor: string
  completed: boolean
  category: 'habit' | 'task' | 'focus' | 'exercise'
}

export interface WeeklyData {
  weekStart: string
  weekEnd: string
  days: {
    date: string
    dayLabel: string
    projects: ProjectItem[]
    stats: {
      totalProjects: number
      completedProjects: number
      focusTime: number
      cycles: number
      hasRecord: boolean
    }
  }[]
  totalStats: {
    totalProjects: number
    completedProjects: number
    totalFocusTime: number
    totalCycles: number
    completionRate: number
  }
}

// 共享的数据处理工具函数
export const dataUtils = {
  // 计算专注时间（根据项目类型加权）
  calculateFocusTime(projects: ProjectItem[]): number {
    return projects.reduce((total, project) => {
      if (!project.completed) return total

      const weight = {
        focus: 1.0,
        task: 1.0,
        exercise: 0.7,
        habit: 0.5,
      }[project.category]

      return total + project.durationMinutes * weight
    }, 0)
  },

  // 计算完成周期数（已完成且≥25分钟）
  calculateCycles(projects: ProjectItem[]): number {
    return projects.filter(
      (project) => project.completed && project.durationMinutes >= 25
    ).length
  },

  // 生成新的项目ID
  generateProjectId(projects: ProjectItem[]): string {
    const maxId = projects.reduce((max, project) => {
      const numId = parseInt(project.id.split('-')[0])
      return numId > max ? numId : max
    }, 0)
    return `${maxId + 1}-${Date.now()}`
  },
}

// 工具函数 - 统一使用小时格式显示
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0h'
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

export function formatFocusTime(minutes: number): string {
  if (minutes === 0) return '0h'
  const hours = minutes / 60
  return `${hours.toFixed(1)}h`
}

export function projectToTimelineItem(project: ProjectItem): TimelineItem {
  return {
    id: project.id,
    time: project.time,
    title: project.title,
    duration: formatDuration(project.durationMinutes),
    details: project.details,
    icon: project.icon,
    iconColor: project.iconColor,
    completed: project.completed,
    category: project.category,
  }
}

// API服务类
class ApiService {
  private baseUrl = '/api'

  // 项目相关API
  async getProjects(
    date?: string,
    userId = 'user_001'
  ): Promise<TimelineItem[]> {
    const params = new URLSearchParams({ userId })
    if (date) params.append('date', date)

    const response = await fetch(`${this.baseUrl}/projects?${params}`)
    if (!response.ok) throw new Error('获取项目失败')

    const projects: ProjectItem[] = await response.json()
    return projects.map(projectToTimelineItem)
  }

  async getProject(id: string): Promise<TimelineItem> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`)
    if (!response.ok) throw new Error('获取项目失败')

    const project: ProjectItem = await response.json()
    return projectToTimelineItem(project)
  }

  async saveProject(
    projectData: Omit<ProjectItem, 'id'>
  ): Promise<ProjectItem> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    })
    if (!response.ok) throw new Error('保存项目失败')

    return response.json()
  }

  async updateProject(
    id: string,
    updates: Partial<ProjectItem>
  ): Promise<ProjectItem> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('更新项目失败')

    return response.json()
  }

  async deleteProject(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('删除项目失败')

    const result = await response.json()
    return result.success
  }

  // 本周数据计算（基于projects数据）
  async getWeeklyData(date?: string, userId = 'user_001'): Promise<WeeklyData> {
    const targetDate = date ? new Date(date) : new Date()
    const weekStart = new Date(targetDate)
    weekStart.setDate(targetDate.getDate() - targetDate.getDay())

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // 获取本周所有项目数据
    const allProjects: ProjectItem[] = []
    const current = new Date(weekStart)

    while (current <= weekEnd) {
      const dateStr = current.toISOString().split('T')[0]
      try {
        const response = await fetch(
          `${this.baseUrl}/projects?date=${dateStr}&userId=${userId}`
        )
        if (response.ok) {
          const dayProjects: ProjectItem[] = await response.json()
          allProjects.push(...dayProjects)
        }
      } catch (error) {
        console.error(`Failed to load data for ${dateStr}:`, error)
      }
      current.setDate(current.getDate() + 1)
    }

    // 构建周数据结构
    const days = []
    let totalProjects = 0
    let totalCompletedProjects = 0
    let totalFocusTime = 0
    let totalCycles = 0

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart)
      currentDate.setDate(weekStart.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]

      const month = currentDate.getMonth() + 1
      const day = currentDate.getDate()
      const dayLabel = `${month}/${day}`

      const dayProjects = allProjects.filter((p) => p.date === dateStr)
      const completedProjects = dayProjects.filter((p) => p.completed).length
      const focusTime = Math.round(dataUtils.calculateFocusTime(dayProjects))
      const cycles = dataUtils.calculateCycles(dayProjects)

      days.push({
        date: dateStr,
        dayLabel,
        projects: dayProjects.sort((a, b) => a.time.localeCompare(b.time)),
        stats: {
          totalProjects: dayProjects.length,
          completedProjects,
          focusTime,
          cycles,
          hasRecord: dayProjects.length > 0,
        },
      })

      totalProjects += dayProjects.length
      totalCompletedProjects += completedProjects
      totalFocusTime += focusTime
      totalCycles += cycles
    }

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      days,
      totalStats: {
        totalProjects,
        completedProjects: totalCompletedProjects,
        totalFocusTime,
        totalCycles,
        completionRate:
          totalProjects > 0
            ? Math.round((totalCompletedProjects / totalProjects) * 100)
            : 0,
      },
    }
  }

  // 专注时间计算工具方法
  calculateFocusTime(projects: ProjectItem[]): number {
    return dataUtils.calculateFocusTime(projects)
  }

  // 循环次数计算工具方法
  calculateCycles(projects: ProjectItem[]): number {
    return dataUtils.calculateCycles(projects)
  }

  // 习惯操作方法（基于projects API）
  async toggleHabit(habitId: string, completed: boolean): Promise<void> {
    await this.updateProject(habitId, { completed })
  }

  // 获取指定日期的习惯完成状态
  async getCompletedHabits(
    date: string,
    userId = 'user_001'
  ): Promise<string[]> {
    const projects = await this.getProjects(date, userId)
    return projects
      .filter((p) => p.category === 'habit' && p.completed)
      .map((p) => p.id)
  }

  // 兼容旧版本的习惯API
  async getHabits(date: string, userId = 'user_001'): Promise<string[]> {
    return this.getCompletedHabits(date, userId)
  }

  async saveHabits(date: string, habitIds: string[]): Promise<void> {
    // 批量更新习惯状态
    const updates = habitIds.map((id) => ({ id, completed: true }))

    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('保存习惯失败')
  }
}

// 导出API服务实例
export const apiService = new ApiService()

// 导出默认实例（向后兼容）
export default apiService
