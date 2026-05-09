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
    interface TaskResult {
      _id: string
      title: string
      status: string
      type: string
      priority: string
      tags: string[]
      createdAt: string
      updatedAt: string
      progress?: {
        totalExecutedTime: number
        estimatedDuration: number
        progressPercentage: number
        isCompleted: boolean
        todayProgress: {
          date: string
          duration: number
          minutes: number
        }
      }
      remaining?: {
        executedMinutes: number
        remainingMinutes: number
        estimatedMinutes: number
        executedSeconds: number
        remainingSeconds: number
        estimatedSeconds: number
      }
    }

    const taskResults = new Map<string, TaskResult>()
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

      const basicInfo = {
        _id: task._id,
        title: task.title,
        status: task.status,
        type: task.type,
        priority: task.priority,
        tags: task.tags,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }

      if (task.type !== 'todo') {
        taskResults.set(taskId, basicInfo)
        continue
      }

      const todoTask = task as TodoTask
      const todayExecutedSeconds = todoTask.dailyTimeStats?.[today] || 0
      const estimatedSeconds = todoTask.estimatedDuration || 25 * 60
      const remainingSeconds = Math.max(
        0,
        estimatedSeconds - todayExecutedSeconds
      )
      const progressPercentage = Math.min(
        100,
        Math.round((todayExecutedSeconds / estimatedSeconds) * 100)
      )

      taskResults.set(taskId, {
        ...basicInfo,
        progress: {
          totalExecutedTime: todayExecutedSeconds,
          estimatedDuration: estimatedSeconds,
          progressPercentage,
          isCompleted: task.status === 'completed',
          todayProgress: {
            date: today,
            duration: todayExecutedSeconds,
            minutes: Math.round(todayExecutedSeconds / 60),
          },
        },
        remaining: {
          executedMinutes: Math.round((todayExecutedSeconds / 60) * 100) / 100,
          remainingMinutes: Math.round((remainingSeconds / 60) * 100) / 100,
          estimatedMinutes: Math.round((estimatedSeconds / 60) * 100) / 100,
          executedSeconds: todayExecutedSeconds,
          remainingSeconds,
          estimatedSeconds,
        },
      })
    }

    return NextResponse.json({
      success: Object.fromEntries(taskResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: taskResults.size,
        failed: errors.size,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Batch info API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch info request' },
      { status: 500 }
    )
  }
}
