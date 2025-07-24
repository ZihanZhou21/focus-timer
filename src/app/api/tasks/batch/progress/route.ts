import { NextRequest, NextResponse } from 'next/server'
import { TodoTask } from '@/lib/types'
import { findTaskById } from '@/lib/database'

// 批量获取任务进度
export async function POST(request: NextRequest) {
  try {
    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // 限制批量大小，防止过载
    if (taskIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tasks per batch request' },
        { status: 400 }
      )
    }

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

    // 并行处理所有任务
    await Promise.allSettled(
      taskIds.map(async (taskId: string) => {
        try {
          const task = await findTaskById(taskId)

          if (!task) {
            errors.set(taskId, 'Task not found')
            return
          }

          if (task.type !== 'todo') {
            errors.set(taskId, 'Only TODO tasks have progress')
            return
          }

          const todoTask = task as TodoTask

          // 计算今日进度
          const todayExecutedTime = todoTask.dailyTimeStats?.[today] || 0
          const estimatedDuration = todoTask.estimatedDuration || 25 * 60

          const progressPercentage = Math.min(
            100,
            Math.round((todayExecutedTime / estimatedDuration) * 100)
          )

          const todayProgress = {
            date: today,
            duration: todayExecutedTime,
            minutes: Math.round(todayExecutedTime / 60),
          }

          progressResults.set(taskId, {
            taskId,
            totalExecutedTime: todayExecutedTime,
            estimatedDuration,
            progressPercentage,
            isCompleted: task.status === 'completed',
            todayProgress,
            todayOnly: true,
          })
        } catch (error) {
          console.error(`Error processing task ${taskId}:`, error)
          errors.set(taskId, 'Internal processing error')
        }
      })
    )

    // 构建响应
    const response = {
      success: Object.fromEntries(progressResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: progressResults.size,
        failed: errors.size,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Batch progress API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch progress request' },
      { status: 500 }
    )
  }
}
