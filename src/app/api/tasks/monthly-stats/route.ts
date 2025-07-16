import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Task, TodoTask } from '@/lib/types'

// 日常统计数据接口
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

// 获取数据文件路径
const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'tasks.json')
}

// 读取任务数据
async function readTasksData(): Promise<Task[]> {
  try {
    const filePath = getDataFilePath()

    try {
      await fs.access(filePath)
    } catch {
      console.log('任务数据文件不存在，返回空数组')
      return []
    }

    const fileContent = await fs.readFile(filePath, 'utf-8')
    if (!fileContent.trim()) {
      console.log('任务数据文件为空，返回空数组')
      return []
    }

    const tasks = JSON.parse(fileContent)
    return Array.isArray(tasks) ? tasks : []
  } catch (error) {
    console.error('读取任务数据失败:', error)
    return []
  }
}

// 获取本地日期字符串 (YYYY-MM-DD)
function getLocalDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 计算TODO任务的执行时间
// 简化版本：直接使用dailyTimeStats
function calculateTodoExecutionTime(
  task: TodoTask,
  targetDate: string
): number {
  return task.dailyTimeStats?.[targetDate] || 0
}

// 检查任务是否在指定日期完成
function isTaskCompletedOnDate(task: Task, targetDate: string): boolean {
  if (!task.completedAt || !Array.isArray(task.completedAt)) {
    return false
  }

  // completedAt 现在是日期数组，检查目标日期是否在数组中
  return task.completedAt.includes(targetDate)
}

// 获取月度统计数据
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
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!userId || !year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '请提供有效的 userId、year 和 month 参数' },
        { status: 400 }
      )
    }

    console.log(`获取用户 ${userId} ${year}年${month}月的月度统计`)

    // 计算日期范围：支持自定义开始和结束日期（用于日历网格）
    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      // 使用自定义日期范围（用于日历网格）
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
      console.log(`使用自定义日期范围: ${startDateParam} 到 ${endDateParam}`)
    } else {
      // 使用默认月份范围
      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0) // 当月最后一天
    }

    // 读取任务数据
    const allTasks = await readTasksData()

    // 过滤用户任务
    const userTasks = allTasks.filter((task) => task.userId === userId)
    console.log(`用户 ${userId} 共有 ${userTasks.length} 个任务`)

    // 生成每日统计
    const dailyStats: DailyStats[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = getLocalDateString(currentDate)

      // 初始化当日统计
      let totalDuration = 0
      let todoTime = 0
      const checkInTime = 0
      let taskCount = 0
      let completedCount = 0

      // 遍历用户任务，计算当天的统计数据
      for (const task of userTasks) {
        // 检查任务是否在当天完成
        if (isTaskCompletedOnDate(task, dateStr)) {
          completedCount++
        }

        if (task.type === 'todo') {
          // TODO任务：计算执行时间
          const executionTime = calculateTodoExecutionTime(
            task as TodoTask,
            dateStr
          )
          if (executionTime > 0) {
            const minutes = Math.round(executionTime / 60)
            todoTime += minutes
            totalDuration += minutes
            taskCount++
          }
        } else if (task.type === 'check-in') {
          // 打卡任务：如果在当天完成，不计算时间
          if (isTaskCompletedOnDate(task, dateStr)) {
            taskCount++
          }
        }
      }

      dailyStats.push({
        date: dateStr,
        totalDuration,
        todoTime,
        checkInTime,
        taskCount,
        completedCount,
      })

      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 计算月度汇总
    const totalDuration = dailyStats.reduce(
      (sum, day) => sum + day.totalDuration,
      0
    )
    const totalTasks = dailyStats.reduce((sum, day) => sum + day.taskCount, 0)
    const totalCompleted = dailyStats.reduce(
      (sum, day) => sum + day.completedCount,
      0
    )
    const averageDailyTime = Math.round(totalDuration / dailyStats.length)

    const response: MonthlyStatsResponse = {
      year,
      month,
      dailyStats,
      summary: {
        totalDuration,
        totalTasks,
        totalCompleted,
        averageDailyTime,
      },
    }

    console.log(
      `月度统计完成: ${totalDuration}分钟总时长, ${totalCompleted}个完成任务`
    )
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
