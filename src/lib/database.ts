import { MongoClient, Db, Collection } from 'mongodb'
import { Task } from './types'

let client: MongoClient | null = null
let db: Db | null = null

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://zihan:<db_password>@focus-timer.qixfanq.mongodb.net/?retryWrites=true&w=majority&appName=focus-timer'
const DB_NAME = process.env.DB_NAME || 'focus-timer'

export async function connectToDatabase(): Promise<Db> {
  if (db && client) {
    try {
      // 测试连接是否有效
      await db.admin().ping()
      return db
    } catch {
      console.log('现有连接无效，重新连接...')
      client = null
      db = null
    }
  }

  try {
    console.log('正在连接到 MongoDB...')
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)

    // 测试连接
    await db.admin().ping()
    console.log('成功连接到 MongoDB')
    return db
  } catch (error) {
    console.error('MongoDB 连接失败:', error)
    throw error
  }
}

export async function getTasksCollection(): Promise<Collection<Task>> {
  const database = await connectToDatabase()
  return database.collection<Task>('tasks')
}

// 关闭数据库连接
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('MongoDB 连接已关闭')
  }
}

// 新的数据访问函数 - 替换原有的文件操作
export async function readTasksData(): Promise<Task[]> {
  try {
    const collection = await getTasksCollection()
    const tasks = await collection.find({}).toArray()
    console.log(`从 MongoDB 读取了 ${tasks.length} 个任务`)
    return tasks
  } catch (error) {
    console.error('读取任务数据失败:', error)
    return []
  }
}

export async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const collection = await getTasksCollection()

    // 清空现有数据并插入新数据
    await collection.deleteMany({})
    if (tasks.length > 0) {
      await collection.insertMany(tasks)
    }
    console.log(`成功写入 ${tasks.length} 个任务到 MongoDB`)
  } catch (error) {
    console.error('写入任务数据失败:', error)
    throw new Error('写入任务数据失败')
  }
}

// 单任务操作函数
export async function findTaskById(id: string): Promise<Task | null> {
  try {
    const collection = await getTasksCollection()
    return await collection.findOne({ _id: id })
  } catch (error) {
    console.error(`查找任务失败 (${id}):`, error)
    return null
  }
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task | null> {
  try {
    const collection = await getTasksCollection()

    const result = await collection.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    )

    return result || null
  } catch (error) {
    console.error(`更新任务失败 (${id}):`, error)
    return null
  }
}

export async function insertTask(task: Task): Promise<string> {
  try {
    const collection = await getTasksCollection()

    await collection.insertOne(task)
    console.log(`成功插入任务: ${task._id}`)
    return task._id
  } catch (error) {
    console.error('插入任务失败:', error)
    throw error
  }
}

export async function findUserTasks(userId: string): Promise<Task[]> {
  try {
    const collection = await getTasksCollection()
    const tasks = await collection.find({ userId }).toArray()
    console.log(`找到用户 ${userId} 的 ${tasks.length} 个任务`)
    return tasks
  } catch (error) {
    console.error(`查找用户任务失败 (${userId}):`, error)
    return []
  }
}

export async function bulkUpdateTasks(
  updates: Array<{ _id: string; updates: Partial<Task> }>
): Promise<boolean> {
  try {
    const collection = await getTasksCollection()

    const bulkOps = updates.map(({ _id, updates: taskUpdates }) => ({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            ...taskUpdates,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    }))

    if (bulkOps.length > 0) {
      const result = await collection.bulkWrite(bulkOps)
      console.log(`批量更新完成: 修改了 ${result.modifiedCount} 个任务`)
    }

    return true
  } catch (error) {
    console.error('批量更新任务失败:', error)
    return false
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const collection = await getTasksCollection()
    const result = await collection.deleteOne({ _id: id })
    return result.deletedCount > 0
  } catch (error) {
    console.error(`删除任务失败 (${id}):`, error)
    return false
  }
}

// 创建必要的索引
export async function createIndexes(): Promise<void> {
  try {
    const collection = await getTasksCollection()

    await collection.createIndex({ userId: 1 })
    await collection.createIndex({ type: 1 })
    await collection.createIndex({ status: 1 })
    await collection.createIndex({ createdAt: 1 })
    await collection.createIndex({ updatedAt: 1 })
    await collection.createIndex({ userId: 1, type: 1 })
    await collection.createIndex({ userId: 1, status: 1 })

    console.log('数据库索引创建完成')
  } catch (error) {
    console.error('创建索引失败:', error)
  }
}
