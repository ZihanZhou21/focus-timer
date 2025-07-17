import { NextRequest, NextResponse } from 'next/server'
import { TodoTask } from '@/lib/types'
import { findTaskById, updateTask } from '@/lib/database'

// POST /api/tasks/[id]/session - 简化版本：只记录今日执行时间
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duration } = body as {
      duration?: number // 执行时间（秒）
    }

    if (!duration || duration <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid duration' },
        { status: 400 }
      )
    }

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

    // 获取今日日期
    const today = new Date().toISOString().split('T')[0]

    // 初始化dailyTimeStats如果不存在
    if (!todoTask.dailyTimeStats) {
      todoTask.dailyTimeStats = {}
    }

    // 直接更新今日执行时间
    if (todoTask.dailyTimeStats[today]) {
      todoTask.dailyTimeStats[today] += duration
    } else {
      todoTask.dailyTimeStats[today] = duration
    }

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
