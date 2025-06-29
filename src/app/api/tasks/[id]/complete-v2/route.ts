import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { Task, TodoTask, TimeLogEntry } from '@/lib/types'

// 简化的文件锁管理
const pendingOperations = new Map<string, Promise<void>>()

const getDataFilePath = () => path.join(process.cwd(), 'data', 'tasks.json')

/**
 * 原子性文件操作 - 确保同一时间只有一个操作在修改文件
 */
async function atomicFileOperation<T>(operation: () => Promise<T>): Promise<T> {
  const filePath = getDataFilePath()

  // 等待之前的操作完成
  const existing = pendingOperations.get(filePath)
  if (existing) {
    await existing
  }

  // 创建新的操作Promise
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
    // 清理已完成的操作
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

    // 确保目录存在
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

  // 验证时间格式
  try {
    new Date(timeLog.startTime)
    new Date(timeLog.endTime)
  } catch {
    throw new Error('timeLog时间格式无效')
  }
}

// POST - 优化的任务完成端点
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { finalTimeLog }: { finalTimeLog?: TimeLogEntry } = body

    console.log(`🎯 开始完成任务: ${id}`)

    // 使用原子性操作完成任务
    const result = await atomicFileOperation(async () => {
      // 读取当前任务数据
      const tasks = await readTasksData()

      if (tasks.length === 0) {
        throw new Error('任务数据为空')
      }

      // 查找目标任务
      const taskIndex = tasks.findIndex((t) => t._id === id)
      if (taskIndex === -1) {
        throw new Error(`任务 ${id} 不存在`)
      }

      const task = tasks[taskIndex]
      console.log(`📋 找到任务: ${task.title}, 当前状态: ${task.status}`)

      // 检查任务状态
      if (task.status === 'completed') {
        console.log('✅ 任务已经完成，返回现有数据')
        return task
      }

      // 准备基础更新数据
      const now = new Date().toISOString()
      const baseUpdate = {
        status: 'completed' as const,
        completedAt: now,
        updatedAt: now,
      }

      let updatedTask: Task

      // 处理TodoTask的timeLog
      if (task.type === 'todo' && finalTimeLog) {
        const todoTask = task as TodoTask

        try {
          // 验证最终timeLog
          validateTimeLog(finalTimeLog)

          // 确保timeLog是数组
          const currentTimeLog = Array.isArray(todoTask.timeLog)
            ? todoTask.timeLog
            : []

          // 创建更新后的TodoTask
          updatedTask = {
            ...todoTask,
            ...baseUpdate,
            timeLog: [...currentTimeLog, finalTimeLog],
          } as TodoTask

          console.log(
            `📝 添加最终timeLog: ${finalTimeLog.duration}秒，总条目数: ${
              (updatedTask as TodoTask).timeLog.length
            }`
          )
        } catch (timeLogError) {
          console.warn(`⚠️ 最终timeLog无效，跳过添加: ${timeLogError}`)
          // timeLog无效时，仍然完成任务但不添加timeLog
          updatedTask = {
            ...todoTask,
            ...baseUpdate,
          } as TodoTask
        }
      } else {
        // 非TodoTask或没有finalTimeLog
        updatedTask = {
          ...task,
          ...baseUpdate,
        }
      }

      // 更新任务数组
      tasks[taskIndex] = updatedTask

      // 写入数据
      await writeTasksData(tasks)

      console.log(`🎉 任务完成成功: ${updatedTask.title}`)
      return updatedTask
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ 完成任务失败:', error)

    const errorMessage = error instanceof Error ? error.message : '未知错误'

    // 根据错误类型返回不同状态码
    if (errorMessage.includes('不存在')) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    if (
      errorMessage.includes('读取任务数据失败') ||
      errorMessage.includes('任务数据为空')
    ) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: '完成任务失败', details: errorMessage },
      { status: 500 }
    )
  }
}
