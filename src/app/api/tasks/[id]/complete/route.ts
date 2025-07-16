import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask } from '@/lib/types'

const getDataFilePath = () => path.join(process.cwd(), 'data', 'tasks.json')

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
    throw new Error('写入任务数据失败')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duration } = body as { duration?: number }

    const tasks = await readTasksData()

    const taskIndex = tasks.findIndex((t) => t._id === id)
    if (taskIndex === -1) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const task = tasks[taskIndex]

    // 更新任务状态
    const today = new Date().toISOString().split('T')[0] // 今天的日期
    const currentCompletedAt = task.completedAt || []

    // 如果今天还没有完成记录，则添加
    let updatedCompletedAt = currentCompletedAt
    if (!currentCompletedAt.includes(today)) {
      updatedCompletedAt = [...currentCompletedAt, today]
    }

    // 更新基础任务信息
    const updatedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: updatedCompletedAt,
      updatedAt: new Date().toISOString(),
    }

    // 如果是TODO任务且有时长数据，更新dailyTimeStats
    if (task.type === 'todo' && duration && duration > 0) {
      const todoTask = updatedTask as TodoTask

      // 初始化dailyTimeStats如果不存在
      if (!todoTask.dailyTimeStats) {
        todoTask.dailyTimeStats = {}
      }

      // 更新今日时间统计
      if (todoTask.dailyTimeStats[today]) {
        todoTask.dailyTimeStats[today] += duration
      } else {
        todoTask.dailyTimeStats[today] = duration
      }

      console.log(
        `📊 Updated dailyTimeStats for ${id}: added ${duration}s to ${today}, total: ${todoTask.dailyTimeStats[today]}s`
      )
    }

    tasks[taskIndex] = updatedTask
    await writeTasksData(tasks)

    return NextResponse.json({
      message: '任务已完成',
      task: updatedTask,
      durationAdded: duration || 0,
      todayTotal:
        task.type === 'todo' && (updatedTask as TodoTask).dailyTimeStats
          ? (updatedTask as TodoTask).dailyTimeStats[today] || 0
          : 0,
    })
  } catch (error) {
    console.error('完成任务失败:', error)
    return NextResponse.json({ error: '完成任务失败' }, { status: 500 })
  }
}
