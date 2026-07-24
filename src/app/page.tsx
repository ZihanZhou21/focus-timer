'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { setSelectedItem, updateTask, deleteTask } from '@/app/slices/tasksSlice'
import AppNavigation from '@/components/AppNavigation'
import InsightsRail from '@/components/dashboard/InsightsRail'
import NextFocusCard from '@/components/dashboard/NextFocusCard'
import TodayTimeline from '@/components/dashboard/TodayTimeline'
import SimpleTaskModal from '@/components/SimpleTaskModal'
import TaskDetailCard from '@/components/TaskDetailCard'
import { ProjectItem } from '@/lib/api'
import { DEFAULT_USER_ID } from '@/lib/constants'
import {
  tasksApi,
  useDeleteTaskMutation,
  useGetTodayProjectItemsQuery,
} from '@/lib/services/tasks-api'
import '@/lib/auto-reset'

const hasDirtyText = (value: string) => /�|Ã|Â|å|æ|ç|ð/i.test(value)

const getTaskTitle = (item: ProjectItem) => {
  const title = item.title?.trim()
  return title && !hasDirtyText(title) ? title : 'Untitled task'
}

export default function Home() {
  const router = useRouter()
  const dispatch = useDispatch()
  const selectedItem = useSelector((state: RootState) => state.tasks.selectedItem)
  const didInitializeSelection = useRef(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isInsightsOpen, setIsInsightsOpen] = useState(true)
  const [isCompactInsightsOpen, setIsCompactInsightsOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<
    'tasks' | 'insights' | 'details'
  >('tasks')
  const [deleteTaskMutation] = useDeleteTaskMutation()

  const {
    data: todayProjectItems,
    isError: isTodayTasksError,
    isLoading,
    refetch: refetchTodayTasks,
  } = useGetTodayProjectItemsQuery(DEFAULT_USER_ID)

  const timelineItems = useMemo(
    () => (isTodayTasksError ? [] : todayProjectItems ?? []),
    [isTodayTasksError, todayProjectItems]
  )
  const openItems = useMemo(
    () => timelineItems.filter((item) => !item.completed),
    [timelineItems]
  )
  const nextFocusItem =
    openItems.find((item) => item.type !== 'check-in') ?? openItems[0] ?? null
  const focusItem =
    selectedItem &&
    !selectedItem.completed &&
    selectedItem.type !== 'check-in'
      ? selectedItem
      : nextFocusItem

  const handleStartFocus = (item: ProjectItem) => {
    if (item.type === 'check-in') {
      dispatch(setSelectedItem(item))
      setMobilePanel('details')
      return
    }

    router.push(`/focus?id=${item.id}`)
  }

  const handleTaskAdded = async () => {
    dispatch(
      tasksApi.util.invalidateTags([
        { type: 'TodayTasks', id: DEFAULT_USER_ID },
      ])
    )
    await refetchTodayTasks()
  }

  const handleTaskUpdate = (updatedTask: ProjectItem) => {
    dispatch(updateTask(updatedTask))
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTaskMutation(taskId).unwrap()
      dispatch(deleteTask(taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleCloseTaskDetail = () => {
    dispatch(setSelectedItem(null))
    setMobilePanel('tasks')
  }

  const handleSelectItem = (item: ProjectItem) => {
    dispatch(setSelectedItem(item))
    setMobilePanel('details')
  }

  useEffect(() => {
    if (didInitializeSelection.current || !nextFocusItem) return

    didInitializeSelection.current = true
    if (!selectedItem) {
      dispatch(setSelectedItem(nextFocusItem))
    }
  }, [dispatch, nextFocusItem, selectedItem])

  useEffect(() => {
    if (!selectedItem || !todayProjectItems) return

    const freshSelectedItem = todayProjectItems.find(
      (item) => item.id === selectedItem.id
    )

    if (freshSelectedItem && freshSelectedItem !== selectedItem) {
      dispatch(setSelectedItem(freshSelectedItem))
    } else if (!freshSelectedItem) {
      dispatch(setSelectedItem(null))
    }
  }, [dispatch, selectedItem, todayProjectItems])

  useEffect(() => {
    const handleDailyResetCompleted = () => {
      dispatch(
        tasksApi.util.invalidateTags([
          { type: 'TodayTasks', id: DEFAULT_USER_ID },
        ])
      )
      void refetchTodayTasks()
    }

    window.addEventListener('daily-reset-completed', handleDailyResetCompleted)
    return () => {
      window.removeEventListener(
        'daily-reset-completed',
        handleDailyResetCompleted
      )
    }
  }, [dispatch, refetchTodayTasks])

  const gridColumns = isInsightsOpen
    ? 'lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]'
    : 'lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]'

  const insightsVisibility = [
    mobilePanel === 'insights' ? 'flex' : 'hidden',
    isCompactInsightsOpen
      ? 'lg:fixed lg:inset-y-20 lg:left-4 lg:z-50 lg:flex lg:w-[19rem]'
      : 'lg:hidden',
    isInsightsOpen
      ? 'xl:static xl:flex xl:w-auto'
      : 'xl:hidden',
  ].join(' ')

  return (
    <div className="focus-dashboard flex min-h-screen flex-col lg:h-screen">
      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-solid)] px-4 pr-16 sm:h-[72px] sm:px-6 sm:pr-20 lg:px-8 lg:pr-20">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-sm font-black text-[var(--accent)] shadow-sm">
            F
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              Focus Timer
            </div>
            <div className="hidden truncate text-xs font-medium text-[var(--muted-foreground)] lg:block">
              {nextFocusItem
                ? `Next: ${getTaskTitle(nextFocusItem)}`
                : 'Plan today, then focus'}
            </div>
          </div>
        </div>

        <AppNavigation
          variant="dashboard"
          className="lg:absolute lg:left-1/2 lg:-translate-x-1/2"
        />

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label="Create task">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className="hidden sm:inline">New Task</span>
        </button>
      </header>

      <div className="sticky top-0 z-20 px-4 pt-3 lg:hidden">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-1 shadow-sm">
          {[
            { key: 'tasks', label: 'Today' },
            { key: 'insights', label: 'Insights' },
            { key: 'details', label: 'Details' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setMobilePanel(item.key as typeof mobilePanel)
              }
              className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                mobilePanel === item.key
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:overflow-hidden lg:pb-6 lg:pt-6">
        {isCompactInsightsOpen && (
          <button
            type="button"
            aria-label="Close insights overlay"
            onClick={() => setIsCompactInsightsOpen(false)}
            className="fixed inset-0 z-40 hidden bg-slate-950/20 lg:block xl:hidden"
          />
        )}

        <div
          className={`mx-auto grid min-h-[calc(100vh-9rem)] max-w-[1600px] gap-4 lg:h-full lg:min-h-0 ${gridColumns}`}>
          <aside
            className={`${insightsVisibility} min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] xl:rounded-none xl:border-0 xl:border-r xl:bg-transparent xl:py-0 xl:pl-0 xl:pr-4 xl:shadow-none`}>
            <InsightsRail
              onClose={() => {
                setIsCompactInsightsOpen(false)
                setIsInsightsOpen(false)
                setMobilePanel('tasks')
              }}
            />
          </aside>

          <section
            className={`${
              mobilePanel === 'tasks' ? 'flex' : 'hidden'
            } min-h-0 flex-col gap-5 lg:flex`}>
            <div className="hidden items-end justify-between gap-4 lg:flex">
              <div>
                <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                  Schedule the day
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Pick one thing. Give it your full attention.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompactInsightsOpen(true)}
                className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-medium text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] lg:inline-flex xl:hidden">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Insights
              </button>
            </div>

            <NextFocusCard
              item={focusItem}
              onStart={handleStartFocus}
              onAddTask={() => setIsAddModalOpen(true)}
            />

            <TodayTimeline
              items={timelineItems}
              selectedId={selectedItem?.id}
              isLoading={isLoading}
              onSelect={handleSelectItem}
              onAddTask={() => setIsAddModalOpen(true)}
            />
          </section>

          <aside
            className={`${
              mobilePanel === 'details' ? 'flex' : 'hidden'
            } min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 lg:flex lg:p-5`}>
            <div className="mb-4 flex shrink-0 items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  Task details
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Keep the next step clear
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanel('tasks')}
                className="grid h-9 w-9 place-items-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
                aria-label="Back to today">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path
                    d="m15 6-6 6 6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TaskDetailCard
                selectedItem={selectedItem}
                timelineItems={timelineItems}
                onSelectItem={handleSelectItem}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onClose={handleCloseTaskDetail}
                onAddTask={() => setIsAddModalOpen(true)}
              />
            </div>
          </aside>
        </div>
      </main>

      {!isInsightsOpen && (
        <button
          type="button"
          onClick={() => setIsInsightsOpen(true)}
          className="fixed left-0 top-28 z-30 hidden h-11 w-10 items-center justify-center rounded-r-xl border border-l-0 border-[var(--border)] bg-[var(--surface-solid)] text-[var(--muted-foreground)] shadow-sm transition hover:text-[var(--foreground)] xl:flex"
          aria-label="Show insights">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true">
            <path
              d="M5 19V9m7 10V5m7 14v-7"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      )}

      <SimpleTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  )
}
