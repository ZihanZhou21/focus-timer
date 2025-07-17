import { NextRequest, NextResponse } from 'next/server'
import { Task } from '@/lib/types'
import { findUserTasks, insertTask, bulkUpdateTasks } from '@/lib/database'

// 获取用户任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'

    const userTasks = await findUserTasks(userId)

    return NextResponse.json(userTasks)
  } catch (error) {
    console.error('获取任务失败:', error)
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 })
  }
}

// 创建新任务
export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json()

    const newTask: Task = {
      _id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: taskData.userId || 'user_001',
      type: taskData.type,
      title: taskData.title,
      content: taskData.content || [],
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: taskData.completedAt || [],
      plannedTime: taskData.plannedTime || null,
      ...taskData,
    }

    const id = await insertTask(newTask)

    return NextResponse.json({ id })
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 })
  }
}

// PUT - 批量更新任务
export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json()

    // 批量更新
    const updateOps = updates.map(
      (update: Partial<Task> & { _id: string }) => ({
        _id: update._id,
        updates: update,
      })
    )

    const success = await bulkUpdateTasks(updateOps)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: '批量更新任务失败' }, { status: 500 })
    }
  } catch (error) {
    console.error('批量更新任务失败:', error)
    return NextResponse.json({ error: '批量更新任务失败' }, { status: 500 })
  }
}
