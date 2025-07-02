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

interface TaskProgressResponse {
  taskId: string
  totalExecutedTime: number // 总执行时间（秒）
  estimatedDuration: number // 预估时间（秒）
  progressPercentage: number // 进度百分比
  isCompleted: boolean
  executionSessions: {
    date: string
    duration: number
    startTime: string
    endTime: string
  }[]
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

    // 计算任务执行进度
    const progressData = calculateTaskProgress(task)

    return NextResponse.json(progressData)
  } catch (error) {
    console.error('获取任务进度失败:', error)
    return NextResponse.json(
      {
        error: '获取任务进度失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// 计算任务执行进度（基于时间戳的逻辑重置）
function calculateTaskProgress(task: TodoTask): TaskProgressResponse {
  let todayExecutedTime = 0 // 今天的执行时间（秒）
  const executionSessions: TaskProgressResponse['executionSessions'] = []

  // 处理timeLog（可能是数组或单个对象）- 只考虑今天的记录
  if (task.timeLog) {
    const timeLogs = Array.isArray(task.timeLog) ? task.timeLog : [task.timeLog]

    for (const timeLog of timeLogs) {
      // 只处理今天的时间记录
      if (isToday(timeLog.startTime)) {
        todayExecutedTime += timeLog.duration

        // 记录今天的执行会话
        executionSessions.push({
          date: timeLog.startTime.split('T')[0],
          duration: timeLog.duration,
          startTime: timeLog.startTime,
          endTime: timeLog.endTime,
        })
      }
    }
  }

  // 获取预估时间（默认25分钟 = 1500秒）
  const estimatedDuration = task.estimatedDuration || 1500

  // 计算今天的进度百分比
  const progressPercentage = Math.min(
    (todayExecutedTime / estimatedDuration) * 100,
    100
  )

  // 检查是否已完成（只考虑今天的完成状态）
  const isCompletedToday =
    (task.status === 'completed' &&
      task.completedAt &&
      isToday(task.completedAt)) ||
    (task.status === 'completed' && executionSessions.length > 0)

  return {
    taskId: task._id,
    totalExecutedTime: todayExecutedTime, // 只返回今天的执行时间
    estimatedDuration,
    progressPercentage: Math.round(progressPercentage * 10) / 10, // 保留1位小数
    isCompleted: isCompletedToday,
    executionSessions: executionSessions.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    ),
  }
}
