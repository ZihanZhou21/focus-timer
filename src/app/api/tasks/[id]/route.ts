import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask } from '@/lib/types'

// 简单的文件锁机制
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
      // 如果文件不存在，创建空的任务数组
      console.log('任务文件不存在，创建新文件')
      await fs.writeFile(filePath, '[]', 'utf-8')
      return []
    }

    // 读取文件内容
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // 检查文件内容是否为空
    if (!fileContent.trim()) {
      console.log('任务文件为空，初始化为空数组')
      await fs.writeFile(filePath, '[]', 'utf-8')
      return []
    }

    try {
      const tasks = JSON.parse(fileContent)

      // 验证解析出的数据是数组
      if (!Array.isArray(tasks)) {
        console.error('任务数据不是数组格式，但保留原始数据避免丢失')
        // 抛出错误而不是返回空数组，避免后续操作覆盖文件
        throw new Error('数据格式异常：不是数组格式')
      }

      console.log(`成功读取 ${tasks.length} 个任务`)
      return tasks
    } catch (parseError) {
      console.error(
        'JSON解析失败，文件内容:',
        fileContent.substring(0, 200) + '...'
      )
      console.error('解析错误:', parseError)

      // 抛出错误而不是返回空数组，避免后续操作覆盖文件
      console.log('由于解析错误，抛出异常以保护原文件')
      throw new Error('JSON解析失败')
    }
  } catch (error) {
    console.error('读取任务数据失败:', error)
    // 🔥 关键修复：不要在异常时返回空数组！
    // 抛出异常，让调用方处理，避免意外覆盖数据文件
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`读取任务数据失败: ${errorMessage}`)
  }
}

async function writeTasksData(
  tasks: Task[],
  allowEmpty = false
): Promise<void> {
  const filePath = getDataFilePath()

  // 等待之前的写入操作完成
  const existingLock = fileLocks.get(filePath)
  if (existingLock) {
    await existingLock
  }

  // 创建新的写入锁
  const writePromise = writeTasksDataInternal(tasks, allowEmpty)
  fileLocks.set(filePath, writePromise)

  try {
    await writePromise
  } finally {
    // 清除锁
    fileLocks.delete(filePath)
  }
}

async function writeTasksDataInternal(
  tasks: Task[],
  allowEmpty = false
): Promise<void> {
  try {
    const filePath = getDataFilePath()

    // 验证输入数据
    if (!Array.isArray(tasks)) {
      throw new Error('任务数据必须是数组格式')
    }

    // 🔥 关键保护：拒绝写入空数组，除非明确允许
    if (tasks.length === 0 && !allowEmpty) {
      console.warn('⚠️  警告：尝试写入空数组，这可能会清空所有数据！')
      console.warn('如果这是有意的操作，请在代码中明确处理')
      throw new Error('拒绝写入空数组以保护数据')
    }

    const jsonContent = JSON.stringify(tasks, null, 2)

    // 验证JSON格式
    try {
      JSON.parse(jsonContent)
    } catch (error) {
      console.error('要写入的数据JSON格式无效:', error)
      throw new Error('Invalid JSON data')
    }

    // 确保目录存在
    const dir = path.dirname(filePath)
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }

    // 直接写入目标文件
    await fs.writeFile(filePath, jsonContent, 'utf-8')
    console.log(`✅ 任务数据写入成功，共 ${tasks.length} 个任务`)
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw error
  }
}

// GET - 获取单个任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const task = tasks.find((t) => t._id === id)

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('获取任务失败:', error)
    // 如果是读取数据失败，返回适当的错误状态
    if (error instanceof Error && error.message.includes('读取任务数据失败')) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 })
  }
}

// PUT - 更新单个任务
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()

    // 🔥 安全的数据读取：如果读取失败会抛出异常而不是返回空数组
    const tasks = await readTasksData()

    console.log(`PUT请求 - 任务ID: ${id}, 读取到的任务数量: ${tasks.length}`)

    // 这个检查现在主要是为了防止逻辑错误，因为readTasksData失败时会抛出异常
    if (tasks.length === 0) {
      console.warn(`读取到的任务数据为空，拒绝更新以保护数据文件`)
      return NextResponse.json(
        { error: '任务不存在或数据读取异常' },
        { status: 404 }
      )
    }

    const index = tasks.findIndex((t) => t._id === id)
    if (index === -1) {
      console.warn(`任务 ${id} 在 ${tasks.length} 个任务中未找到`)
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    console.log(`找到任务，位置: ${index}, 当前状态: ${tasks[index].status}`)

    // 特殊处理timeLog - 追加而不是覆盖（仅对TodoTask类型）
    if (updates.timeLog && tasks[index].type === 'todo') {
      const todoTask = tasks[index] as TodoTask
      if (Array.isArray(todoTask.timeLog)) {
        // 追加新的timeLog条目
        todoTask.timeLog.push(updates.timeLog)
      } else {
        // 如果原来的timeLog不是数组，初始化为数组
        todoTask.timeLog = [updates.timeLog]
      }
      delete updates.timeLog // 移除updates中的timeLog，避免覆盖
    }

    // 更新任务，保留原有数据
    const originalTask = { ...tasks[index] }
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    console.log(`更新任务: ${originalTask.status} -> ${tasks[index].status}`)

    await writeTasksData(tasks)
    console.log(`任务更新成功，数据已写入文件`)
    return NextResponse.json(tasks[index])
  } catch (error) {
    console.error('更新任务失败:', error)
    // 如果是读取数据失败，返回适当的错误状态
    if (error instanceof Error && error.message.includes('读取任务数据失败')) {
      return NextResponse.json(
        { error: '数据读取异常，请稍后重试' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: '更新任务失败' }, { status: 500 })
  }
}

// DELETE - 删除单个任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await readTasksData()
    const index = tasks.findIndex((t) => t._id === id)

    if (index === -1) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    tasks.splice(index, 1)
    await writeTasksData(tasks, true) // 允许空数组，因为这是合法的删除操作

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除任务失败:', error)
    return NextResponse.json({ error: '删除任务失败' }, { status: 500 })
  }
}
