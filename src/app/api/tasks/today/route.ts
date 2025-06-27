import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask, CheckInTask } from '@/lib/types'

// 获取数据文件路径
const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'tasks.json')
}

// 读取任务数据
async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('读取任务数据失败:', error)
    return []
  }
}

// 获取日期字符串（YYYY-MM-DD格式）
function getDateString(date?: string): string {
  if (date) return date
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// 获取指定日期是星期几（0=周日, 1=周一, ..., 6=周六）
function getDayOfWeek(date?: string): number {
  if (date) return new Date(date).getDay()
  return new Date().getDay()
}

// 筛选指定日期的任务的核心逻辑
function filterTasksForDate(
  tasks: Task[],
  userId: string,
  targetDate?: string
): Task[] {
  const today = getDateString(targetDate)
  const todayDayOfWeek = getDayOfWeek(targetDate)
  const todaysTasks: Task[] = []

  for (const task of tasks) {
    // 只处理指定用户的任务
    if (task.userId !== userId) continue

    if (task.type === 'todo') {
      // TODO任务筛选逻辑：
      // 1. 排除已归档的任务
      // 2. 包含今天完成的任务
      // 3. 包含今天到期的任务
      // 4. 包含7天内过期的未完成任务（避免显示过于陈旧的过期任务）
      const todoTask = task as TodoTask

      // 只过滤掉已归档的任务
      if (todoTask.status === 'archived') {
        continue
      }

      if (todoTask.dueDate) {
        const dueDate = todoTask.dueDate.split('T')[0] // 提取日期部分
        const completedDate = todoTask.completedAt
          ? todoTask.completedAt.split('T')[0]
          : null

        // 计算合理的过期任务显示范围（最多显示7天前过期的任务）
        const maxOverdueDays = 7
        const earliestDate = new Date(today)
        earliestDate.setDate(earliestDate.getDate() - maxOverdueDays)
        const earliestDateStr = earliestDate.toISOString().split('T')[0]

        // 新的筛选条件：
        // 1. 今天完成的任务（不管原本什么时候到期）
        // 2. 今天到期的任务
        // 3. 合理时间范围内过期的未完成任务（限制在7天内）
        if (
          completedDate === today ||
          dueDate === today ||
          (dueDate >= earliestDateStr &&
            dueDate < today &&
            todoTask.status !== 'completed')
        ) {
          todaysTasks.push(todoTask)
        }
      } else {
        // 没有截止日期的任务：如果是今天完成的或者状态不是completed，都算作今天的任务
        const completedDate = todoTask.completedAt
          ? todoTask.completedAt.split('T')[0]
          : null
        if (completedDate === today || todoTask.status !== 'completed') {
          todaysTasks.push(todoTask)
        }
      }
    } else if (task.type === 'check-in') {
      // CHECK-IN任务筛选逻辑：
      // 1. 包含状态为 in_progress 的任务
      // 2. 包含今天完成的任务（completedAt 为今天）
      // 3. 根据重复规则判断今天是否应该执行
      const checkInTask = task as CheckInTask

      // 检查是否今天完成的任务
      const completedDate = checkInTask.completedAt
        ? checkInTask.completedAt.split('T')[0]
        : null
      const isCompletedToday = completedDate === today

      // 如果不是进行中状态，且也不是今天完成的，则跳过
      if (checkInTask.status !== 'in_progress' && !isCompletedToday) {
        continue
      }

      const { frequency, daysOfWeek } = checkInTask.recurrence

      if (frequency === 'daily') {
        // 每日任务：肯定是今天的任务
        todaysTasks.push(checkInTask)
      } else if (frequency === 'weekly') {
        // 每周任务：检查今天是否在指定的星期中
        if (daysOfWeek.includes(todayDayOfWeek)) {
          todaysTasks.push(checkInTask)
        }
      }
    }
  }

  return todaysTasks
}

// 按计划时间排序任务
function sortTasks(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    // 优先按计划时间排序
    const timeA = a.plannedTime || '23:59' // 没有计划时间的任务排到最后
    const timeB = b.plannedTime || '23:59'

    const timeDiff = timeA.localeCompare(timeB)
    if (timeDiff !== 0) return timeDiff

    // 如果计划时间相同，按优先级排序
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff

    // 最后按标题排序
    return a.title.localeCompare(b.title)
  })
}

// 兼容旧系统的ProjectItem接口
interface ProjectItem {
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
  tags?: string[]
  priority?: string
  status?: string
  type?: string
}

// 将新数据结构转换为旧的ProjectItem格式（用于兼容现有UI）
function convertToProjectItems(tasks: Task[]): ProjectItem[] {
  return tasks.map((task) => {
    // 使用真实的计划时间，如果没有则提供默认值
    const time = task.plannedTime || '00:00'

    // 估算持续时间（分钟）
    let durationMinutes = 0
    if (task.type === 'todo') {
      durationMinutes = Math.round((task as TodoTask).estimatedDuration / 60)
    } else {
      const checkInTask = task as CheckInTask
      if (checkInTask.checkInHistory.length > 0) {
        const avgDuration =
          checkInTask.checkInHistory.reduce(
            (sum, entry) => sum + entry.duration,
            0
          ) / checkInTask.checkInHistory.length
        durationMinutes = Math.round(avgDuration / 60)
      }
    }

    // 确定分类和图标
    const category: 'task' | 'habit' | 'focus' | 'exercise' =
      task.type === 'todo' ? 'task' : 'habit'
    const icon = task.type === 'todo' ? '📝' : '💪'

    return {
      id: task._id,
      userId: task.userId,
      date: getDateString(),
      time: time,
      title: task.title,
      durationMinutes: durationMinutes,
      icon: icon,
      iconColor:
        task.priority === 'high'
          ? 'bg-red-500'
          : task.priority === 'medium'
          ? 'bg-yellow-500'
          : 'bg-green-500',
      category: category,
      completed: task.status === 'completed',
      details: Array.isArray(task.content) ? task.content : [task.content],
      tags: task.tags,
      priority: task.priority,
      status: task.status,
      type: task.type,
    }
  })
}

// GET /api/tasks/today - 获取今天的所有任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const targetDate = searchParams.get('date') // 可选的目标日期

    console.log(
      `正在获取用户 ${userId} ${
        targetDate ? `${targetDate}的` : '今天的'
      }任务...`
    )

    // 第一步：从数据源获取所有任务
    const allTasks = await readTasksData()
    console.log(`共读取到 ${allTasks.length} 个任务`)

    // 第二步：使用智能筛选逻辑过滤出指定日期的任务
    const todaysTasks = filterTasksForDate(
      allTasks,
      userId,
      targetDate || undefined
    )
    console.log(
      `筛选出 ${todaysTasks.length} 个${targetDate ? targetDate : '今天'}的任务`
    )

    // 第三步：对任务进行排序
    const sortedTasks = sortTasks(todaysTasks)

    // 第四步：检查是否需要转换为ProjectItem格式
    const format = searchParams.get('format')
    if (format === 'project-items') {
      const projectItems = convertToProjectItems(sortedTasks)
      return NextResponse.json(projectItems)
    }

    // 添加一些统计信息
    const stats = {
      total: sortedTasks.length,
      todoTasks: sortedTasks.filter((t) => t.type === 'todo').length,
      checkInTasks: sortedTasks.filter((t) => t.type === 'check-in').length,
      highPriority: sortedTasks.filter((t) => t.priority === 'high').length,
      mediumPriority: sortedTasks.filter((t) => t.priority === 'medium').length,
      lowPriority: sortedTasks.filter((t) => t.priority === 'low').length,
    }

    const response = {
      date: getDateString(targetDate || undefined),
      dayOfWeek: getDayOfWeek(targetDate || undefined),
      tasks: sortedTasks,
      stats,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取今天任务失败:', error)
    return NextResponse.json(
      {
        error: '获取今天任务失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
