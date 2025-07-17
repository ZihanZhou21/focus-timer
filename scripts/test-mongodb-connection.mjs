import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.DB_NAME || 'focus-timer'

async function testConnection () {
  if (!MONGODB_URI) {
    console.error('❌ 错误: 未找到 MONGODB_URI 环境变量')
    console.log('请确保 .env.local 文件存在并包含正确的 MONGODB_URI')
    process.exit(1)
  }

  // 检查是否还是占位符密码
  if (MONGODB_URI.includes('<db_password>') || MONGODB_URI.includes('test_password')) {
    console.error('❌ 错误: MongoDB URI 中包含占位符密码')
    console.log('请在 .env.local 文件中将密码替换为真实的 MongoDB Atlas 密码')
    process.exit(1)
  }

  console.log('🔗 正在测试 MongoDB 连接...')
  console.log(`📍 目标数据库: ${DB_NAME}`)

  const client = new MongoClient(MONGODB_URI)

  try {
    // 连接到 MongoDB
    await client.connect()
    console.log('✅ 成功连接到 MongoDB!')

    // 测试数据库访问
    const db = client.db(DB_NAME)
    await db.admin().ping()
    console.log('✅ 数据库响应正常!')

    // 测试集合访问
    const collection = db.collection('tasks')
    const count = await collection.countDocuments()
    console.log(`📊 tasks 集合中有 ${count} 个文档`)

    // 测试基本操作
    const testDoc = { test: true, timestamp: new Date() }
    const insertResult = await collection.insertOne(testDoc)
    console.log('✅ 插入测试文档成功!')

    await collection.deleteOne({ _id: insertResult.insertedId })
    console.log('✅ 删除测试文档成功!')

    console.log('\n🎉 MongoDB 连接测试完全通过!')
    console.log('💡 现在可以运行数据迁移脚本了')

  } catch (error) {
    console.error('❌ MongoDB 连接失败:')

    if (error.code === 8000) {
      console.error('🔐 认证失败 - 请检查用户名和密码')
      console.error('💡 解决方法:')
      console.error('   1. 登录 MongoDB Atlas')
      console.error('   2. 检查 Database Access 中的用户凭据')
      console.error('   3. 确保密码正确且没有特殊字符编码问题')
    } else if (error.code === 6) {
      console.error('🌐 网络连接失败 - 请检查网络连接')
    } else {
      console.error('🔍 详细错误信息:', error.message)
    }

    process.exit(1)
  } finally {
    await client.close()
    console.log('🔒 数据库连接已关闭')
  }
}

testConnection() 