import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import * as path from 'path'
import { ProjectItem } from '@/lib/api'

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

// GET - 获取单个项目
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projects = await readProjectsData()
    const project = projects.find((p) => p.id === id)

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('获取项目失败:', error)
    return NextResponse.json({ error: '获取项目失败' }, { status: 500 })
  }
}

// PUT - 更新单个项目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updateData = await request.json()
    const projects = await readProjectsData()

    const index = projects.findIndex((p) => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 更新项目
    projects[index] = { ...projects[index], ...updateData }
    await writeProjectsData(projects)

    return NextResponse.json(projects[index])
  } catch (error) {
    console.error('更新项目失败:', error)
    return NextResponse.json({ error: '更新项目失败' }, { status: 500 })
  }
}

// DELETE - 删除单个项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const projects = await readProjectsData()

    const index = projects.findIndex((p) => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 删除项目
    projects.splice(index, 1)
    await writeProjectsData(projects)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除项目失败:', error)
    return NextResponse.json({ error: '删除项目失败' }, { status: 500 })
  }
}
