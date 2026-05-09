import { NextRequest, NextResponse } from 'next/server'
import { TodoTask } from '@/lib/types'
import { findTasksByIds } from '@/lib/database'
import {
  batchTaskIdsSchema,
  formatValidationError,
} from '@/lib/api-validation'

export async function POST(request: NextRequest) {
  try {
    const parsed = batchTaskIdsSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatValidationError(parsed.error) },
        { status: 400 }
      )
    }

    const { taskIds } = parsed.data

    const today = new Date().toISOString().split('T')[0]
    interface RemainingResult {
      taskId: string
      executedMinutes: number
      remainingMinutes: number
      estimatedMinutes: number
      executedSeconds: number
      remainingSeconds: number
      estimatedSeconds: number
      progressPercentage: number
      isCompleted: boolean
      todayOnly: boolean
    }

    const remainingResults = new Map<string, RemainingResult>()
    const errors = new Map<string, string>()
    const uniqueTaskIds = Array.from(new Set(taskIds as string[]))
    const tasks = await findTasksByIds(uniqueTaskIds)
    const tasksById = new Map(tasks.map((task) => [task._id, task]))

    for (const taskId of uniqueTaskIds) {
      const task = tasksById.get(taskId)

      if (!task) {
        errors.set(taskId, 'Task not found')
        continue
      }

      if (task.type !== 'todo') {
        errors.set(taskId, 'Only TODO tasks have remaining time')
        continue
      }

      const todoTask = task as TodoTask
      const todayExecutedSeconds = todoTask.dailyTimeStats?.[today] || 0
      const estimatedSeconds = todoTask.estimatedDuration || 25 * 60
      const remainingSeconds = Math.max(
        0,
        estimatedSeconds - todayExecutedSeconds
      )

      remainingResults.set(taskId, {
        taskId,
        executedMinutes: Math.round((todayExecutedSeconds / 60) * 100) / 100,
        remainingMinutes: Math.round((remainingSeconds / 60) * 100) / 100,
        estimatedMinutes: Math.round((estimatedSeconds / 60) * 100) / 100,
        executedSeconds: todayExecutedSeconds,
        remainingSeconds,
        estimatedSeconds,
        progressPercentage: Math.min(
          100,
          Math.round((todayExecutedSeconds / estimatedSeconds) * 100)
        ),
        isCompleted: task.status === 'completed',
        todayOnly: true,
      })
    }

    return NextResponse.json({
      success: Object.fromEntries(remainingResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: remainingResults.size,
        failed: errors.size,
      },
    })
  } catch (error) {
    console.error('Batch remaining API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch remaining request' },
      { status: 500 }
    )
  }
}
