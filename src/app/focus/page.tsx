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
import AppNavigation from '@/components/AppNavigation'
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
      <div className="h-1 w-full animate-pulse rounded-full bg-[var(--focus-track)]" />
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
  sessionLabel,
}: {
  initialTime: number
  originalRemaining?: number
  originalElapsed?: number
  taskId?: string | null
  onComplete?: () => void
  sessionLabel: string
  liveTaskProgress?: {
    remainingMinutes: number
    executedMinutes: number
    progressPercentage: number
    remainingSeconds?: number
    executedSeconds?: number
    estimatedSeconds?: number
  } | null
}) {
  const totalElapsed = useSelector(
    (state: RootState) => state.timer.totalElapsed
  )
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
    <section className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center px-1 pb-4 pt-5 sm:px-4 sm:pb-8 sm:pt-2">
      <div className="absolute inset-x-0 top-10 flex items-center justify-center sm:hidden">
        <div className="max-w-[18rem] truncate rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] shadow-sm backdrop-blur-sm">
          {sessionLabel}
        </div>
      </div>

      <time
        className="max-w-full text-center text-[clamp(6.5rem,11vw,10rem)] font-medium leading-none tracking-[-0.065em] tabular-nums text-[var(--foreground)]"
        aria-label={`${formatTime(timeRemaining)} remaining`}>
        {formatTime(timeRemaining)}
      </time>

      <div className="mt-12 w-full sm:mt-14">
        <TimerProgressGrid
          progress={currentProgress}
          elapsedLabel={formatTime(totalElapsed)}
          remainingLabel={formatTime(timeRemaining)}
        />
      </div>

      <div className="mt-8 flex items-center justify-center sm:mt-9">
        <TimerControlButton isRunning={isRunning} onToggle={toggleTimer} />
      </div>
    </section>
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
      <div className="focus-session flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--focus-track)] border-t-[var(--accent)]" />
          <div className="text-sm text-[var(--muted-foreground)]">
            Loading task info...
          </div>
        </div>
      </div>
    )
  }

  const sessionLabel = taskInfo
    ? `${taskInfo.title} · ${taskInfo.duration}`
    : 'Practice session'

  return (
    <div className="focus-session flex h-screen flex-col overflow-hidden text-[var(--foreground)]">
      <header className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-4 px-5 pb-1 pt-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8 sm:pb-0 sm:pt-5">
        <div className="col-start-1 row-start-1 text-lg font-bold tracking-[-0.025em] sm:text-xl">
          FOCUS
        </div>

        <AppNavigation
          variant="focus"
          className="col-span-2 col-start-1 row-start-2 mt-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0"
        />

        <div className="col-start-3 row-start-1 hidden justify-end pr-14 sm:flex">
          <div
            className="max-w-[18rem] truncate rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] shadow-sm backdrop-blur-sm"
            title={sessionLabel}>
            {taskInfo ? (
              <>
                <span className="text-[var(--foreground)]">{taskInfo.title}</span>
                <span className="ml-2">{taskInfo.duration}</span>
              </>
            ) : (
              'Practice session'
            )}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 px-4 pb-4 sm:px-8 sm:pb-6">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-col">
          {taskInfo && taskInfo.completed && !isRepeat && !hasActiveSession ? (
            <section className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-sm">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    d="m6.5 12.5 3.5 3.5 7.5-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h1 className="mt-7 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Task completed
              </h1>
              <p className="mt-3 max-w-lg text-base leading-7 text-[var(--muted-foreground)]">
                &ldquo;{taskInfo.title}&rdquo; is complete. The session has been
                added to your focus history.
              </p>

              <dl className="mt-7 flex items-center gap-8 border-y border-[var(--border)] px-3 py-4 text-left text-sm">
                <div>
                  <dt className="text-[var(--muted-foreground)]">Planned</dt>
                  <dd className="mt-1 font-semibold">{taskInfo.duration}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Status</dt>
                  <dd className="mt-1 font-semibold">Completed</dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0">
                  Back to dashboard
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigation('/stats')}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] active:translate-y-0">
                  View stats
                </button>
              </div>
            </section>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
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
                sessionLabel={sessionLabel}
              />

              <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-1 text-xs text-[var(--muted-foreground)] sm:gap-x-8 sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <kbd className="inline-flex h-8 min-w-14 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-sans text-xs font-medium text-[var(--foreground)] shadow-sm">
                    SPACE
                  </kbd>
                  <span>Start / Pause</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <kbd className="inline-flex h-8 min-w-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 font-sans text-xs font-medium text-[var(--foreground)] shadow-sm">
                    ESC
                  </kbd>
                  <span>Exit safely</span>
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
        <div className="focus-session flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--focus-track)] border-t-[var(--accent)]" />
            <div className="text-sm text-[var(--muted-foreground)]">
              Loading focus environment...
            </div>
          </div>
        </div>
      }>
      <FocusContent />
    </Suspense>
  )
}
