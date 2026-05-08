import { NextRequest, NextResponse } from 'next/server'
import { Task, TodoTask } from '@/lib/types'
import { applyLogicalResetToTasks } from '@/lib/timestamp-reset'
import { readTasksData } from '@/lib/database'

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

// 获取指定用户的所有任务（不进行日期筛选）
function getAllUserTasks(tasks: Task[], userId: string): Task[] {
  const userTasks: Task[] = []

  console.log(`🔍 获取用户 ${userId} 的所有任务`)

  for (const task of tasks) {
    // 只处理指定用户的任务
    if (task.userId !== userId) continue

    // 只过滤掉已归档的任务，其他所有任务都显示
    if (task.status === 'archived') {
      continue
    }

    console.log(
      `✅ 包含任务: ${task.title} (类型: ${task.type}, 状态: ${task.status})`
    )
    userTasks.push(task)
  }

  console.log(`📊 结果: 共 ${userTasks.length} 个任务`)
  return userTasks
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
  completed: boolean
  details?: string[]
  tags?: string[]
  priority?: string
  status?: string
  type?: string
  repetitionsToday?: number
}

// 将新数据结构转换为旧的ProjectItem格式（用于兼容现有UI）
function convertToProjectItems(tasks: Task[]): ProjectItem[] {
  const today = new Date().toISOString().split('T')[0]
  return tasks.map((task) => {
    // 使用真实的计划时间，如果没有则提供默认值
    const time = task.plannedTime || '00:00'

    // 估算持续时间（分钟）
    // category 字段已废弃，不再赋值
    // 其余逻辑保持不变
    let durationMinutes = 0
    if (task.type === 'todo') {
      durationMinutes = Math.round((task as TodoTask).estimatedDuration / 60)
    } else {
      // check-in任务不再有duration概念，固定显示为0分钟
      durationMinutes = 0
    }

    // 确定分类和图标
    const icon = task.type === 'todo' ? '📝' : '💪'

    // 获取今日重复次数
    const repetitionsToday = task.completedCount ? task.completedCount[today] || 0 : 0

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
      completed: task.status === 'completed',
      details: Array.isArray(task.content) ? task.content : [task.content],
      tags: task.tags,
      priority: task.priority,
      status: task.status,
      type: task.type,
      repetitionsToday: repetitionsToday,
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

    // 第二步：获取用户的所有任务（不进行日期筛选）
    const userTasks = getAllUserTasks(allTasks, userId)
    console.log(`获取到 ${userTasks.length} 个用户任务`)

    // 第三步：应用逻辑重置（基于时间戳）
    const resetTasks = applyLogicalResetToTasks(userTasks)
    console.log(`应用逻辑重置后的任务数量: ${resetTasks.length}`)

    // 第四步：对任务进行排序
    const sortedTasks = sortTasks(resetTasks)

    // 第五步：检查是否需要转换为ProjectItem格式
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
