import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { isToday } from '@/lib/timestamp-reset'

// 任务类型定义
interface TimeLog {
  startTime: string
  endTime: string
  duration: number
}

interface TodoTask {
  _id: string
  userId: string
  type: 'todo'
  title: string
  status: string
  estimatedDuration?: number
  timeLog?: TimeLog | TimeLog[]
  completedAt?: string
}

interface TaskRemainingResponse {
  taskId: string
  estimatedMinutes: number // 预估时间（分钟）
  executedMinutes: number // 已执行时间（分钟）
  remainingMinutes: number // 剩余时间（分钟）
  isCompleted: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    if (!taskId) {
      return NextResponse.json({ error: '请提供任务ID' }, { status: 400 })
    }

    // 读取任务数据
    const dataPath = join(process.cwd(), 'data', 'tasks.json')
    if (!existsSync(dataPath)) {
      return NextResponse.json({ error: '任务数据文件不存在' }, { status: 404 })
    }

    const fileContent = readFileSync(dataPath, 'utf-8')
    const allTasks: TodoTask[] = JSON.parse(fileContent)

    // 查找指定任务
    const task = allTasks.find((t) => t._id === taskId && t.type === 'todo')

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在或不是TODO类型任务' },
        { status: 404 }
      )
    }

    // 直接计算剩余时间（避免小数点问题）
    const remainingData = calculateTaskRemaining(task)

    return NextResponse.json(remainingData)
  } catch (error) {
    console.error('获取任务剩余时间失败:', error)
    return NextResponse.json(
      {
        error: '获取任务剩余时间失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// 直接计算任务剩余时间（整数分钟，避免小数点问题）
function calculateTaskRemaining(task: TodoTask): TaskRemainingResponse {
  // 1. 预估时间（分钟）- 直接从estimatedDuration计算，避免多次转换
  const estimatedMinutes = Math.floor((task.estimatedDuration || 1500) / 60)

  // 2. 已执行时间（分钟）- 只累加今日的timeLog，使用Math.floor避免向上舍入
  let todayExecutedSeconds = 0
  if (task.timeLog) {
    const timeLogs = Array.isArray(task.timeLog) ? task.timeLog : [task.timeLog]
    for (const timeLog of timeLogs) {
      // 只处理今天的时间记录
      if (isToday(timeLog.startTime)) {
        todayExecutedSeconds += timeLog.duration
      }
    }
  }
  const executedMinutes = Math.floor(todayExecutedSeconds / 60)

  // 3. 剩余时间（分钟）- 确保不小于0
  const remainingMinutes = Math.max(0, estimatedMinutes - executedMinutes)

  // 4. 检查是否已完成
  const isCompleted = task.status === 'completed' || !!task.completedAt

  return {
    taskId: task._id,
    estimatedMinutes,
    executedMinutes,
    remainingMinutes,
    isCompleted,
  }
}
