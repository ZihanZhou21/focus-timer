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

// GET - 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const userId = searchParams.get('userId') || 'user_001'

    const projects = await readProjectsData()

    // 根据日期和用户ID过滤
    let filteredProjects = projects.filter(
      (project) => project.userId === userId
    )

    if (date) {
      filteredProjects = filteredProjects.filter(
        (project) => project.date === date
      )
    }

    // 按时间排序
    filteredProjects.sort((a, b) => a.time.localeCompare(b.time))

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
