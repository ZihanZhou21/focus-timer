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

// GET - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const task = tasks.find((t) => t._id === id)

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('获取任务失败:', error)
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 })
  }
}

// PUT - 更新单个任务
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
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 更新任务，保留原有数据
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await writeTasksData(tasks)
    return NextResponse.json(tasks[index])
  } catch (error) {
    console.error('更新任务失败:', error)
    return NextResponse.json({ error: '更新任务失败' }, { status: 500 })
  }
}

// DELETE - 删除单个任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const index = tasks.findIndex((t) => t._id === id)

    if (index === -1) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    tasks.splice(index, 1)
    await writeTasksData(tasks)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除任务失败:', error)
    return NextResponse.json({ error: '删除任务失败' }, { status: 500 })
  }
}
