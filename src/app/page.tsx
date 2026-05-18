'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectItem } from '@/lib/api'
import { taskTypeConfig, DEFAULT_USER_ID } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'
import AppNavigation from '@/components/AppNavigation'
import SimpleTaskModal from '@/components/SimpleTaskModal'
import ActivityCalendar from '@/components/ActivityCalendar'
import TaskDetailCard from '@/components/TaskDetailCard'
import WeekChart from '@/components/WeekChart'
import {
  tasksApi,
  useDeleteTaskMutation,
  useGetTodayProjectItemsQuery,
} from '@/lib/services/tasks-api'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { setSelectedItem, updateTask, deleteTask } from '@/app/slices/tasksSlice'
// 导入自动重置服务（自动启动）
import '@/lib/auto-reset'

export default function Home() {
  // Local state management - unified use of ProjectItem
  const router = useRouter()
  const dispatch = useDispatch()
  const selectedItem = useSelector((state: RootState) => state.tasks.selectedItem)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isInsightsOpen, setIsInsightsOpen] = useState(true)
  const [mobilePanel, setMobilePanel] = useState<'tasks' | 'insights' | 'details'>(
    'tasks'
  )
  const [deleteTaskMutation] = useDeleteTaskMutation()
  const {
    data: todayProjectItems,
    isError: isTodayTasksError,
    isLoading,
    refetch: refetchTodayTasks,
  } = useGetTodayProjectItemsQuery(DEFAULT_USER_ID)
  const timelineItems = isTodayTasksError ? [] : todayProjectItems ?? []

  // Handle new task addition
  const handleTaskAdded = async () => {
    dispatch(
      tasksApi.util.invalidateTags([
        { type: 'TodayTasks', id: DEFAULT_USER_ID },
      ])
    )
    await refetchTodayTasks()
  }

  // Handle task updates
  const handleTaskUpdate = (updatedTask: ProjectItem) => {
    dispatch(updateTask(updatedTask))
  }

  // Debug info
  console.log('Main page selectedItem:', selectedItem)

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTaskMutation(taskId).unwrap()
      dispatch(deleteTask(taskId))
      console.log(`Task ${taskId} successfully deleted`)
    } catch (error) {
      console.error('Error deleting task:', error)
      // Can add user notification here
    }
  }

  // Close task details
  const handleCloseTaskDetail = () => {
    dispatch(setSelectedItem(null))
    setMobilePanel('tasks')
  }

  useEffect(() => {
    if (!selectedItem || !todayProjectItems) {
      return
    }

    const freshSelectedItem = todayProjectItems.find(
      (item) => item.id === selectedItem.id
    )

    if (freshSelectedItem && freshSelectedItem !== selectedItem) {
      dispatch(setSelectedItem(freshSelectedItem))
    } else if (!freshSelectedItem) {
      dispatch(setSelectedItem(null))
    }
  }, [dispatch, selectedItem, todayProjectItems])

  // Initialize data
  useEffect(() => {

    // 监听每日重置完成事件，重新加载数据
    const handleDailyResetCompleted = () => {
      console.log('检测到每日重置完成，重新加载任务数据')
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

  return (
    <div className="app-page min-h-screen lg:h-screen flex flex-col">
      {/* Top navigation bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--foreground)] text-[var(--background)] shadow-sm">
              <span className="text-sm font-black">F</span>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Focus Timer
              </div>
              <div className="text-xs font-medium text-[var(--muted-foreground)]">
                Today&apos;s focus workspace
              </div>
            </div>
          </div>
        </div>

        <AppNavigation className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto" />

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            aria-label="Create project">
            <span className="text-lg">+</span>
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300 ring-2 ring-white/50 dark:ring-white/10"></div>
        </div>
      </header>

      <div className="lg:hidden px-4 sm:px-6 pt-4">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm backdrop-blur-md">
          {[
            { key: 'tasks', label: 'Timeline' },
            { key: 'insights', label: 'Insights' },
            { key: 'details', label: 'Details' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMobilePanel(item.key as typeof mobilePanel)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                mobilePanel === item.key
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div
          className={`grid min-h-[calc(100vh-10rem)] gap-4 lg:h-full lg:min-h-0 lg:gap-5 xl:gap-6 ${
            isInsightsOpen
              ? 'lg:grid-cols-[minmax(18rem,0.9fr)_minmax(20rem,1fr)_minmax(24rem,1.28fr)] xl:grid-cols-[minmax(20rem,0.92fr)_minmax(22rem,1fr)_minmax(28rem,1.35fr)]'
              : 'lg:grid-cols-[minmax(24rem,0.95fr)_minmax(28rem,1.55fr)]'
          }`}>
        {/* Left panel - Week & Activity */}
        <aside
          className={`${mobilePanel === 'insights' ? 'flex' : 'hidden'} ${
            isInsightsOpen ? 'lg:flex' : 'lg:hidden'
          } app-surface min-h-0 flex-col overflow-visible rounded-[1.35rem] border p-3 backdrop-blur-xl lg:overflow-hidden xl:p-4`}>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="hidden items-center justify-between px-1 lg:flex">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.55)]" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      Insights
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      Focus rhythm
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsInsightsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  aria-label="Collapse insights">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M15 6l-6 6 6 6"
                    />
                  </svg>
                </button>
              </div>

              <div className="hidden h-px bg-[var(--border)] lg:block" />

              {/* Week area - using independent WeekChart component */}
              <div className="h-[20rem] shrink-0 rounded-2xl sm:h-[22rem] lg:h-auto lg:min-h-[18rem] lg:flex-1">
                <WeekChart userId={DEFAULT_USER_ID} />
              </div>

              {/* Activity area - re-enabled, now using tasks API */}
              <div className="shrink-0 rounded-2xl lg:min-h-[18rem] lg:flex-1">
                <ActivityCalendar />
              </div>
            </div>
        </aside>

        {/* Middle panel - Work timeline */}
        <section
          className={`${mobilePanel === 'tasks' ? 'block' : 'hidden'} app-surface lg:block min-h-0 rounded-[2rem] border p-4 backdrop-blur-md sm:p-5 lg:p-6`}>
          <div className="flex h-full min-h-[calc(100vh-12rem)] flex-col lg:min-h-0">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  Today
                </h2>
                <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                  {timelineItems.length} projects
                </span>
              </div>
              <button
                onClick={() => setMobilePanel('details')}
                className="lg:hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]">
                Details
              </button>
            </div>

            <div className="relative flex-1 min-h-[32rem] lg:min-h-0">
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[var(--surface)] to-transparent z-20"></div>

              <div className="h-full overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex flex-col justify-center h-full gap-4 px-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-24 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : timelineItems.length === 0 ? (
                  // Empty state display
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--surface-muted)] flex items-center justify-center mb-4">
                      <span className="text-2xl">📝</span>
                    </div>
                    <h3 className="text-[var(--foreground)] text-lg font-medium mb-2">
                      No Projects
                    </h3>
                    <p className="text-[var(--muted-foreground)] text-sm mb-6 max-w-xs">
                      Click the + button in the top right to create your first
                      project
                    </p>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90">
                      Create Project
                    </button>
                  </div>
                ) : (
                  // Normal task list
                  <div className="relative space-y-5 pt-6 pb-8">
                    <div
                      className="absolute left-7 top-0 w-0.5 bg-[var(--border)]"
                      style={{ height: 'calc(100% + 400px)' }}></div>
                    {timelineItems.map((item) => (
                      <div key={item.id} className="relative flex items-start group">
                        {/* Left side: Time and Icon vertical stack */}
                        <div className="w-14 flex flex-col items-center flex-shrink-0 pt-0.5">
                          <div className={`z-20 mb-2 rounded-md px-2 py-1 text-xs font-extrabold tracking-wide shadow-sm ring-1 ring-[var(--border)] transition-colors ${
                            item.completed 
                              ? 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]' 
                              : 'bg-[var(--surface-elevated)] text-[var(--foreground)]'
                          }`}>
                            {item.time}
                          </div>
                          <div
                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-sm ${
                              item.completed ? 'opacity-75' : ''
                            }`}>
                            <span
                              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--surface)] ${
                                taskTypeConfig[item.type].color
                              }`}
                            />
                            <span className="text-base">{item.icon}</span>
                            {item.completed && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 ml-2">
                          <div
                            onClick={() => {
                              console.log(
                                'Direct card click:',
                                item.title,
                                item.id
                              )
                              dispatch(setSelectedItem(item))
                              setMobilePanel('details')
                            }}
                            className={`relative rounded-3xl p-4 transition-all duration-200 cursor-pointer group/card ${
                              item.completed
                                ? 'bg-[var(--surface-muted)] border-[var(--border)] opacity-80'
                                : 'bg-[var(--surface-elevated)] border-[var(--border)] hover:border-[var(--accent)]'
                            } ${
                              selectedItem?.id === item.id
                                ? 'border border-[var(--accent)] shadow-lg shadow-blue-500/10'
                                : 'border hover:bg-[var(--surface-solid)]'
                            }`}>
                            {/* Clickable main area - removed, changed to direct card click */}

                            {/* Hover delete area - right 1/5 */}
                            <div
                              className="absolute top-0 right-0 w-1/5 h-full z-20 group/delete"
                              onMouseEnter={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}>
                              {/* Delete button */}
                              <div className="opacity-0 group-hover/delete:opacity-100 transition-opacity duration-200 absolute top-1/2 right-3 transform -translate-y-1/2">
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    await handleTaskDelete(item.id)
                                  }}
                                  className="w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 hover:border-red-400/60 text-red-400 hover:text-red-300 transition-all duration-200 flex items-center justify-center"
                                  aria-label={`Delete ${item.title}`}>
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <div className="relative z-10 overflow-hidden pr-8 sm:pr-10">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center flex-wrap gap-1">
                                    <h3
                                      className={`min-w-0 break-words font-medium text-base transition-colors ${
                                        selectedItem?.id === item.id
                                          ? 'text-[var(--accent)]'
                                          : item.completed
                                          ? 'text-[var(--muted-foreground)]'
                                          : 'text-[var(--foreground)]'
                                      } ${item.completed ? 'line-through' : ''}`}>
                                      <span
                                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                          taskTypeConfig[item.type].color
                                        }`}></span>
                                      {item.title}
                                    </h3>
                                    <span className="text-[var(--muted-foreground)] text-xs font-normal">
                                      · {taskTypeConfig[item.type].name}
                                    </span>
                                    {item.completed && (
                                      <span className="text-green-400 text-xs font-normal">
                                        · Completed {item.repetitionsToday && item.repetitionsToday > 1 ? `x${item.repetitionsToday}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                  {item.completed && item.type !== 'check-in' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/focus?id=${item.id}&repeat=true`);
                                      }}
                                      className="text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-md transition-colors"
                                    >
                                      Repeat
                                    </button>
                                  )}
                                  {item.durationMinutes > 0 && (
                                    <span className="text-[var(--muted-foreground)] text-xs bg-[var(--surface-muted)] backdrop-blur-sm px-2 py-1 rounded-md">
                                      {formatDuration(item.durationMinutes)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {item.details && (
                                <div className="space-y-1 mt-3">
                                  {item.details.map(
                                    (detail: string, detailIndex: number) => (
                                      <div
                                        key={detailIndex}
                                        className="text-[var(--muted-foreground)] text-sm flex items-start break-words">
                                        <span className="mt-2 w-1 h-1 bg-[var(--muted-foreground)] rounded-full mr-2 flex-shrink-0"></span>
                                        <span className="min-w-0">{detail}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="h-24 lg:h-48"></div>
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute z-10 bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent"></div>
            </div>
          </div>
        </section>

        {/* Right panel - Project details */}
        <section
          className={`${mobilePanel === 'details' ? 'flex' : 'hidden'} app-surface lg:flex min-h-0 flex-col rounded-[2rem] border p-4 backdrop-blur-md sm:p-5 lg:p-6`}>
          <div className="app-surface-solid rounded-3xl p-5 sm:p-6 xl:p-8 flex-1 border flex flex-col overflow-hidden min-h-[calc(100vh-12rem)] lg:min-h-0">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Task Details</h2>
              <button
                onClick={() => setMobilePanel('tasks')}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)]">
                Timeline
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskDetailCard
                selectedItem={selectedItem}
                timelineItems={timelineItems}
                onSelectItem={(item) => dispatch(setSelectedItem(item))}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onClose={handleCloseTaskDetail}
                onAddTask={() => setIsAddModalOpen(true)}
              />
            </div>
          </div>
        </section>
        </div>
      </div>

      {!isInsightsOpen && (
        <button
          onClick={() => setIsInsightsOpen(true)}
          className="group fixed left-0 top-36 z-40 hidden h-11 w-10 items-center justify-center rounded-r-xl border border-l-0 border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted-foreground)] shadow-lg backdrop-blur-xl transition-colors hover:text-[var(--foreground)] lg:flex"
          aria-label="Expand insights panel">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M4 19V5m6 14V9m6 10V3m4 16H3"
            />
          </svg>
          <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-slate-500 transition-colors group-hover:bg-amber-400" />
        </button>
      )}

      {/* Simplified task creation modal */}
      <SimpleTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  )
}
