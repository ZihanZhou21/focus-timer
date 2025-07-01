import { NextRequest, NextResponse } from 'next/server'
import { taskScheduler } from '@/lib/scheduler'

// GET - 获取定时任务状态
export async function GET() {
  try {
    const status = taskScheduler.getStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('获取定时任务状态失败:', error)
    return NextResponse.json({ error: '获取定时任务状态失败' }, { status: 500 })
  }
}

// POST - 控制定时任务
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'start':
        taskScheduler.start()
        return NextResponse.json({
          message: '定时任务已启动',
          status: taskScheduler.getStatus(),
        })

      case 'stop':
        taskScheduler.stop()
        return NextResponse.json({
          message: '定时任务已停止',
          status: taskScheduler.getStatus(),
        })

      case 'reset-now':
        await taskScheduler.executeResetNow()
        return NextResponse.json({
          message: '手动重置已执行',
          status: taskScheduler.getStatus(),
        })

      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('控制定时任务失败:', error)
    return NextResponse.json({ error: '控制定时任务失败' }, { status: 500 })
  }
}
