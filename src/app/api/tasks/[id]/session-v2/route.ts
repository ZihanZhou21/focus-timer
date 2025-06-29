import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Task, TodoTask, TimeLogEntry } from '@/lib/types'

// 简化的文件锁管理
const pendingOperations = new Map<string, Promise<void>>()

const getDataFilePath = () => path.join(process.cwd(), 'data', 'tasks.json')

/**
 * 原子性文件操作
 */
async function atomicFileOperation<T>(operation: () => Promise<T>): Promise<T> {
  const filePath = getDataFilePath()

  const existing = pendingOperations.get(filePath)
  if (existing) {
    await existing
  }

  const promise = operation()
  pendingOperations.set(
    filePath,
    promise.then(
      () => {},
      () => {}
    )
  )

  try {
    const result = await promise
    return result
  } finally {
    pendingOperations.delete(filePath)
  }
}

/**
 * 安全读取任务数据
 */
async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()

    try {
      await fs.access(filePath)
    } catch {
      console.log('📁 任务文件不存在，返回空数组')
      return []
    }

    const fileContent = await fs.readFile(filePath, 'utf-8')

    if (!fileContent.trim()) {
      console.log('📄 任务文件为空，返回空数组')
      return []
    }

    const tasks = JSON.parse(fileContent)

    if (!Array.isArray(tasks)) {
      throw new Error('数据格式异常：不是数组格式')
    }

    console.log(`✅ 成功读取 ${tasks.length} 个任务`)
    return tasks
  } catch (error) {
    console.error('❌ 读取任务数据失败:', error)
    throw new Error('读取任务数据失败')
  }
}

/**
 * 安全写入任务数据
 */
async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const filePath = getDataFilePath()

    if (!Array.isArray(tasks)) {
      throw new Error('任务数据必须是数组格式')
    }

    if (tasks.length === 0) {
      console.warn('⚠️ 写入空数组，这将清空所有任务数据！')
    }

    const jsonContent = JSON.stringify(tasks, null, 2)

    const dir = path.dirname(filePath)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }

    await fs.writeFile(filePath, jsonContent, 'utf-8')
    console.log(`✅ 任务数据写入成功，共 ${tasks.length} 个任务`)
  } catch (error) {
    console.error('❌ 写入任务数据失败:', error)
    throw error
  }
}

/**
 * 验证timeLog数据
 */
function validateTimeLog(timeLog: TimeLogEntry): void {
  if (
    !timeLog.startTime ||
    !timeLog.endTime ||
    typeof timeLog.duration !== 'number'
  ) {
    throw new Error('timeLog数据格式无效')
  }

  if (timeLog.duration <= 0) {
    throw new Error('时间日志持续时间必须大于0')
  }

  try {
    new Date(timeLog.startTime)
    new Date(timeLog.endTime)
  } catch {
    throw new Error('timeLog时间格式无效')
  }
}

// POST - 优化的会话保存端点
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { timeLog }: { timeLog: TimeLogEntry } = body

    console.log(`📝 保存工作会话: ${id}`)

    // 快速验证timeLog数据
    try {
      validateTimeLog(timeLog)
    } catch (error) {
      console.error('❌ timeLog数据无效:', error)
      return NextResponse.json(
        { error: 'timeLog数据格式无效' },
        { status: 400 }
      )
    }

    // 如果会话时间太短，直接返回成功但不保存
    if (timeLog.duration < 3) {
      console.log(`⏱️ 会话时间太短(${timeLog.duration}秒)，跳过保存`)
      return NextResponse.json({
        message: '会话时间太短，已跳过保存',
        sessionDuration: timeLog.duration,
        saved: false,
      })
    }

    // 使用原子性操作保存会话
    const result = await atomicFileOperation(async () => {
      const tasks = await readTasksData()

      if (tasks.length === 0) {
        console.warn('⚠️ 任务数据为空，无法保存会话')
        return {
          message: '任务数据为空，会话数据已忽略',
          sessionDuration: timeLog.duration,
          saved: false,
        }
      }

      const taskIndex = tasks.findIndex((t) => t._id === id)
      if (taskIndex === -1) {
        console.warn(`⚠️ 任务 ${id} 不存在，可能已被删除`)
        return {
          message: '任务不存在，会话数据已忽略',
          sessionDuration: timeLog.duration,
          saved: false,
        }
      }

      const task = tasks[taskIndex]
      console.log(`📋 找到任务: ${task.title}, 类型: ${task.type}`)

      // 只有TodoTask才支持timeLog
      if (task.type !== 'todo') {
        console.warn(`⚠️ 任务类型 ${task.type} 不支持timeLog`)
        return {
          message: '任务类型不支持时间日志',
          sessionDuration: timeLog.duration,
          saved: false,
        }
      }

      const todoTask = task as TodoTask

      // 确保timeLog是数组并添加新条目
      const currentTimeLog = Array.isArray(todoTask.timeLog)
        ? todoTask.timeLog
        : []

      const updatedTask = {
        ...todoTask,
        timeLog: [...currentTimeLog, timeLog],
        status: 'in_progress' as const,
        updatedAt: new Date().toISOString(),
      }

      // 更新任务数组
      tasks[taskIndex] = updatedTask

      // 写入数据
      await writeTasksData(tasks)

      console.log(
        `✅ 会话保存成功: ${timeLog.duration}秒，总会话数: ${updatedTask.timeLog.length}`
      )

      return {
        message: '会话保存成功',
        sessionDuration: timeLog.duration,
        totalSessions: updatedTask.timeLog.length,
        saved: true,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ 保存会话失败:', error)

    const errorMessage = error instanceof Error ? error.message : '未知错误'

    if (errorMessage.includes('读取任务数据失败')) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: '保存会话失败', details: errorMessage },
      { status: 500 }
    )
  }
}
