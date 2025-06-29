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

    // 检查文件是否存在
    try {
      await fs.access(filePath)
    } catch {
      console.log('任务文件不存在，返回空数组')
      return []
    }

    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // 检查文件内容是否为空
    if (!fileContent.trim()) {
      console.log('任务文件为空，返回空数组')
      return []
    }

    try {
      const tasks = JSON.parse(fileContent)

      // 验证解析出的数据是数组
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

  // 等待之前的写入操作完成
  const existingLock = fileLocks.get(filePath)
  if (existingLock) {
    await existingLock
  }

  // 创建新的写入锁
  const writePromise = writeTasksDataInternal(tasks)
  fileLocks.set(filePath, writePromise)

  try {
    await writePromise
  } finally {
    // 清除锁
    fileLocks.delete(filePath)
  }
}

async function writeTasksDataInternal(tasks: Task[]): Promise<void> {
  try {
    const filePath = getDataFilePath()

    // 验证输入数据
    if (!Array.isArray(tasks)) {
      throw new Error('任务数据必须是数组格式')
    }

    // 数据安全检查
    if (tasks.length === 0) {
      console.warn('⚠️  警告：写入空数组，这将清空所有任务数据！')
    }

    const jsonContent = JSON.stringify(tasks, null, 2)

    // 确保目录存在
    const dir = path.dirname(filePath)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }

    // 写入文件
    await fs.writeFile(filePath, jsonContent, 'utf-8')
    console.log(`✅ 任务数据写入成功，共 ${tasks.length} 个任务`)
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw error
  }
}

// POST - 完成任务的专用端点
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 可选的最终时间日志条目
    const { finalTimeLog }: { finalTimeLog?: TimeLogEntry } = body

    console.log(`🎯 开始完成任务: ${id}`)
    console.log('接收到的数据:', { finalTimeLog })

    // 读取任务数据
    const tasks = await readTasksData()

    if (tasks.length === 0) {
      console.warn('任务数据为空，无法完成任务')
      return NextResponse.json({ error: '任务数据读取异常' }, { status: 503 })
    }

    // 查找目标任务
    const taskIndex = tasks.findIndex((t) => t._id === id)
    if (taskIndex === -1) {
      console.warn(`任务 ${id} 不存在`)
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const task = tasks[taskIndex]
    console.log(`找到任务: ${task.title}, 当前状态: ${task.status}`)

    // 检查任务状态
    if (task.status === 'completed') {
      console.log('任务已经完成，无需重复操作')
      return NextResponse.json(task)
    }

    // 准备更新数据
    const now = new Date().toISOString()
    const updatedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: now,
      updatedAt: now,
    }

    // 如果是TodoTask且提供了最终时间日志，追加到timeLog
    if (finalTimeLog && task.type === 'todo') {
      const todoTask = task as TodoTask

      // 验证timeLog数据
      if (
        !finalTimeLog.startTime ||
        !finalTimeLog.endTime ||
        !finalTimeLog.duration
      ) {
        console.error('无效的timeLog数据:', finalTimeLog)
        return NextResponse.json(
          { error: 'timeLog数据格式无效' },
          { status: 400 }
        )
      }

      // 确保timeLog是数组
      const currentTimeLog = Array.isArray(todoTask.timeLog)
        ? todoTask.timeLog
        : []

      // 添加最终的时间日志条目
      const updatedTodoTask = updatedTask as TodoTask
      updatedTodoTask.timeLog = [...currentTimeLog, finalTimeLog]

      console.log(
        `添加最终timeLog条目，总条目数: ${updatedTodoTask.timeLog.length}`
      )
      console.log('最终timeLog条目:', finalTimeLog)
    }

    // 更新任务数组
    tasks[taskIndex] = updatedTask

    // 写入数据
    await writeTasksData(tasks)

    console.log(`✅ 任务完成成功: ${updatedTask.title}`)

    // 返回更新后的任务
    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('完成任务失败:', error)

    // 根据错误类型返回不同状态码
    if (error instanceof Error && error.message.includes('读取任务数据失败')) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: '完成任务失败' }, { status: 500 })
  }
}
