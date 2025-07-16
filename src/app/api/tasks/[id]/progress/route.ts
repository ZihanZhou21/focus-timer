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

    // 只有 TODO 任务才有进度概念
    if (task.type !== 'todo') {
      return NextResponse.json(
        { error: 'Only TODO tasks have progress' },
        { status: 400 }
      )
    }

    const todoTask = task as TodoTask

    // 获取今天的日期字符串 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]

    // 只计算今日执行时间（从 dailyTimeStats[today] 获取）
    const todayExecutedTime = todoTask.dailyTimeStats?.[today] || 0

    // 预估时间（从 estimatedDuration 获取，单位：秒）
    const estimatedDuration = todoTask.estimatedDuration || 25 * 60 // 默认25分钟

    // 基于今日执行时间计算进度百分比
    const progressPercentage = Math.min(
      100,
      Math.round((todayExecutedTime / estimatedDuration) * 100)
    )

    // 构建每日执行数据（保留历史数据用于统计）
    const dailyProgress = todoTask.dailyTimeStats
      ? Object.entries(todoTask.dailyTimeStats).map(([date, duration]) => ({
          date,
          duration,
          minutes: Math.round(duration / 60),
        }))
      : []

    // 为前端提供今日专用数据
    const todayProgress = {
      date: today,
      duration: todayExecutedTime,
      minutes: Math.round(todayExecutedTime / 60),
    }

    const progressData = {
      taskId: id,
      totalExecutedTime: todayExecutedTime, // 改为今日执行时间
      estimatedDuration,
      progressPercentage, // 基于今日时间计算的进度
      isCompleted: task.status === 'completed',
      dailyProgress, // 保留所有历史数据
      todayProgress, // 新增：今日专用数据
      todayOnly: true, // 标记：此API返回的是今日进度
    }

    return NextResponse.json(progressData)
  } catch (error) {
    console.error('GET task progress error:', error)
    return NextResponse.json(
      { error: 'Failed to get task progress' },
      { status: 500 }
    )
  }
}
