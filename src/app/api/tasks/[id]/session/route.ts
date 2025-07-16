import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask } from '@/lib/types'

// 任务数据文件位置
const getDataFilePath = () => path.join(process.cwd(), 'data', 'tasks.json')

async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()
    const fileContent = await fs.readFile(filePath, 'utf-8')
    if (!fileContent.trim()) return []
    const tasks = JSON.parse(fileContent)
    return Array.isArray(tasks) ? tasks : []
  } catch (error) {
    console.error('Failed to read tasks:', error)
    return []
  }
}

async function writeTasksData(tasks: Task[]): Promise<void> {
  const filePath = getDataFilePath()
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8')
}

// POST /api/tasks/[id]/session - 简化版本：只记录今日执行时间
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duration } = body as {
      duration?: number // 执行时间（秒）
    }

    if (!duration || duration <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid duration' },
        { status: 400 }
      )
    }

    const tasks = await readTasksData()
    const index = tasks.findIndex((t) => t._id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = tasks[index]

    if (task.type !== 'todo') {
      return NextResponse.json(
        { error: 'Only TODO tasks support session logging' },
        { status: 400 }
      )
    }

    const todoTask = task as TodoTask

    // 获取今日日期
    const today = new Date().toISOString().split('T')[0]

    // 初始化dailyTimeStats如果不存在
    if (!todoTask.dailyTimeStats) {
      todoTask.dailyTimeStats = {}
    }

    // 直接更新今日执行时间
    if (todoTask.dailyTimeStats[today]) {
      todoTask.dailyTimeStats[today] += duration
    } else {
      todoTask.dailyTimeStats[today] = duration
    }

    todoTask.updatedAt = new Date().toISOString()

    tasks[index] = todoTask
    await writeTasksData(tasks)

    return NextResponse.json({
      saved: true,
      todayTime: todoTask.dailyTimeStats[today],
      message: `Added ${Math.round(duration / 60)} minutes to today's time`,
    })
  } catch (error) {
    console.error('POST session error:', error)
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    )
  }
}
