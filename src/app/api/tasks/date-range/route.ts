import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Task } from '@/lib/types'
import { dataUtils, mapTaskToProjectItem } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') // 'project-items' | 'tasks'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '缺少startDate或endDate参数' },
        { status: 400 }
      )
    }

    console.log(`获取日期范围数据: ${startDate} - ${endDate}, 用户: ${userId}`)

    const dataPath = join(process.cwd(), 'data', 'tasks.json')

    if (!existsSync(dataPath)) {
      console.log('任务数据文件不存在，返回空数据')
      return NextResponse.json({})
    }

    const fileContent = readFileSync(dataPath, 'utf-8')
    const allTasks: Task[] = JSON.parse(fileContent)

    // 生成日期范围
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dateRange: string[] = []

    const current = new Date(start)
    while (current <= end) {
      dateRange.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    // 按日期分组任务
    const result: { [date: string]: any[] } = {}

    for (const date of dateRange) {
      const dayTasks = dataUtils.getTasksForDate(allTasks, date)

      if (format === 'project-items') {
        result[date] = dayTasks.map((task) => mapTaskToProjectItem(task, date))
      } else {
        result[date] = dayTasks
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取日期范围数据失败:', error)
    return NextResponse.json({ error: '获取日期范围数据失败' }, { status: 500 })
  }
}
