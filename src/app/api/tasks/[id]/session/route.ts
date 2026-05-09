import { NextRequest, NextResponse } from 'next/server'
import { findTaskById, updateTask } from '@/lib/database'
import {
  formatValidationError,
  taskIdParamSchema,
  taskSessionSchema,
} from '@/lib/api-validation'
import { TodoTask } from '@/lib/types'

export async function POST(
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

    const parsedBody = taskSessionSchema.safeParse(await request.json())
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: formatValidationError(parsedBody.error) },
        { status: 400 }
      )
    }

    const { id } = parsedParams.data
    const { duration } = parsedBody.data
    const task = await findTaskById(id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.type !== 'todo') {
      return NextResponse.json(
        { error: 'Only TODO tasks support session logging' },
        { status: 400 }
      )
    }

    const todoTask = task as TodoTask
    const today = new Date().toISOString().split('T')[0]

    if (!todoTask.dailyTimeStats) {
      todoTask.dailyTimeStats = {}
    }

    todoTask.dailyTimeStats[today] =
      (todoTask.dailyTimeStats[today] || 0) + duration
    todoTask.updatedAt = new Date().toISOString()

    await updateTask(id, todoTask)

    return NextResponse.json({
      saved: true,
      todayTime: todoTask.dailyTimeStats[today],
      message: `Added ${Math.round(duration / 60)} minutes to today's time`,
    })
  } catch (error) {
    console.error('POST session error:', error)
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    )
  }
}
