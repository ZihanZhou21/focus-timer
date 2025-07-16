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
    const dataPath = getDataFilePath()
    const data = await fs.readFile(dataPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取任务数据失败:', error)
    return []
  }
}

// 写入任务数据
async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const dataPath = getDataFilePath()
    await fs.writeFile(dataPath, JSON.stringify(tasks, null, 2))
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw error
  }
}

// 执行每日重置逻辑
async function performDailyReset(userId: string = 'user_001') {
  const tasks = await readTasksData()
  const userTasks = tasks.filter((task) => task.userId === userId)

  let resetCount = 0
  const today = new Date().toISOString().split('T')[0]

  // 备份数据
  const backupPath = path.join(
    process.cwd(),
    'data',
    `tasks.backup-daily-reset.${Date.now()}.json`
  )
  await fs.writeFile(backupPath, JSON.stringify(tasks, null, 2))

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]

    if (task.userId !== userId) continue

    let wasReset = false

    // 重置任务状态
    if (task.status === 'completed') {
      task.status = 'pending'
      wasReset = true
    }

    // 清理completedAt中的今日记录（如果有的话）
    if (Array.isArray(task.completedAt)) {
      const originalLength = task.completedAt.length
      task.completedAt = task.completedAt.filter((date) => date !== today)
      if (task.completedAt.length !== originalLength) {
        wasReset = true
      }
    }

    // 针对TODO任务的特殊处理
    if (task.type === 'todo') {
      const todoTask = task as TodoTask

      // 清理今日的时间记录
      if (todoTask.dailyTimeStats && todoTask.dailyTimeStats[today]) {
        delete todoTask.dailyTimeStats[today]
        wasReset = true
      }
    }

    // 针对打卡任务的特殊处理
    if (task.type === 'check-in') {
      const checkInTask = task as CheckInTask

      // 移除今日的打卡记录
      if (checkInTask.checkInHistory) {
        const originalLength = checkInTask.checkInHistory.length
        checkInTask.checkInHistory = checkInTask.checkInHistory.filter(
          (entry) => entry.date !== today
        )
        if (checkInTask.checkInHistory.length !== originalLength) {
          wasReset = true
        }
      }
    }

    // 更新修改时间
    if (wasReset) {
      task.updatedAt = new Date().toISOString()
      resetCount++
    }

    tasks[i] = task
  }

  // 保存更新后的数据
  if (resetCount > 0) {
    await writeTasksData(tasks)
  }

  return {
    resetCount,
    totalTasks: userTasks.length,
    backupPath,
    resetDate: today,
  }
}

// GET /api/scheduler - 检查调度器状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      // 返回调度器状态信息
      return NextResponse.json({
        status: 'active',
        lastCheck: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currentTime: new Date().toISOString(),
        message: '调度器运行正常',
      })
    }

    return NextResponse.json({
      scheduler: 'focus-timer-daily-reset',
      endpoints: {
        status: '/api/scheduler?action=status',
        triggerReset: 'POST /api/scheduler/daily-reset',
      },
      message: 'Focus Timer 每日重置调度器',
    })
  } catch (error) {
    console.error('调度器错误:', error)
    return NextResponse.json({ error: '调度器服务错误' }, { status: 500 })
  }
}

// POST /api/scheduler - 手动触发每日重置
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('userId') || 'user_001'

    if (action === 'daily-reset') {
      console.log(`手动触发每日重置，用户: ${userId}`)

      const result = await performDailyReset(userId)

      return NextResponse.json({
        success: true,
        message: `每日重置完成`,
        result,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: '未知的调度动作' }, { status: 400 })
  } catch (error) {
    console.error('调度器POST错误:', error)
    return NextResponse.json({ error: '执行调度任务失败' }, { status: 500 })
  }
}
