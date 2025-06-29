import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Task, TodoTask, TimeLogEntry } from '@/lib/types'

// 文件锁管理
const fileLocks = new Map<string, Promise<void>>()

const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'tasks.json')
}

async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()

    try {
      await fs.access(filePath)
    } catch {
      console.log('任务文件不存在，返回空数组')
      return []
    }

    const fileContent = await fs.readFile(filePath, 'utf-8')

    if (!fileContent.trim()) {
      console.log('任务文件为空，返回空数组')
      return []
    }

    try {
      const tasks = JSON.parse(fileContent)

      if (!Array.isArray(tasks)) {
        console.error('任务数据不是数组格式')
        throw new Error('数据格式异常：不是数组格式')
      }

      console.log(`成功读取 ${tasks.length} 个任务`)
      return tasks
    } catch (parseError) {
      console.error('JSON解析失败:', parseError)
      throw new Error('JSON解析失败')
    }
  } catch (error) {
    console.error('读取任务数据失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`读取任务数据失败: ${errorMessage}`)
  }
}

async function writeTasksData(tasks: Task[]): Promise<void> {
  const filePath = getDataFilePath()

  const existingLock = fileLocks.get(filePath)
  if (existingLock) {
    await existingLock
  }

  const writePromise = writeTasksDataInternal(tasks)
  fileLocks.set(filePath, writePromise)

  try {
    await writePromise
  } finally {
    fileLocks.delete(filePath)
  }
}

async function writeTasksDataInternal(tasks: Task[]): Promise<void> {
  try {
    const filePath = getDataFilePath()

    if (!Array.isArray(tasks)) {
      throw new Error('任务数据必须是数组格式')
    }

    if (tasks.length === 0) {
      console.warn('⚠️  警告：写入空数组，这将清空所有任务数据！')
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
    console.error('写入任务数据失败:', error)
    throw error
  }
}

// POST - 保存工作会话
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      timeLog,
    }: {
      timeLog: TimeLogEntry
    } = body

    console.log(`📝 保存工作会话: ${id}`)
    console.log('会话数据:', timeLog)

    // 验证timeLog数据
    if (!timeLog?.startTime || !timeLog?.endTime || !timeLog?.duration) {
      console.error('无效的timeLog数据:', timeLog)
      return NextResponse.json(
        { error: 'timeLog数据格式无效' },
        { status: 400 }
      )
    }

    // 验证时间逻辑
    if (timeLog.duration <= 0) {
      console.warn('会话时间太短，跳过保存')
      return NextResponse.json({
        message: '会话时间太短，已跳过保存',
      })
    }

    // 读取任务数据
    const tasks = await readTasksData()

    if (tasks.length === 0) {
      console.warn('任务数据为空，无法保存会话')
      return NextResponse.json({ error: '任务数据读取异常' }, { status: 503 })
    }

    // 查找目标任务
    const taskIndex = tasks.findIndex((t) => t._id === id)
    if (taskIndex === -1) {
      console.warn(`任务 ${id} 不存在，可能已被删除`)
      // 对于不存在的任务，返回200但不做操作
      return NextResponse.json({
        message: '任务不存在，会话数据已忽略',
      })
    }

    const task = tasks[taskIndex]
    console.log(`找到任务: ${task.title}, 类型: ${task.type}`)

    // 只有TodoTask才支持timeLog
    if (task.type !== 'todo') {
      console.warn(`任务类型 ${task.type} 不支持timeLog`)
      return NextResponse.json(
        { error: '任务类型不支持时间日志' },
        { status: 400 }
      )
    }

    const todoTask = task as TodoTask

    // 确保timeLog是数组
    const currentTimeLog = Array.isArray(todoTask.timeLog)
      ? todoTask.timeLog
      : []

    // 更新任务
    const now = new Date().toISOString()
    const updatedTask: TodoTask = {
      ...todoTask,
      timeLog: [...currentTimeLog, timeLog],
      status: 'in_progress', // 保存会话时状态为进行中
      updatedAt: now,
    }

    // 更新任务数组
    tasks[taskIndex] = updatedTask

    // 写入数据
    await writeTasksData(tasks)

    console.log(
      `✅ 会话保存成功: ${timeLog.duration}秒，总会话数: ${updatedTask.timeLog.length}`
    )

    return NextResponse.json({
      message: '会话保存成功',
      sessionDuration: timeLog.duration,
      totalSessions: updatedTask.timeLog.length,
    })
  } catch (error) {
    console.error('保存会话失败:', error)

    if (error instanceof Error && error.message.includes('读取任务数据失败')) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: '保存会话失败' }, { status: 500 })
  }
}
