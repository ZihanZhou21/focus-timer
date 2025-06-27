import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Task, TodoTask } from '@/lib/types'
import { ProjectItem } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') // 'project-items' | 'tasks'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '缺少startDate或endDate参数' },
        { status: 400 }
      )
    }

    console.log(`获取日期范围数据: ${startDate} - ${endDate}, 用户: ${userId}`)

    const dataPath = join(process.cwd(), 'data', 'tasks.json')

    if (!existsSync(dataPath)) {
      console.log('任务数据文件不存在，返回空数据')
      return NextResponse.json({})
    }

    const fileContent = readFileSync(dataPath, 'utf-8')
    const allTasks: Task[] = JSON.parse(fileContent)

    // 生成日期范围
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dateRange: string[] = []

    const current = new Date(start)
    while (current <= end) {
      dateRange.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    // 简单的日期过滤函数
    const getTasksForDate = (tasks: Task[], targetDate: string): Task[] => {
      return tasks.filter((task) => {
        if (task.type === 'todo') {
          const todoTask = task as TodoTask
          const dueDate = todoTask.dueDate
            ? todoTask.dueDate.split('T')[0]
            : null
          const completedDate = todoTask.completedAt
            ? todoTask.completedAt.split('T')[0]
            : null
          return dueDate === targetDate || completedDate === targetDate
        }
        return false // 简化处理，只处理todo任务
      })
    }

    // 转换Task到ProjectItem的函数
    const convertTaskToProjectItem = (
      task: Task,
      date: string
    ): ProjectItem => {
      const time = task.plannedTime || '00:00'
      let durationMinutes = 0

      if (task.type === 'todo') {
        durationMinutes = Math.round((task as TodoTask).estimatedDuration / 60)
      }

      return {
        id: task._id,
        userId: task.userId,
        date: date,
        time: time,
        title: task.title,
        durationMinutes: durationMinutes,
        icon: '📝',
        iconColor:
          task.priority === 'high'
            ? 'bg-red-500'
            : task.priority === 'medium'
            ? 'bg-yellow-500'
            : 'bg-green-500',
        category: 'task',
        completed: task.status === 'completed',
        details: Array.isArray(task.content) ? task.content : [task.content],
        tags: task.tags,
        priority: task.priority,
        status: task.status,
        type: task.type,
      }
    }

    // 按日期分组任务
    const result: { [date: string]: Task[] | ProjectItem[] } = {}

    for (const date of dateRange) {
      const dayTasks = getTasksForDate(allTasks, date)

      if (format === 'project-items') {
        result[date] = dayTasks.map((task) =>
          convertTaskToProjectItem(task, date)
        )
      } else {
        result[date] = dayTasks
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取日期范围数据失败:', error)
    return NextResponse.json({ error: '获取日期范围数据失败' }, { status: 500 })
  }
}
