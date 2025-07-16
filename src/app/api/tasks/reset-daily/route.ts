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

// 获取重置状态信息
function getResetStatus(tasks: Task[], userId: string = 'user_001') {
  const userTasks = tasks.filter((task) => task.userId === userId)
  const today = new Date().toISOString().split('T')[0]

  let completedCheckIns = 0
  let completedTodos = 0
  let todosWithProgress = 0

  for (const task of userTasks) {
    // 检查是否今天完成
    const completedToday =
      Array.isArray(task.completedAt) && task.completedAt.includes(today)

    if (task.type === 'check-in' && completedToday) {
      completedCheckIns++
    } else if (task.type === 'todo') {
      if (completedToday) {
        completedTodos++
      }

      // 检查是否有今天的进度
      const todoTask = task as TodoTask
      if (todoTask.dailyTimeStats && todoTask.dailyTimeStats[today] > 0) {
        todosWithProgress++
      }
    }
  }

  return {
    totalTasks: userTasks.length,
    completedCheckIns,
    completedTodos,
    todosWithProgress,
    canReset:
      completedCheckIns > 0 || completedTodos > 0 || todosWithProgress > 0,
    date: today,
  }
}

// 执行每日重置
async function performDailyReset(userId: string = 'user_001') {
  const tasks = await readTasksData()
  const today = new Date().toISOString().split('T')[0]

  // 备份数据
  const backupPath = path.join(
    process.cwd(),
    'data',
    `tasks.backup-daily-reset.${Date.now()}.json`
  )
  await fs.writeFile(backupPath, JSON.stringify(tasks, null, 2))

  let resetCount = 0
  const resetDetails = {
    statusResets: 0,
    completedAtResets: 0,
    timeStatsResets: 0,
    checkInResets: 0,
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]

    if (task.userId !== userId) continue

    let wasModified = false

    // 重置完成状态
    if (task.status === 'completed') {
      task.status = 'pending'
      resetDetails.statusResets++
      wasModified = true
    }

    // 清理今日完成记录
    if (Array.isArray(task.completedAt) && task.completedAt.includes(today)) {
      task.completedAt = task.completedAt.filter((date) => date !== today)
      resetDetails.completedAtResets++
      wasModified = true
    }

    // 针对TODO任务的特殊处理
    if (task.type === 'todo') {
      const todoTask = task as TodoTask

      // 清理今日时间记录
      if (todoTask.dailyTimeStats && todoTask.dailyTimeStats[today]) {
        delete todoTask.dailyTimeStats[today]
        resetDetails.timeStatsResets++
        wasModified = true
      }
    }

    // 针对打卡任务的特殊处理
    if (task.type === 'check-in') {
      const checkInTask = task as CheckInTask

      // 移除今日打卡记录
      if (checkInTask.checkInHistory && checkInTask.checkInHistory.length > 0) {
        const originalLength = checkInTask.checkInHistory.length
        checkInTask.checkInHistory = checkInTask.checkInHistory.filter(
          (entry) => entry.date !== today
        )
        if (checkInTask.checkInHistory.length !== originalLength) {
          resetDetails.checkInResets++
          wasModified = true
        }
      }
    }

    // 更新修改时间
    if (wasModified) {
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
    resetDetails,
    backupPath,
    resetDate: today,
    timestamp: new Date().toISOString(),
  }
}

// GET /api/tasks/reset-daily - 获取重置状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'

    console.log(`获取用户 ${userId} 的重置状态`)

    const tasks = await readTasksData()
    const status = getResetStatus(tasks, userId)

    return NextResponse.json({
      success: true,
      ...status,
      message: '重置状态获取成功',
    })
  } catch (error) {
    console.error('获取重置状态失败:', error)
    return NextResponse.json({ error: '获取重置状态失败' }, { status: 500 })
  }
}

// POST /api/tasks/reset-daily - 执行每日重置
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'

    console.log(`执行用户 ${userId} 的每日重置`)

    // 检查重置前状态
    const tasks = await readTasksData()
    const beforeStatus = getResetStatus(tasks, userId)

    if (!beforeStatus.canReset) {
      return NextResponse.json({
        success: false,
        message: '今天没有需要重置的数据',
        status: beforeStatus,
      })
    }

    // 执行重置
    const result = await performDailyReset(userId)

    // 获取重置后状态
    const afterTasks = await readTasksData()
    const afterStatus = getResetStatus(afterTasks, userId)

    return NextResponse.json({
      success: true,
      message: `每日重置完成，共重置 ${result.resetCount} 个任务`,
      result,
      beforeStatus,
      afterStatus,
    })
  } catch (error) {
    console.error('执行每日重置失败:', error)
    return NextResponse.json({ error: '执行每日重置失败' }, { status: 500 })
  }
}
