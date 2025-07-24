import { NextRequest, NextResponse } from 'next/server'
import { TodoTask } from '@/lib/types'
import { findTaskById } from '@/lib/database'

// 批量获取任务剩余时间
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
            errors.set(taskId, 'Only TODO tasks have remaining time')
            return
          }

          const todoTask = task as TodoTask

          // 计算今日剩余时间
          const todayExecutedSeconds = todoTask.dailyTimeStats?.[today] || 0
          const estimatedSeconds = todoTask.estimatedDuration || 25 * 60

          const remainingSeconds = Math.max(
            0,
            estimatedSeconds - todayExecutedSeconds
          )

          // 转换为分钟，保持精度
          const executedMinutes =
            Math.round((todayExecutedSeconds / 60) * 100) / 100
          const estimatedMinutes =
            Math.round((estimatedSeconds / 60) * 100) / 100
          const remainingMinutes =
            Math.round((remainingSeconds / 60) * 100) / 100

          remainingResults.set(taskId, {
            taskId,
            executedMinutes,
            remainingMinutes,
            estimatedMinutes,
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
        } catch (error) {
          console.error(`Error processing task ${taskId}:`, error)
          errors.set(taskId, 'Internal processing error')
        }
      })
    )

    // 构建响应
    const response = {
      success: Object.fromEntries(remainingResults),
      errors: Object.fromEntries(errors),
      count: {
        requested: taskIds.length,
        successful: remainingResults.size,
        failed: errors.size,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Batch remaining API error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch remaining request' },
      { status: 500 }
    )
  }
}
