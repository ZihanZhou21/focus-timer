import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task } from '@/lib/types'

const getDataFilePath = () => path.join(process.cwd(), 'data', 'tasks.json')

async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()

    try {
      await fs.access(filePath)
    } catch {
      return []
    }

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
  try {
    const filePath = getDataFilePath()
    if (!Array.isArray(tasks)) throw new Error('Tasks must be an array')

    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to write tasks:', error)
    throw error
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const task = tasks.find((t) => t._id === id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('GET task error:', error)
    return NextResponse.json({ error: 'Failed to get task' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()
    const tasks = await readTasksData()

    const index = tasks.findIndex((t) => t._id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 特殊处理 completedAt 数组逻辑
    if (updates.hasOwnProperty('completedAt')) {
      const today = new Date().toISOString().split('T')[0]
      const currentCompletedAt = tasks[index].completedAt || []

      if (updates.completedAt === null) {
        // 如果传入null，从数组中移除今天的日期
        updates.completedAt = currentCompletedAt.filter(
          (date) => date !== today
        )
      } else if (Array.isArray(updates.completedAt)) {
        // 如果直接传入数组，使用传入的数组
        updates.completedAt = updates.completedAt
      } else if (typeof updates.completedAt === 'string') {
        // 如果传入字符串日期，添加到数组中（不重复）
        const dateToAdd = updates.completedAt
        if (!currentCompletedAt.includes(dateToAdd)) {
          updates.completedAt = [...currentCompletedAt, dateToAdd]
        } else {
          updates.completedAt = currentCompletedAt
        }
      }
    }

    // timeLog已弃用 - 改用session API直接更新dailyTimeStats

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await writeTasksData(tasks)
    return NextResponse.json(tasks[index])
  } catch (error) {
    console.error('PUT task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const index = tasks.findIndex((t) => t._id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const deletedTask = tasks.splice(index, 1)[0]
    await writeTasksData(tasks)
    return NextResponse.json(deletedTask)
  } catch (error) {
    console.error('DELETE task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
