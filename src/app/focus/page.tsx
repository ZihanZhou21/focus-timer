'use client'

import { Suspense, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { batch, useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  setLoading,
  setTaskInfo,
  updateTaskProgress,
} from '@/app/slices/taskInfoSlice'
import TimerControlButton from '@/components/focus/TimerControlButton'
import { useFocusTimerLogic } from '@/hooks/useFocusTimerLogic'
import {
  tasksApi,
  useGetTaskProgressQuery,
  useGetTaskQuery,
  useGetTaskRemainingQuery,
} from '@/lib/services/tasks-api'

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
      <div className="flex flex-col items-center space-y-8 mb-12">
        <div className="bg-slate-800/80 backdrop-blur-xl text-white p-6 rounded-3xl border border-slate-700/50 shadow-2xl relative">
          <div className="text-8xl font-light tracking-wider text-center">
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-start max-w-3xl mx-auto w-full mb-16">
        <div className="relative">
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

      <div className="flex flex-col items-center mt-auto mb-12">
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
  const {
    isRunning: isTimerRunning,
    timeRemaining: timerRemaining,
    taskId: currentTimerTaskId,
  } = useSelector((state: RootState) => state.timer)

  const searchParams = useSearchParams()
  const taskId = searchParams.get('id')
  const isRepeat = searchParams.get('repeat') === 'true'
  const remainingMinutes = Number(searchParams.get('remaining')) || 0
  const elapsedMinutes = Number(searchParams.get('elapsed')) || 0
  const hasUrlTimerParams = remainingMinutes > 0
  const hasActiveSession =
    hasUrlTimerParams ||
    (currentTimerTaskId === taskId && (isTimerRunning || timerRemaining > 0))

  const skipTaskQueries = !taskId
  const skipProgressQueries = !taskId || hasUrlTimerParams
  const taskQuery = useGetTaskQuery(taskId ?? '', { skip: skipTaskQueries })
  const remainingQuery = useGetTaskRemainingQuery(taskId ?? '', {
    skip: skipProgressQueries,
  })
  const progressQuery = useGetTaskProgressQuery(taskId ?? '', {
    skip: skipProgressQueries,
  })

  const isTaskDataPending =
    Boolean(taskId) &&
    (taskQuery.isLoading ||
      (!hasUrlTimerParams &&
        (remainingQuery.isLoading || progressQuery.isLoading)))

  useEffect(() => {
    dispatch(setLoading(isTaskDataPending))
  }, [dispatch, isTaskDataPending])

  useEffect(() => {
    if (!taskId) {
      batch(() => {
        dispatch(setTaskInfo(null))
        dispatch(setLoading(false))
      })
      return
    }

    if (isTaskDataPending) return

    const task = taskQuery.data
    const nextTaskInfo = task
      ? {
          title: task.title,
          duration:
            task.type === 'todo' && task.estimatedDuration
              ? `${Math.round(task.estimatedDuration / 60)}min`
              : '25min',
          status: task.status,
          completed: task.status === 'completed',
        }
      : null

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
      const totalMinutes = remainingMinutes + elapsedMinutes

      Object.assign(progressPayload, {
        remainingMinutes,
        executedMinutes: elapsedMinutes,
        remainingSeconds,
        executedSeconds,
        estimatedSeconds: remainingSeconds + executedSeconds,
        progressPercentage:
          totalMinutes > 0
            ? Math.min((elapsedMinutes / totalMinutes) * 100, 100)
            : 0,
      })
    } else {
      Object.assign(progressPayload, {
        remainingMinutes: remainingQuery.data?.remainingMinutes ?? remainingMinutes,
        executedMinutes: remainingQuery.data?.executedMinutes ?? elapsedMinutes,
        remainingSeconds: remainingQuery.data?.remainingSeconds,
        executedSeconds: remainingQuery.data?.executedSeconds,
        estimatedSeconds: remainingQuery.data?.estimatedSeconds,
        progressPercentage: progressQuery.data?.progressPercentage ?? 0,
      })
    }

    batch(() => {
      dispatch(setTaskInfo(nextTaskInfo))
      dispatch(updateTaskProgress(progressPayload))
      dispatch(setLoading(false))
    })
  }, [
    dispatch,
    elapsedMinutes,
    hasUrlTimerParams,
    isTaskDataPending,
    progressQuery.data,
    remainingMinutes,
    remainingQuery.data,
    taskId,
    taskQuery.data,
  ])

  const parseDurationToMinutes = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)/)
    const minutes = match ? parseInt(match[1], 10) : 25
    return Math.max(minutes, 0.5)
  }

  const handleTimerComplete = () => {
    if (!taskId) return

    setTimeout(() => {
      dispatch(
        tasksApi.util.invalidateTags([
          { type: 'Task', id: taskId },
          { type: 'TaskProgress', id: taskId },
          { type: 'TaskRemaining', id: taskId },
        ])
      )
    }, 2000)
  }

  const handleNavigation = (url: string) => {
    router.push(url)
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const shouldShowLoading =
    isLoading &&
    !hasActiveSession &&
    (!taskId || (!remainingMinutes && !elapsedMinutes))

  if (shouldShowLoading) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-slate-400">Loading task info...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
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

        <div className="flex items-center space-x-4">
          {taskInfo && (
            <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>{taskInfo.title}</span>
              <span className="text-slate-400">({taskInfo.duration})</span>
              {taskProgress && (
                <span className="text-blue-400 ml-2">
                  {taskProgress.progressPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {!taskId && (
            <div className="bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>Practice Mode</span>
              <span className="text-amber-400">(Progress not saved)</span>
            </div>
          )}

          <div className="w-8 h-8 bg-slate-600 rounded-full" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {taskInfo && taskInfo.completed && !isRepeat && !hasActiveSession ? (
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
                  Congratulations! &ldquo;{taskInfo.title}&rdquo; has been
                  completed successfully
                </p>
                <div className="bg-slate-800/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/50 max-w-md mx-auto">
                  <div className="text-slate-300 mb-2">Task Details</div>
                  <div className="text-slate-400 text-sm">
                    Estimated Duration: {taskInfo.duration}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Status: Completed
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
                  onClick={() => handleNavigation('/stats')}
                  className="bg-slate-800/80 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-medium text-xl hover:bg-slate-700/80 transition-all duration-200 shadow-lg border border-slate-700/50">
                  View Stats
                </button>
              </div>
            </div>
          ) : (
            <div>
              <ModernTimer
                initialTime={
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
                  taskProgress?.remainingSeconds !== undefined
                    ? taskProgress.remainingSeconds / 60
                    : taskProgress?.remainingMinutes ?? remainingMinutes
                }
                originalElapsed={
                  taskProgress?.executedSeconds !== undefined
                    ? taskProgress.executedSeconds / 60
                    : taskProgress?.executedMinutes ?? elapsedMinutes
                }
                taskId={taskId}
                onComplete={handleTimerComplete}
                liveTaskProgress={taskProgress}
              />

              <div className="mt-8 pt-8">
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
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-slate-400">Loading focus environment...</div>
          </div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
