'use client'

import React, { Suspense, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { batch, useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  setTaskInfo,
  setTaskProgress,
  updateTaskProgress,
  setLoading,
} from '@/app/slices/taskInfoSlice'
import TimerControlButton from '@/components/focus/TimerControlButton'
import { useFocusTimerLogic } from '@/hooks/useFocusTimerLogic'

const TimerProgressGrid = dynamic(
  () => import('@/components/focus/TimerProgressGrid'),
  {
    loading: () => (
      <div className="relative bg-slate-800/60 backdrop-blur-xl p-3 rounded-xl border border-slate-700/50 h-8 w-full" />
    ),
    ssr: false,
  }
)


function ModernTimer({
  initialTime = 25,
  originalRemaining = 0,
  originalElapsed = 0,
  taskId,
  onComplete,
  liveTaskProgress,
}: {
  initialTime: number
  originalRemaining?: number
  originalElapsed?: number
  taskId?: string | null
  onComplete?: () => void
  liveTaskProgress?: {
    remainingMinutes: number
    executedMinutes: number
    progressPercentage: number
    remainingSeconds?: number
    executedSeconds?: number
    estimatedSeconds?: number
  } | null
}) {
  const { timeRemaining, currentProgress, isRunning, formatTime, toggleTimer } =
    useFocusTimerLogic({
      initialTime,
      originalRemaining,
      originalElapsed,
      taskId,
      onComplete,
      liveTaskProgress,
    })

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-full">
      {/* 上部区域 - 倒计时显示 */}
      <div className="flex flex-col items-center space-y-8 mb-12">
        {/* 时间显示框 */}
        <div className="bg-slate-800/80 backdrop-blur-xl text-white p-6 rounded-3xl border border-slate-700/50 shadow-2xl relative">
          <div className="text-8xl font-light tracking-wider text-center">
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* 中部区域 - 进度条 */}
      <div className="flex flex-col justify-start max-w-3xl mx-auto w-full mb-16">
        <div className="relative">
          {/* 进度文字和百分比 */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-light text-slate-200 tracking-wider">
              Task Progress
            </div>
            <div className="text-xl font-light text-[#7bbf9a]">
              {Math.round(currentProgress)}%
            </div>
          </div>

          <TimerProgressGrid progress={currentProgress} />
        </div>
      </div>

      {/* 底部区域 - 控制按钮 */}
      <div className="flex flex-col items-center mt-auto mb-12">
        {/* 主要控制按钮 */}
        <div className="flex items-center">
          <TimerControlButton isRunning={isRunning} onToggle={toggleTimer} />
        </div>
      </div>
    </div>
  )
}

function FocusContent() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { taskInfo, taskProgress, isLoading } = useSelector(
    (state: RootState) => state.taskInfo
  )
  const { isRunning: isTimerRunning, timeRemaining: timerRemaining, taskId: currentTimerTaskId } = useSelector(
    (state: RootState) => state.timer
  )

  const searchParams = useSearchParams()
  const taskId = searchParams.get('id')
  const isRepeat = searchParams.get('repeat') === 'true'
  const remainingMinutes = Number(searchParams.get('remaining')) || 0
  const elapsedMinutes = Number(searchParams.get('elapsed')) || 0
  const hasUrlTimerParams = remainingMinutes > 0

  // 检查是否有关联该任务的活跃计时器（运行中或已暂停但有剩余时间）
  const hasActiveSession =
    hasUrlTimerParams ||
    (currentTimerTaskId === taskId && (isTimerRunning || timerRemaining > 0))

  // Debug info
  console.log('Focus page parameters:', {
    taskId,
    isRepeat,
    remainingMinutes,
    elapsedMinutes,
  })

  // 从API获取任务信息和每日更新的进度数据
  useEffect(() => {
    const fetchTaskInfo = async () => {
      if (!taskId) {
        dispatch(setLoading(false))
        return
      }

      try {
        const [taskResult, remainingResult, progressResult] =
          await Promise.allSettled([
            fetch(`/api/tasks/${taskId}`),
            fetch(`/api/tasks/${taskId}/remaining`),
            fetch(`/api/tasks/${taskId}/progress`),
          ])

        let nextTaskInfo: {
          title: string
          duration: string
          status: string
          completed: boolean
        } | null = null

        if (taskResult.status === 'fulfilled' && taskResult.value.ok) {
          const task = await taskResult.value.json()
          console.log('📋 Retrieved task info:', task)
          nextTaskInfo = {
            title: task.title,
            duration: task.estimatedDuration
              ? `${Math.round(task.estimatedDuration / 60)}分钟`
              : '25分钟',
            status: task.status,
            completed: task.status === 'completed' || task.completed === true,
          }
        } else {
          console.warn('⚠️ Task does not exist or has been deleted')
        }

        const progressPayload: {
          remainingMinutes?: number
          executedMinutes?: number
          progressPercentage?: number
          remainingSeconds?: number
          executedSeconds?: number
          estimatedSeconds?: number
        } = {}

        if (hasUrlTimerParams) {
          const remainingSeconds = Math.round(remainingMinutes * 60)
          const executedSeconds = Math.round(elapsedMinutes * 60)
          Object.assign(progressPayload, {
            remainingMinutes,
            executedMinutes: elapsedMinutes,
            remainingSeconds,
            executedSeconds,
            estimatedSeconds: remainingSeconds + executedSeconds,
          })
        } else if (remainingResult.status === 'fulfilled' && remainingResult.value.ok) {
          const remainingData = await remainingResult.value.json()
          console.log(
            '⏰ Retrieved daily updated remaining time:',
            remainingData
          )
          Object.assign(progressPayload, {
            remainingMinutes: remainingData.remainingMinutes,
            executedMinutes: remainingData.executedMinutes,
            remainingSeconds: remainingData.remainingSeconds,
            executedSeconds: remainingData.executedSeconds,
            estimatedSeconds: remainingData.estimatedSeconds,
          })
        } else {
          console.warn('⚠️ Failed to get remaining time, using URL parameters')
          Object.assign(progressPayload, {
            remainingMinutes: remainingMinutes,
            executedMinutes: elapsedMinutes,
          })
        }

        if (hasUrlTimerParams) {
          const totalMinutes = remainingMinutes + elapsedMinutes
          progressPayload.progressPercentage =
            totalMinutes > 0
              ? Math.min((elapsedMinutes / totalMinutes) * 100, 100)
              : 0
        } else if (progressResult.status === 'fulfilled' && progressResult.value.ok) {
          const progressData = await progressResult.value.json()
          console.log('📊 获取到每日更新的进度:', progressData)
          progressPayload.progressPercentage = progressData.progressPercentage
        } else {
          console.warn('⚠️ 获取进度失败，使用默认值')
          progressPayload.progressPercentage =
            progressPayload.progressPercentage ?? 0
        }

        batch(() => {
          dispatch(setTaskInfo(nextTaskInfo))
          dispatch(updateTaskProgress(progressPayload))
        })
      } catch (error) {
        console.error('获取任务信息失败:', error)
        batch(() => {
          dispatch(setTaskInfo(null))
          dispatch(
            setTaskProgress({
              remainingMinutes: remainingMinutes,
              executedMinutes: elapsedMinutes,
              progressPercentage: 0,
            })
          )
        })
      } finally {
        dispatch(setLoading(false))
      }
    }

    fetchTaskInfo()
  }, [taskId, remainingMinutes, elapsedMinutes, hasUrlTimerParams, dispatch])

  // 解析时长字符串为分钟数，最短30秒
  const parseDurationToMinutes = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)分钟/)
    const minutes = match ? parseInt(match[1]) : 25
    // 最短时间30秒 = 0.5分钟
    return Math.max(minutes, 0.5)
  }

  const handleTimerComplete = () => {
    console.log('专注时段完成')
    // 任务完成后刷新任务信息，显示最新状态
    if (taskId) {
      setTimeout(() => {
        // 重新获取任务信息和进度数据
        const fetchUpdatedTaskInfo = async () => {
          try {
            const [taskResponse, progressResponse] = await Promise.allSettled([
              fetch(`/api/tasks/${taskId}`),
              fetch(`/api/tasks/${taskId}/progress`),
            ])

            if (taskResponse.status === 'fulfilled' && taskResponse.value.ok) {
              const task = await taskResponse.value.json()
              dispatch(
                setTaskInfo({
                  title: task.title,
                  duration: task.estimatedDuration
                    ? `${Math.round(task.estimatedDuration / 60)}分钟`
                    : '25分钟',
                  status: task.status,
                  completed:
                    task.status === 'completed' || task.completed === true,
                })
              )
            }

            if (
              progressResponse.status === 'fulfilled' &&
              progressResponse.value.ok
            ) {
              const progressData = await progressResponse.value.json()
              dispatch(
                updateTaskProgress({
                  progressPercentage: progressData.progressPercentage,
                })
              )
            }
          } catch (error) {
            console.error('刷新任务信息失败:', error)
          }
        }
        fetchUpdatedTaskInfo()
      }, 2000)
    }
  }

  // 处理导航点击
  const handleNavigation = (url: string) => {
    router.push(url)
  }

  // 返回主页面
  const handleBackToHome = () => {
    router.push('/')
  }

  // 只有在没有提供taskId，或者没有任何乐观数据时才显示全屏加载
  // 这样当从仪表盘带参数跳转过来时，可以立即渲染计时器UI
  const shouldShowLoading = isLoading && !hasActiveSession && (!taskId || (!remainingMinutes && !elapsedMinutes))

  if (shouldShowLoading) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-400">Loading task info...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-8 pt-6 flex-shrink-0">
        <div className="text-xl font-bold text-slate-300">FOCUS</div>

        <nav className="bg-slate-800 rounded-2xl p-1.5">
          <div className="flex space-x-2">
            <button
              onClick={() => handleNavigation('/')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              Dashboard
            </button>
            <div className="px-6 py-2.5 rounded-xl text-white bg-slate-700 transition-colors text-base font-medium">
              Focus
            </div>
            <button
              onClick={() => handleNavigation('/calendar')}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-base font-medium">
              History
            </button>
          </div>
        </nav>

        {/* 右上角显示任务信息 */}
        <div className="flex items-center space-x-4">
          {taskInfo && (
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>📝</span>
              <span>{taskInfo.title}</span>
              <span className="text-slate-400">({taskInfo.duration})</span>
              {taskProgress && (
                <span className="text-blue-400 ml-2">
                  📊 {taskProgress.progressPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {!taskId && (
            <div className="bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>🧘</span>
              <span>Practice Mode</span>
              <span className="text-amber-400">(Progress not saved)</span>
            </div>
          )}

          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* 检查任务是否已完成 (如果开启重复模式，或者当前有关联该任务的活跃计时器，则忽略完成状态) */}
          {taskInfo && taskInfo.completed && !isRepeat && !hasActiveSession ? (
            // 任务已完成的显示
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h1 className="text-4xl font-light text-white mb-4">
                  Task Completed
                </h1>
                <p className="text-xl text-slate-400 mb-8">
                  🎉 Congratulations! &ldquo;{taskInfo.title}&rdquo; has been
                  completed successfully
                </p>
                <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/50 max-w-md mx-auto">
                  <div className="text-slate-300 mb-2">Task Details</div>
                  <div className="text-slate-400 text-sm">
                    Estimated Duration: {taskInfo.duration}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Status: Completed ✅
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleBackToHome}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-medium text-xl transition-all duration-200 shadow-lg">
                  Back to Home
                </button>
                <button
                  onClick={() => (window.location.href = '/stats')}
                  className="bg-slate-800/80 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 transition-all duration-200 shadow-lg border border-slate-700/50">
                  View Stats
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* 正常的计时器显示 */}
              <ModernTimer
                initialTime={
                  // 优先使用秒级数据转换为分钟，提高精度
                  taskProgress?.remainingSeconds !== undefined
                    ? taskProgress.remainingSeconds / 60
                    : (taskProgress?.remainingMinutes ?? 0) > 0
                    ? taskProgress?.remainingMinutes ?? 0
                    : remainingMinutes > 0
                    ? remainingMinutes
                    : taskInfo
                    ? parseDurationToMinutes(taskInfo.duration)
                    : 25
                }
                originalRemaining={
                  // 优先使用秒级数据转换为分钟
                  taskProgress?.remainingSeconds !== undefined
                    ? taskProgress.remainingSeconds / 60
                    : taskProgress?.remainingMinutes ?? remainingMinutes
                }
                originalElapsed={
                  // 优先使用秒级数据转换为分钟
                  taskProgress?.executedSeconds !== undefined
                    ? taskProgress.executedSeconds / 60
                    : taskProgress?.executedMinutes ?? elapsedMinutes
                }
                taskId={taskId}
                onComplete={handleTimerComplete}
                liveTaskProgress={taskProgress}
              />

              {/* 快捷键提示 - 移到中间容器 */}
              <div className="mt-8 pt-8 ">
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
                      SPACE
                    </div>
                    <span className="text-slate-400 text-sm">Start/Pause</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
                      ESC
                    </div>
                    <span className="text-slate-400 text-sm">Safe Exit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-slate-400">Loading focus environment...</div>
          </div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
