import { TaskType } from '@/lib/constants'

export interface ProjectItem {
  id: string
  userId: string
  date: string
  time: string
  title: string
  durationMinutes: number
  icon: string
  iconColor: string
  completed: boolean
  details?: string[]
  tags?: string[]
  priority?: string
  status?: string
  type: TaskType
  repetitionsToday?: number
  isRecurring?: boolean
  recurringDays?: number[]
  recurringWeeks?: number
  recurringParentId?: string
  recurringEndDate?: string
  isTemplate?: boolean
  recurringTemplateId?: string
}

export const dataUtils = {
  generateProjectId: (projects: ProjectItem[]): string => {
    const existingIds = projects.map((project) => project.id)
    let maxId = 0

    existingIds.forEach((id) => {
      const match = id.match(/^project_(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxId) maxId = num
      }
    })

    return `project_${maxId + 1}`
  },

  formatDate: (date: Date): string => date.toISOString().split('T')[0],

  formatTime: (date: Date): string => date.toTimeString().substring(0, 5),
}
