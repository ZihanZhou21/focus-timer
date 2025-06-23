import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { ProjectItem, dataUtils } from '@/lib/api'

// 获取数据文件路径
const getDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'projects.json')
}

// 读取项目数据
async function readProjectsData(): Promise<ProjectItem[]> {
  try {
    const filePath = getDataFilePath()
    const fileContent = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('读取项目数据失败:', error)
    return []
  }
}

// 写入项目数据
async function writeProjectsData(projects: ProjectItem[]): Promise<void> {
  try {
    const filePath = getDataFilePath()
    await fs.writeFile(filePath, JSON.stringify(projects, null, 2), 'utf-8')
  } catch (error) {
    console.error('写入项目数据失败:', error)
    throw error
  }
}

// 使用共享的工具函数

// GET - 获取项目列表（支持日期范围）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId') || 'user_001'

    const projects = await readProjectsData()

    // 根据用户ID过滤
    let filteredProjects = projects.filter(
      (project) => project.userId === userId
    )

    // 按日期过滤
    if (date) {
      // 单日查询（保持兼容性）
      filteredProjects = filteredProjects.filter(
        (project) => project.date === date
      )
    } else if (startDate && endDate) {
      // 日期范围查询（新功能）
      filteredProjects = filteredProjects.filter(
        (project) => project.date >= startDate && project.date <= endDate
      )
    } else if (startDate) {
      // 只有开始日期
      filteredProjects = filteredProjects.filter(
        (project) => project.date >= startDate
      )
    } else if (endDate) {
      // 只有结束日期
      filteredProjects = filteredProjects.filter(
        (project) => project.date <= endDate
      )
    }

    // 按日期和时间排序
    filteredProjects.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })

    return NextResponse.json(filteredProjects)
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return NextResponse.json({ error: '获取项目列表失败' }, { status: 500 })
  }
}

// POST - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json()
    const projects = await readProjectsData()

    // 生成新ID
    const newId = dataUtils.generateProjectId(projects)

    // 创建新项目
    const newProject: ProjectItem = {
      id: newId,
      userId: projectData.userId || 'user_001',
      date: projectData.date,
      time: projectData.time,
      title: projectData.title,
      durationMinutes: projectData.durationMinutes || 0,
      icon: projectData.icon,
      iconColor: projectData.iconColor,
      category: projectData.category,
      completed: projectData.completed || false,
      details: projectData.details,
    }

    projects.push(newProject)
    await writeProjectsData(projects)

    return NextResponse.json(newProject)
  } catch (error) {
    console.error('创建项目失败:', error)
    return NextResponse.json({ error: '创建项目失败' }, { status: 500 })
  }
}

// PUT - 批量更新项目
export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json()
    const projects = await readProjectsData()

    // 批量更新
    for (const update of updates) {
      const index = projects.findIndex((p) => p.id === update.id)
      if (index !== -1) {
        projects[index] = { ...projects[index], ...update }
      }
    }

    await writeProjectsData(projects)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('批量更新项目失败:', error)
    return NextResponse.json({ error: '批量更新项目失败' }, { status: 500 })
  }
}
