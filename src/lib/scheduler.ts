// 定时任务服务 - 每日凌晨重置任务进度
import * as cron from 'node-cron'

class TaskScheduler {
  private isRunning = false
  private resetTask: cron.ScheduledTask | null = null

  // 启动定时任务
  start() {
    if (this.isRunning) {
      console.log('🕒 定时任务已在运行中')
      return
    }

    // 每日凌晨00:05执行重置（避免00:00的高峰）
    this.resetTask = cron.schedule(
      '5 0 * * *',
      async () => {
        console.log('🌅 定时任务触发 - 开始每日重置')
        await this.executeDailyReset()
      },
      {
        scheduled: false, // 不立即启动，等待手动启动
        timezone: 'Asia/Shanghai', // 使用中国时区
      }
    )

    this.resetTask.start()
    this.isRunning = true

    console.log('⏰ 每日重置定时任务已启动 (每日00:05执行)')
  }

  // 停止定时任务
  stop() {
    if (this.resetTask) {
      this.resetTask.stop()
      this.resetTask = null
    }
    this.isRunning = false
    console.log('⏸️ 每日重置定时任务已停止')
  }

  // 手动执行重置（用于测试）
  async executeResetNow() {
    console.log('🔧 手动触发每日重置')
    await this.executeDailyReset()
  }

  // 执行每日重置
  private async executeDailyReset() {
    try {
      // 直接调用重置API逻辑，避免HTTP请求循环
      const { promises: fs } = await import('fs')
      const path = await import('path')

      const getDataFilePath = () => {
        return path.join(process.cwd(), 'data', 'tasks.json')
      }

      // 读取任务数据
      const filePath = getDataFilePath()
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const tasks = JSON.parse(fileContent)

      if (tasks.length === 0) {
        console.log('没有任务需要重置')
        return
      }

      let resetCount = 0
      const now = new Date().toISOString()

      // 重置每个任务
      const resetTasks = tasks.map((task: any) => {
        let needsReset = false
        const resetTask = { ...task }

        if (task.type === 'check-in') {
          // 重置打卡任务
          if (task.status === 'completed') {
            resetTask.status = 'pending'
            resetTask.completedAt = null
            resetTask.updatedAt = now
            needsReset = true
            console.log(`🔄 重置打卡任务: ${task.title}`)
          }
        } else if (task.type === 'todo') {
          // 重置TODO任务
          if (
            task.status === 'completed' ||
            (task.timeLog && task.timeLog.length > 0)
          ) {
            resetTask.status = 'pending'
            resetTask.completedAt = null
            resetTask.updatedAt = now
            // 清空时间日志，重置进度
            resetTask.timeLog = []
            needsReset = true
            console.log(
              `🔄 重置TODO任务: ${task.title} (清空了 ${
                task.timeLog?.length || 0
              } 条时间记录)`
            )
          }
        }

        if (needsReset) {
          resetCount++
        }

        return resetTask
      })

      // 写入重置后的数据
      await fs.writeFile(filePath, JSON.stringify(resetTasks, null, 2), 'utf-8')

      console.log(`✅ 定时重置完成，共重置了 ${resetCount} 个任务`)
    } catch (error) {
      console.error('❌ 定时重置出错:', error)
    }
  }

  // 获取任务状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.resetTask?.nextDate()?.toISOString() || null,
    }
  }
}

// 创建单例实例
export const taskScheduler = new TaskScheduler()

// 在应用启动时自动启动定时任务
if (typeof window === 'undefined') {
  // 只在服务端环境启动
  taskScheduler.start()
}
