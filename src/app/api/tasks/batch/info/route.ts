import { NextRequest, NextResponse } from 'next/server'
import { findTaskById } from '@/lib/database'

// 批量获取任务基本信息（整合progress + remaining + info）
export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (taskIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tasks per batch request' },
        { status: 400 }
      )
    }

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

    // 并行处理所有任务
    await Promise.allSettled(
      taskIds.map(async (taskId: string) => {
        try {
          const task = await findTaskById(taskId)

          if (!task) {
            errors.set(taskId, 'Task not found')
            return
          }

          // 基本任务信息
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

          // 如果是TODO任务，添加时间相关信息
          if (task.type === 'todo') {
            const todoTask = task as import('@/lib/types').TodoTask
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

            const timeInfo = {
              // 进度信息
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
              // 剩余时间信息
              remaining: {
                executedMinutes:
                  Math.round((todayExecutedSeconds / 60) * 100) / 100,
                remainingMinutes:
                  Math.round((remainingSeconds / 60) * 100) / 100,
                estimatedMinutes:
                  Math.round((estimatedSeconds / 60) * 100) / 100,
                executedSeconds: todayExecutedSeconds,
                remainingSeconds,
                estimatedSeconds,
              },
            }

            taskResults.set(taskId, { ...basicInfo, ...timeInfo })
          } else {
            // 非TODO任务只返回基本信息
            taskResults.set(taskId, basicInfo)
          }
        } catch (error) {
          console.error(`Error processing task ${taskId}:`, error)
          errors.set(taskId, 'Internal processing error')
        }
      })
    )

    const response = {
      success: Object.fromEntries(taskResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: taskResults.size,
        failed: errors.size,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Batch info API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch info request' },
      { status: 500 }
    )
  }
}
