import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Task, TodoTask, CheckInTask } from '@/lib/types'

const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'tasks.json')
}

// 读取任务数据
async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('读取任务数据失败:', error)
    throw new Error('读取任务数据失败')
  }
}

// 写入任务数据
async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const filePath = getDataFilePath()
    await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8')
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw new Error('写入任务数据失败')
  }
}

// POST - 执行每日重置
export async function POST(request: NextRequest) {
  try {
    console.log('🌅 开始执行每日重置...')

    // 读取所有任务
    const tasks = await readTasksData()

    if (tasks.length === 0) {
      console.log('没有任务需要重置')
      return NextResponse.json({
        message: '没有任务需要重置',
        resetCount: 0,
      })
    }

    let resetCount = 0
    const now = new Date().toISOString()

    // 重置每个任务
    const resetTasks = tasks.map((task) => {
      let needsReset = false
      const resetTask = { ...task }

      if (task.type === 'check-in') {
        // 重置打卡任务
        const checkInTask = task as CheckInTask
        if (checkInTask.status === 'completed') {
          resetTask.status = 'pending'
          resetTask.completedAt = null
          resetTask.updatedAt = now
          needsReset = true
          console.log(`🔄 重置打卡任务: ${task.title}`)
        }
      } else if (task.type === 'todo') {
        // 重置TODO任务
        const todoTask = task as TodoTask
        if (todoTask.status === 'completed' || todoTask.timeLog.length > 0) {
          resetTask.status = 'pending'
          resetTask.completedAt = null
          resetTask.updatedAt = now
          // 清空时间日志，重置进度
          ;(resetTask as TodoTask).timeLog = []
          needsReset = true
          console.log(
            `🔄 重置TODO任务: ${task.title} (清空了 ${todoTask.timeLog.length} 条时间记录)`
          )
        }
      }

      if (needsReset) {
        resetCount++
      }

      return resetTask
    })

    // 写入重置后的数据
    await writeTasksData(resetTasks)

    console.log(`✅ 每日重置完成，共重置了 ${resetCount} 个任务`)

    return NextResponse.json({
      message: `每日重置完成，共重置了 ${resetCount} 个任务`,
      resetCount,
      timestamp: now,
    })
  } catch (error) {
    console.error('每日重置失败:', error)
    return NextResponse.json(
      {
        error: '每日重置失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// GET - 获取重置状态信息
export async function GET() {
  try {
    const tasks = await readTasksData()

    const completedCheckIns = tasks.filter(
      (task) => task.type === 'check-in' && task.status === 'completed'
    ).length

    const completedTodos = tasks.filter(
      (task) => task.type === 'todo' && task.status === 'completed'
    ).length

    const todosWithProgress = tasks.filter(
      (task) => task.type === 'todo' && (task as TodoTask).timeLog.length > 0
    ).length

    return NextResponse.json({
      totalTasks: tasks.length,
      completedCheckIns,
      completedTodos,
      todosWithProgress,
      canReset:
        completedCheckIns > 0 || completedTodos > 0 || todosWithProgress > 0,
    })
  } catch (error) {
    console.error('获取重置状态失败:', error)
    return NextResponse.json({ error: '获取重置状态失败' }, { status: 500 })
  }
}
