'use client'

import { Suspense } from 'react'
import CustomTimer from '@/components/CustomTimer'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function FocusContent() {
  const searchParams = useSearchParams()
  const taskParam = searchParams.get('task')

  let taskInfo = null
  if (taskParam) {
    try {
      taskInfo = JSON.parse(decodeURIComponent(taskParam))
    } catch (error) {
      console.error('解析任务信息失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="group inline-flex items-center px-6 py-3 bg-slate-800/80 backdrop-blur-xl hover:bg-slate-700/90 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-600/50 hover:border-amber-600/50">
          <svg
            className="w-5 h-5 mr-3 text-slate-300 group-hover:text-amber-400 transition-colors duration-300 group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="font-light text-slate-200 group-hover:text-amber-400 transition-colors duration-300">
            返回
          </span>
        </Link>
      </div>

      {/* 主要内容区域 */}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* 左侧：项目信息 */}
            <div className="space-y-8">
              {taskInfo ? (
                <>
                  {/* 项目标题和基本信息 */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 flex items-center justify-center text-3xl shadow-lg">
                        {taskInfo.icon}
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                          {taskInfo.title}
                        </h1>
                        <div className="text-slate-400 text-lg space-y-1">
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-5 h-5 text-amber-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>计划时间 {taskInfo.time}</span>
                          </div>
                          {taskInfo.duration && (
                            <div className="flex items-center space-x-2">
                              <svg
                                className="w-5 h-5 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              <span>预计时长 {taskInfo.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 任务详情 */}
                  {taskInfo.details && taskInfo.details.length > 0 && (
                    <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-xl border border-slate-700/50 shadow-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <svg
                          className="w-5 h-5 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <h3 className="text-slate-300 font-medium">准备信息</h3>
                      </div>
                      <div className="space-y-3">
                        {taskInfo.details.map(
                          (detail: string, index: number) => {
                            const colors = [
                              {
                                bg: 'bg-blue-500/20',
                                border: 'border-blue-500/30',
                                dot: 'bg-blue-500',
                              },
                              {
                                bg: 'bg-orange-500/20',
                                border: 'border-orange-500/30',
                                dot: 'bg-orange-500',
                              },
                              {
                                bg: 'bg-green-500/20',
                                border: 'border-green-500/30',
                                dot: 'bg-green-500',
                              },
                              {
                                bg: 'bg-purple-500/20',
                                border: 'border-purple-500/30',
                                dot: 'bg-purple-500',
                              },
                            ]
                            const colorSet = colors[index % colors.length]

                            return (
                              <div
                                key={index}
                                className={`flex items-center p-4 ${colorSet.bg} border ${colorSet.border} rounded-xl backdrop-blur-sm`}>
                                <div
                                  className={`w-3 h-3 rounded-full ${colorSet.dot} mr-3 flex-shrink-0`}></div>
                                <span className="text-slate-200">{detail}</span>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* 专注提示 */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/20 backdrop-blur-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-amber-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-amber-400 font-medium">专注建议</h4>
                    </div>
                    <ul className="text-slate-300 text-sm space-y-2">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                        <span>关闭所有干扰通知</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                        <span>准备好水和必要工具</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                        <span>使用空格键快速开始/暂停</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                /* 无任务信息时的占位内容 */
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 flex items-center justify-center text-4xl shadow-lg mx-auto">
                    ⏰
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      专注计时器
                    </h1>
                    <p className="text-slate-400 text-lg">开始你的专注时光</p>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：计时器 */}
            <div className="flex justify-center">
              <div className="relative">
                <CustomTimer
                  duration={taskInfo?.duration || '25分钟'}
                  onComplete={() => {
                    console.log('任务完成!')
                    // 这里可以添加任务完成后的逻辑
                  }}
                  onStart={() => {
                    console.log('开始专注')
                  }}
                  onPause={() => {
                    console.log('暂停专注')
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
