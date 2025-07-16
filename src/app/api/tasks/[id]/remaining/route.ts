import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask } from '@/lib/types'

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

    // 只有 TODO 任务才有剩余时间概念
    if (task.type !== 'todo') {
      return NextResponse.json(
        { error: 'Only TODO tasks have remaining time' },
        { status: 400 }
      )
    }

    const todoTask = task as TodoTask

    // 获取今天的日期字符串 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]

    // 只计算今日已执行时间（从 dailyTimeStats[today] 获取）
    const todayExecutedSeconds = todoTask.dailyTimeStats?.[today] || 0

    // 预估时间（从 estimatedDuration 获取，单位：秒）
    const estimatedSeconds = todoTask.estimatedDuration || 25 * 60 // 默认25分钟

    // 基于今日执行时间计算剩余时间
    const remainingSeconds = Math.max(
      0,
      estimatedSeconds - todayExecutedSeconds
    )

    // 转换为分钟，使用精确的小数表示以保持秒级精度
    const executedMinutes = Math.round((todayExecutedSeconds / 60) * 100) / 100 // 保留2位小数
    const estimatedMinutes = Math.round((estimatedSeconds / 60) * 100) / 100
    const remainingMinutes = Math.round((remainingSeconds / 60) * 100) / 100

    const remainingData = {
      taskId: id,
      estimatedMinutes,
      executedMinutes, // 今日已执行时间（分钟）
      remainingMinutes, // 今日剩余时间（分钟）
      remainingSeconds, // 今日剩余时间（秒）
      executedSeconds: todayExecutedSeconds, // 今日已执行时间（秒）
      estimatedSeconds,
      isCompleted: task.status === 'completed',
      todayOnly: true, // 标记：此API返回的是今日数据
      date: today, // 当前计算基于的日期
    }

    return NextResponse.json(remainingData)
  } catch (error) {
    console.error('GET task remaining error:', error)
    return NextResponse.json(
      { error: 'Failed to get task remaining time' },
      { status: 500 }
    )
  }
}
