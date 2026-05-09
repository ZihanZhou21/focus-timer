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
    interface ProgressResult {
      taskId: string
      totalExecutedTime: number
      estimatedDuration: number
      progressPercentage: number
      isCompleted: boolean
      todayProgress: {
        date: string
        duration: number
        minutes: number
      }
      todayOnly: boolean
    }

    const progressResults = new Map<string, ProgressResult>()
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
        errors.set(taskId, 'Only TODO tasks have progress')
        continue
      }

      const todoTask = task as TodoTask
      const todayExecutedTime = todoTask.dailyTimeStats?.[today] || 0
      const estimatedDuration = todoTask.estimatedDuration || 25 * 60
      const progressPercentage = Math.min(
        100,
        Math.round((todayExecutedTime / estimatedDuration) * 100)
      )

      progressResults.set(taskId, {
        taskId,
        totalExecutedTime: todayExecutedTime,
        estimatedDuration,
        progressPercentage,
        isCompleted: task.status === 'completed',
        todayProgress: {
          date: today,
          duration: todayExecutedTime,
          minutes: Math.round(todayExecutedTime / 60),
        },
        todayOnly: true,
      })
    }

    return NextResponse.json({
      success: Object.fromEntries(progressResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: progressResults.size,
        failed: errors.size,
      },
    })
  } catch (error) {
    console.error('Batch progress API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch progress request' },
      { status: 500 }
    )
  }
}
