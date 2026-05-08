import { NextRequest, NextResponse } from 'next/server'
import { TodoTask } from '@/lib/types'
import { findTaskById, updateTask } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { duration } = body as { duration?: number }

    const task = await findTaskById(id)

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 更新任务状态
    const today = new Date().toISOString().split('T')[0] // 今天的日期
    const currentCompletedAt = task.completedAt || []

    // 允许同一天多次完成
    const updatedCompletedAt = [...currentCompletedAt, today]

    // 更新完成次数
    const currentCompletedCount = task.completedCount || {}
    const newCount = (currentCompletedCount[today] || 0) + 1
    const updatedCompletedCount = {
      ...currentCompletedCount,
      [today]: newCount,
    }

    // 更新基础任务信息
    const updatedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: updatedCompletedAt,
      completedCount: updatedCompletedCount,
      updatedAt: new Date().toISOString(),
    }

    // 如果是TODO任务且有时长数据，更新dailyTimeStats
    if (task.type === 'todo' && duration && duration > 0) {
      const todoTask = updatedTask as TodoTask

      // 初始化dailyTimeStats如果不存在
      if (!todoTask.dailyTimeStats) {
        todoTask.dailyTimeStats = {}
      }

      // 更新今日时间统计
      if (todoTask.dailyTimeStats[today]) {
        todoTask.dailyTimeStats[today] += duration
      } else {
        todoTask.dailyTimeStats[today] = duration
      }

      console.log(
        `📊 Updated dailyTimeStats for ${id}: added ${duration}s to ${today}, total: ${todoTask.dailyTimeStats[today]}s`
      )
    }

    await updateTask(id, updatedTask)

    return NextResponse.json({
      message: '任务已完成',
      task: updatedTask,
      durationAdded: duration || 0,
      todayTotal:
        task.type === 'todo' && (updatedTask as TodoTask).dailyTimeStats
          ? (updatedTask as TodoTask).dailyTimeStats[today] || 0
          : 0,
    })
  } catch (error) {
    console.error('完成任务失败:', error)
    return NextResponse.json({ error: '完成任务失败' }, { status: 500 })
  }
}
