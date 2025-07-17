import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载环境变量
dotenv.config({ path: '.env.local' })

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://zihan:Focustimer1021@focus-timer.qixfanq.mongodb.net/?retryWrites=true&w=majority&appName=focus-timer'
const DB_NAME = process.env.DB_NAME || 'focus-timer'

async function migrateData () {
  const client = new MongoClient(MONGODB_URI)

  try {
    console.log('正在连接到 MongoDB...')
    await client.connect()
    console.log('成功连接到 MongoDB')

    const db = client.db(DB_NAME)
    const collection = db.collection('tasks')

    // 读取现有 JSON 数据
    const jsonPath = path.join(__dirname, '../data/tasks.json')
    console.log(`正在读取数据文件: ${jsonPath}`)

    if (!fs.existsSync(jsonPath)) {
      console.log('❌ 数据文件不存在:', jsonPath)
      return
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8')
    if (!fileContent.trim()) {
      console.log('❌ 数据文件为空')
      return
    }

    let jsonData
    try {
      jsonData = JSON.parse(fileContent)
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError)
      return
    }

    if (!Array.isArray(jsonData)) {
      console.log('❌ 数据格式不正确，期望数组格式')
      return
    }

    console.log(`找到 ${jsonData.length} 条任务数据`)

    // 检查数据库中是否已有数据
    const existingCount = await collection.countDocuments()
    if (existingCount > 0) {
      console.log(`⚠️  数据库中已有 ${existingCount} 条数据`)
      console.log('正在清空现有数据...')
      await collection.deleteMany({})
      console.log('已清空现有数据')
    }

    // 插入数据
    if (jsonData.length > 0) {
      console.log('正在插入数据到 MongoDB...')
      const result = await collection.insertMany(jsonData)
      console.log(`✅ 成功迁移 ${result.insertedCount} 条任务数据到 MongoDB`)
    } else {
      console.log('没有数据需要迁移')
    }

    // 创建索引
    console.log('正在创建数据库索引...')
    await collection.createIndex({ userId: 1 })
    await collection.createIndex({ type: 1 })
    await collection.createIndex({ status: 1 })
    await collection.createIndex({ createdAt: 1 })
    await collection.createIndex({ updatedAt: 1 })
    await collection.createIndex({ userId: 1, type: 1 })
    await collection.createIndex({ userId: 1, status: 1 })
    console.log('✅ 索引创建完成')

    // 验证迁移结果
    const finalCount = await collection.countDocuments()
    console.log(`\n📊 迁移完成统计:`)
    console.log(`   - 源文件任务数: ${jsonData.length}`)
    console.log(`   - 数据库任务数: ${finalCount}`)

    // 按用户统计
    const userStats = await collection.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]).toArray()

    console.log(`\n👥 用户统计:`)
    userStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count} 个任务`)
    })

    // 按类型统计
    const typeStats = await collection.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]).toArray()

    console.log(`\n📋 任务类型统计:`)
    typeStats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count} 个任务`)
    })

    console.log('\n🎉 数据迁移成功完成!')

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('数据库连接已关闭')
  }
}

// 检查是否提供了密码
if (MONGODB_URI.includes('<db_password>')) {
  console.error('❌ 错误: 请先在环境变量中设置正确的 MONGODB_URI (替换 <db_password>)')
  console.log('   或者在命令行中提供: MONGODB_URI="mongodb+srv://..." node scripts/migrate-to-mongodb.mjs')
  process.exit(1)
}

// 运行迁移
migrateData().catch(console.error) 