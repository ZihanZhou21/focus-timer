import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task } from '@/lib/types'

const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'tasks.json')
}

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

async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const filePath = getDataFilePath()
    await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8')
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw error
  }
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// GET - 获取任务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const type = searchParams.get('type') as 'todo' | 'check-in' | null
    const status = searchParams.get('status')

    const tasks = await readTasksData()
    let filteredTasks = tasks.filter((task) => task.userId === userId)

    if (type) {
      filteredTasks = filteredTasks.filter((task) => task.type === type)
    }

    if (status) {
      filteredTasks = filteredTasks.filter((task) => task.status === status)
    }

    // 按更新时间排序
    filteredTasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return NextResponse.json(filteredTasks)
  } catch (error) {
    console.error('获取任务列表失败:', error)
    return NextResponse.json({ error: '获取任务列表失败' }, { status: 500 })
  }
}

// POST - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json()
    const tasks = await readTasksData()

    const newTask: Task = {
      _id: generateTaskId(),
      userId: taskData.userId || 'user_001',
      type: taskData.type,
      title: taskData.title,
      content: taskData.content || [],
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      ...taskData,
    }

    tasks.push(newTask)
    await writeTasksData(tasks)

    return NextResponse.json(newTask)
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 })
  }
}

// PUT - 批量更新任务
export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json()
    const tasks = await readTasksData()

    // 批量更新
    for (const update of updates) {
      const index = tasks.findIndex((t) => t._id === update._id)
      if (index !== -1) {
        tasks[index] = {
          ...tasks[index],
          ...update,
          updatedAt: new Date().toISOString(),
        }
      }
    }

    await writeTasksData(tasks)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('批量更新任务失败:', error)
    return NextResponse.json({ error: '批量更新任务失败' }, { status: 500 })
  }
}
