import { NextRequest, NextResponse } from 'next/server'
import { findTaskById, updateTask, deleteTask } from '@/lib/database'
import { TodoTask } from '@/lib/types'
import {
  formatValidationError,
  taskIdParamSchema,
  updateTaskSchema,
} from '@/lib/api-validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = taskIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: formatValidationError(parsedParams.error) },
        { status: 400 }
      )
    }

    const { id } = parsedParams.data
    const task = await findTaskById(id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('GET task error:', error)
    return NextResponse.json({ error: 'Failed to get task' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = taskIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: formatValidationError(parsedParams.error) },
        { status: 400 }
      )
    }

    const parsedBody = updateTaskSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: formatValidationError(parsedBody.error) },
        { status: 400 }
      )
    }

    const { id } = parsedParams.data
    const updates = parsedBody.data

    // 先获取现有任务
    const existingTask = await findTaskById(id)
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // 特殊处理 completedAt 数组逻辑
    let completedDate: string | null = null

    if (updates.hasOwnProperty('completedAt')) {
      const today = new Date().toISOString().split('T')[0]
      const currentCompletedAt = existingTask.completedAt || []

      if (updates.completedAt === null) {
        // 如果传入null，从数组中移除今天的日期
        updates.completedAt = currentCompletedAt.filter(
          (date: string) => date !== today
        )
      } else if (Array.isArray(updates.completedAt)) {
        // 如果直接传入数组，使用传入的数组
        updates.completedAt = updates.completedAt
      } else if (typeof updates.completedAt === 'string') {
        // 如果传入字符串日期，添加到数组中（不重复）
        const dateToAdd = updates.completedAt
        completedDate = dateToAdd
        if (!currentCompletedAt.includes(dateToAdd)) {
          updates.completedAt = [...currentCompletedAt, dateToAdd]
        } else {
          updates.completedAt = currentCompletedAt
        }
      }
    }

    // timeLog已弃用 - 改用session API直接更新dailyTimeStats

    if (
      existingTask.type === 'todo' &&
      updates.status === 'completed' &&
      completedDate
    ) {
      const todoTask = existingTask as TodoTask
      const currentDailyStats = todoTask.dailyTimeStats || {}
      const existingDuration = currentDailyStats[completedDate] || 0

      if (existingDuration < todoTask.estimatedDuration) {
        updates.dailyTimeStats = {
          ...currentDailyStats,
          [completedDate]: todoTask.estimatedDuration,
        }
      }

      updates.completedCount = {
        ...(existingTask.completedCount || {}),
        [completedDate]:
          ((existingTask.completedCount || {})[completedDate] || 0) + 1,
      }
    }

    const updatedTask = await updateTask(id, updates as Partial<TodoTask>)

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('PUT task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = taskIdParamSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: formatValidationError(parsedParams.error) },
        { status: 400 }
      )
    }

    const { id } = parsedParams.data

    // 先获取任务信息以便返回
    const existingTask = await findTaskById(id)
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const success = await deleteTask(id)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    return NextResponse.json(existingTask)
  } catch (error) {
    console.error('DELETE task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
