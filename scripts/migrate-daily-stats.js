#!/usr/bin/env node

/**
 * 数据迁移脚本：为现有TODO任务生成dailyTimeStats
 * 
 * 使用方法：
 * node scripts/migrate-daily-stats.js
 */

const fs = require('fs')
const path = require('path')

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'tasks.json')

/**
 * 从timeLog生成dailyTimeStats
 */
function generateDailyTimeStats (timeLog) {
  const dailyStats = {}

  if (!Array.isArray(timeLog)) {
    console.warn('timeLog不是数组，跳过')
    return dailyStats
  }

  for (const entry of timeLog) {
    try {
      // 提取日期部分 (YYYY-MM-DD)
      const date = new Date(entry.startTime).toISOString().split('T')[0]

      // 累加该日期的执行时间
      if (dailyStats[date]) {
        dailyStats[date] += entry.duration
      } else {
        dailyStats[date] = entry.duration
      }
    } catch (error) {
      console.warn('处理timeLog条目时出错:', entry, error.message)
    }
  }

  return dailyStats
}

/**
 * 执行数据迁移
 */
async function migrate () {
  console.log('🚀 开始数据迁移：生成dailyTimeStats字段')

  try {
    // 检查数据文件是否存在
    if (!fs.existsSync(DATA_FILE)) {
      console.error('❌ 数据文件不存在:', DATA_FILE)
      process.exit(1)
    }

    // 读取现有数据
    console.log('📖 读取现有任务数据...')
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    const tasks = JSON.parse(data)

    console.log(`📊 找到 ${tasks.length} 个任务`)

    // 备份原始数据
    const backupFile = DATA_FILE.replace('.json', '.backup.' + Date.now() + '.json')
    fs.writeFileSync(backupFile, data)
    console.log(`💾 已备份原始数据到: ${backupFile}`)

    // 处理每个任务
    let todoTaskCount = 0
    let migratedCount = 0

    for (const task of tasks) {
      if (task.type === 'todo') {
        todoTaskCount++

        // 跳过已经有dailyTimeStats的任务
        if (task.dailyTimeStats) {
          console.log(`⏭️ 任务 "${task.title}" 已有dailyTimeStats，跳过`)
          continue
        }

        // 生成dailyTimeStats
        const dailyStats = generateDailyTimeStats(task.timeLog || [])
        task.dailyTimeStats = dailyStats

        migratedCount++
        console.log(`✅ 已迁移任务: "${task.title}" (${Object.keys(dailyStats).length}天的数据)`)
      }
    }

    // 保存更新后的数据
    console.log('💾 保存更新后的数据...')
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2))

    console.log('🎉 数据迁移完成!')
    console.log(`📈 统计信息:`)
    console.log(`   - 总任务数: ${tasks.length}`)
    console.log(`   - TODO任务数: ${todoTaskCount}`)
    console.log(`   - 成功迁移: ${migratedCount}`)
    console.log(`   - 原始数据备份: ${backupFile}`)

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

// 执行迁移
if (require.main === module) {
  migrate()
} 