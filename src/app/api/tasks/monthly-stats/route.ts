import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { Task, TodoTask, CheckInTask } from '@/lib/types'

interface DailyStats {
  date: string
  totalDuration: number // 总执行时间（分钟）
  todoTime: number // TODO任务时间（分钟）
  checkInTime: number // 打卡任务时间（分钟）
  taskCount: number // 任务总数
  completedCount: number // 完成任务数
}

interface MonthlyStatsResponse {
  year: number
  month: number
  dailyStats: DailyStats[]
  summary: {
    totalDuration: number
    totalTasks: number
    totalCompleted: number
    averageDailyTime: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user_001'
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString()
    )
    const month = parseInt(
      searchParams.get('month') || (new Date().getMonth() + 1).toString()
    )

    if (!userId || !year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '请提供有效的 userId, year 和 month 参数' },
        { status: 400 }
      )
    }

    console.log(`获取用户 ${userId} ${year}年${month}月的每日任务执行时间统计`)

    // 读取任务数据
    const dataPath = join(process.cwd(), 'data', 'tasks.json')
    if (!existsSync(dataPath)) {
      console.log('任务数据文件不存在，返回空统计')
      return NextResponse.json({
        year,
        month,
        dailyStats: [],
        summary: {
          totalDuration: 0,
          totalTasks: 0,
          totalCompleted: 0,
          averageDailyTime: 0,
        },
      })
    }

    const fileContent = readFileSync(dataPath, 'utf-8')
    const allTasks: Task[] = JSON.parse(fileContent)

    // 过滤用户任务
    const userTasks = allTasks.filter((task) => task.userId === userId)

    // 生成月份的所有日期
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyStats: DailyStats[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day
        .toString()
        .padStart(2, '0')}`

      // 获取该日期的任务和时间统计
      const dayStats = calculateDayStats(userTasks, dateStr)

      dailyStats.push({
        date: dateStr,
        ...dayStats,
      })
    }

    // 计算总体统计
    const summary = {
      totalDuration: dailyStats.reduce(
        (sum, day) => sum + day.totalDuration,
        0
      ),
      totalTasks: dailyStats.reduce((sum, day) => sum + day.taskCount, 0),
      totalCompleted: dailyStats.reduce(
        (sum, day) => sum + day.completedCount,
        0
      ),
      averageDailyTime: Math.round(
        dailyStats.reduce((sum, day) => sum + day.totalDuration, 0) /
          daysInMonth
      ),
    }

    const response: MonthlyStatsResponse = {
      year,
      month,
      dailyStats,
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('获取月度统计失败:', error)
    return NextResponse.json(
      {
        error: '获取月度统计失败',
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
): Omit<DailyStats, 'date'> {
  let todoTime = 0 // TODO任务执行时间（秒）
  let checkInTime = 0 // 打卡任务执行时间（秒）
  let taskCount = 0 // 该日相关任务总数
  let completedCount = 0 // 该日完成的任务数

  for (const task of tasks) {
    let isRelevantForDay = false
    let dayDuration = 0

    if (task.type === 'todo') {
      const todoTask = task as TodoTask

      // 处理timeLog（可能是数组或单个对象）
      if (todoTask.timeLog) {
        const timeLogs = Array.isArray(todoTask.timeLog)
          ? todoTask.timeLog
          : [todoTask.timeLog]

        for (const timeLog of timeLogs) {
          const logDate = timeLog.startTime.split('T')[0]
          if (logDate === targetDate) {
            dayDuration += timeLog.duration
            isRelevantForDay = true
          }
        }
      }

      // 如果该日期有执行时间，累加到todoTime
      if (dayDuration > 0) {
        todoTime += dayDuration
      }

      // 检查是否在该日期完成了任务
      const completedDate = todoTask.completedAt
        ? todoTask.completedAt.split('T')[0]
        : null
      if (completedDate === targetDate) {
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
          dayDuration += checkIn.duration
          checkInTime += checkIn.duration
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
