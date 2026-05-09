import { MongoClient, Db, Collection } from 'mongodb'
import { readFile } from 'fs/promises'
import path from 'path'
import { Task } from './types'

let client: MongoClient | null = null
let db: Db | null = null
let connectionPromise: Promise<Db> | null = null

const DB_NAME = process.env.DB_NAME || 'focus-timer'

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB')
  }

  return uri
}

export async function connectToDatabase(): Promise<Db> {
  if (db && client) {
    return db
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = (async () => {
    console.log('Connecting to MongoDB...')
    client = new MongoClient(getMongoUri(), {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 5000,
    })
    await client.connect()
    db = client.db(DB_NAME)

    await db.admin().ping()
    console.log('Connected to MongoDB')
    return db
  })()

  try {
    return await connectionPromise
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    client = null
    db = null
    throw error
  } finally {
    connectionPromise = null
  }
}

async function readLocalTasksData(): Promise<Task[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tasks.json')
    const file = await readFile(filePath, 'utf8')
    const tasks = JSON.parse(file) as Task[]
    console.log(`Read ${tasks.length} tasks from local data file`)
    return tasks
  } catch (error) {
    console.error('Failed to read local task data:', error)
    return []
  }
}

export async function getTasksCollection(): Promise<Collection<Task>> {
  const database = await connectToDatabase()
  return database.collection<Task>('tasks')
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    connectionPromise = null
    console.log('MongoDB connection closed')
  }
}

export async function readTasksData(): Promise<Task[]> {
  try {
    const collection = await getTasksCollection()
    const tasks = await collection.find({}).toArray()
    console.log(`Read ${tasks.length} tasks from MongoDB`)
    return tasks
  } catch (error) {
    console.error('Failed to read task data:', error)
    return readLocalTasksData()
  }
}

export async function writeTasksData(tasks: Task[]): Promise<void> {
  try {
    const collection = await getTasksCollection()

    await collection.deleteMany({})
    if (tasks.length > 0) {
      await collection.insertMany(tasks)
    }
    console.log(`Wrote ${tasks.length} tasks to MongoDB`)
  } catch (error) {
    console.error('Failed to write task data:', error)
    throw new Error('Failed to write task data')
  }
}

export async function findTaskById(id: string): Promise<Task | null> {
  try {
    const collection = await getTasksCollection()
    return await collection.findOne({ _id: id })
  } catch (error) {
    console.error(`Failed to find task (${id}):`, error)
    const tasks = await readLocalTasksData()
    return tasks.find((task) => task._id === id) || null
  }
}

export async function findTasksByIds(ids: string[]): Promise<Task[]> {
  const uniqueIds = Array.from(new Set(ids))

  if (uniqueIds.length === 0) {
    return []
  }

  try {
    const collection = await getTasksCollection()
    return await collection.find({ _id: { $in: uniqueIds } }).toArray()
  } catch (error) {
    console.error('Failed to find tasks by ids:', error)
    const tasks = await readLocalTasksData()
    const idSet = new Set(uniqueIds)
    return tasks.filter((task) => idSet.has(task._id))
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
    console.error(`Failed to update task (${id}):`, error)
    return null
  }
}

export async function insertTask(task: Task): Promise<string> {
  try {
    const collection = await getTasksCollection()

    await collection.insertOne(task)
    console.log(`Inserted task: ${task._id}`)
    return task._id
  } catch (error) {
    console.error('Failed to insert task:', error)
    throw error
  }
}

export async function findUserTasks(userId: string): Promise<Task[]> {
  try {
    const collection = await getTasksCollection()
    const tasks = await collection.find({ userId }).toArray()
    console.log(`Found ${tasks.length} tasks for user ${userId}`)
    return tasks
  } catch (error) {
    console.error(`Failed to find user tasks (${userId}):`, error)
    const tasks = await readLocalTasksData()
    return tasks.filter((task) => task.userId === userId)
  }
}

export async function findUserTasksForStats(
  userId: string,
  dates: string[]
): Promise<Task[]> {
  const uniqueDates = Array.from(new Set(dates)).sort()

  if (uniqueDates.length === 0) {
    return []
  }

  try {
    const collection = await getTasksCollection()
    const dateFieldChecks = uniqueDates.map((date) => ({
      [`dailyTimeStats.${date}`]: { $exists: true },
    }))

    const tasks = await collection
      .find({
        userId,
        $or: [
          { completedAt: { $in: uniqueDates } },
          { 'checkInHistory.date': { $in: uniqueDates } },
          { dueDate: { $gte: uniqueDates[0], $lte: uniqueDates.at(-1) } },
          { 'recurrence.frequency': { $in: ['daily', 'weekly'] } },
          ...dateFieldChecks,
        ],
      })
      .toArray()

    console.log(
      `Found ${tasks.length} stats-relevant tasks for user ${userId}`
    )
    return tasks
  } catch (error) {
    console.error(`Failed to find stats tasks (${userId}):`, error)
    const tasks = await readLocalTasksData()
    const dateSet = new Set(uniqueDates)

    return tasks.filter((task) => {
      if (task.userId !== userId) return false
      if (task.completedAt?.some((date) => dateSet.has(date))) return true
      if (task.type === 'todo') {
        const hasDailyStats = Object.keys(task.dailyTimeStats || {}).some(
          (date) => dateSet.has(date)
        )
        const dueDate = task.dueDate?.split('T')[0]
        return hasDailyStats || (dueDate ? dateSet.has(dueDate) : false)
      }

      return (
        task.checkInHistory?.some((entry) => dateSet.has(entry.date)) ||
        task.recurrence.frequency === 'daily' ||
        task.recurrence.frequency === 'weekly'
      )
    })
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
      console.log(`Bulk update complete: modified ${result.modifiedCount} tasks`)
    }

    return true
  } catch (error) {
    console.error('Failed to bulk update tasks:', error)
    return false
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const collection = await getTasksCollection()
    const result = await collection.deleteOne({ _id: id })
    return result.deletedCount > 0
  } catch (error) {
    console.error(`Failed to delete task (${id}):`, error)
    return false
  }
}

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
    await collection.createIndex({ userId: 1, completedAt: 1 })
    await collection.createIndex({ userId: 1, dueDate: 1 })
    await collection.createIndex({ userId: 1, 'checkInHistory.date': 1 })
    await collection.createIndex({ userId: 1, 'recurrence.frequency': 1 })

    console.log('Database indexes created')
  } catch (error) {
    console.error('Failed to create indexes:', error)
  }
}
