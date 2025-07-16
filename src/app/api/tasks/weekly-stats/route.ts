import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Task, TodoTask, CheckInTask } from '@/lib/types'

interface DayStats {
  date: string
  dayLabel: string // MM/DD格式显示
  totalDuration: number // 总执行时间（分钟）
  todoTime: number // TODO任务时间（分钟）
  checkInTime: number // 打卡任务时间（分钟）
  taskCount: number // 任务总数
  completedCount: number // 完成任务数
  isToday: boolean // 是否今天
}

interface WeeklyStatsResponse {
  startDate: string
  endDate: string
  dailyStats: DayStats[]
  summary: {
    totalDuration: number
    totalCompleted: number
    averageDailyTime: number
    mostProductiveDay: string | null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const days = parseInt(searchParams.get('days') || '7') // 默认7天
    const endDateParam = searchParams.get('endDate') // 可选的结束日期

    if (!userId || days < 1 || days > 30) {
      return NextResponse.json(
        { error: '请提供有效的 userId 和 days 参数 (1-30)' },
        { status: 400 }
      )
    }

    // 计算日期范围
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - (days - 1))

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    console.log(`获取用户 ${userId} 过去${days}天的任务执行时间统计`)

    // 读取任务数据
    const dataPath = join(process.cwd(), 'data', 'tasks.json')
    if (!existsSync(dataPath)) {
      console.log('任务数据文件不存在，返回空统计')
      return NextResponse.json({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dailyStats: [],
        summary: {
          totalDuration: 0,
          totalCompleted: 0,
          averageDailyTime: 0,
          mostProductiveDay: null,
        },
      })
    }

    const fileContent = readFileSync(dataPath, 'utf-8')
    const allTasks: Task[] = JSON.parse(fileContent)

    // 过滤用户任务
    const userTasks = allTasks.filter((task) => task.userId === userId)

    // 生成每日统计
    const dailyStats: DayStats[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const month = currentDate.getMonth() + 1
      const day = currentDate.getDate()
      const dayLabel = `${month}/${day}`
      const isToday = dateStr === todayStr

      // 计算当日统计
      const dayStatsData = calculateDayStats(userTasks, dateStr)

      dailyStats.push({
        date: dateStr,
        dayLabel,
        isToday,
        ...dayStatsData,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 计算总体统计
    const totalDuration = dailyStats.reduce(
      (sum, day) => sum + day.totalDuration,
      0
    )
    const totalCompleted = dailyStats.reduce(
      (sum, day) => sum + day.completedCount,
      0
    )
    const averageDailyTime = days > 0 ? Math.round(totalDuration / days) : 0

    // 找到最高产的一天
    const mostProductiveDay =
      dailyStats.reduce(
        (max, day) =>
          day.totalDuration > (max?.totalDuration || 0) ? day : max,
        null as DayStats | null
      )?.dayLabel || null

    const response: WeeklyStatsResponse = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dailyStats,
      summary: {
        totalDuration,
        totalCompleted,
        averageDailyTime,
        mostProductiveDay,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取周度统计失败:', error)
    return NextResponse.json(
      {
        error: '获取周度统计失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// 计算单日统计
function calculateDayStats(
  tasks: Task[],
  targetDate: string
): Omit<DayStats, 'date' | 'dayLabel' | 'isToday'> {
  let todoTime = 0 // TODO任务执行时间（秒）
  const checkInTime = 0 // 打卡任务执行时间（秒）
  let taskCount = 0 // 该日相关任务总数
  let completedCount = 0 // 该日完成的任务数

  for (const task of tasks) {
    let isRelevantForDay = false
    let dayDuration = 0

    if (task.type === 'todo') {
      const todoTask = task as TodoTask

      // 简化版本：直接使用dailyTimeStats
      dayDuration = todoTask.dailyTimeStats?.[targetDate] || 0
      if (dayDuration > 0) {
        isRelevantForDay = true
      }

      // 如果该日期有执行时间，累加到todoTime
      if (dayDuration > 0) {
        todoTime += dayDuration
      }

      // 检查是否在该日期完成了任务
      // completedAt 现在是日期数组
      if (
        Array.isArray(todoTask.completedAt) &&
        todoTask.completedAt.includes(targetDate)
      ) {
        completedCount++
        if (!isRelevantForDay) {
          isRelevantForDay = true
        }
      }

      // 检查是否是该日期应该关注的任务（到期日期）
      const dueDate = todoTask.dueDate ? todoTask.dueDate.split('T')[0] : null
      if (dueDate === targetDate && !isRelevantForDay) {
        isRelevantForDay = true
      }
    } else if (task.type === 'check-in') {
      const checkInTask = task as CheckInTask

      // 检查打卡历史中是否有该日期的记录
      for (const checkIn of checkInTask.checkInHistory) {
        if (checkIn.date === targetDate) {
          isRelevantForDay = true
          // duration字段已删除，check-in任务不再计算时间
          completedCount++
          break
        }
      }

      // 或者检查是否是该日期应该执行的重复任务
      if (!isRelevantForDay) {
        const targetDateObj = new Date(targetDate)
        const dayOfWeek = targetDateObj.getDay()

        if (
          checkInTask.recurrence.frequency === 'daily' ||
          (checkInTask.recurrence.frequency === 'weekly' &&
            checkInTask.recurrence.daysOfWeek.includes(dayOfWeek))
        ) {
          isRelevantForDay = true
        }
      }
    }

    if (isRelevantForDay) {
      taskCount++
    }
  }

  return {
    totalDuration: Math.round((todoTime + checkInTime) / 60), // 转换为分钟
    todoTime: Math.round(todoTime / 60),
    checkInTime: Math.round(checkInTime / 60),
    taskCount,
    completedCount,
  }
}
