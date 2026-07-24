'use client'

import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { ProjectItem } from '@/lib/api'

interface TaskSummaryViewProps {
  timelineItems: ProjectItem[]
  onSelectItem: (item: ProjectItem) => void
  onAddTask?: () => void
}

const hasDirtyText = (value: string) => /�|Ã|Â|å|æ|ç|ð/i.test(value)

const getTaskTitle = (item: ProjectItem) => {
  const title = item.title?.trim()
  return title && !hasDirtyText(title) ? title : 'Untitled task'
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TaskSummaryView({
  timelineItems,
  onSelectItem,
  onAddTask,
}: TaskSummaryViewProps) {
  const timer = useSelector((state: RootState) => state.timer)
  const activeTask = timelineItems.find((item) => item.id === timer.taskId)

  return (
    <div className="flex h-full min-h-[20rem] flex-col items-center justify-center px-4 text-center">
      {activeTask ? (
        <button
          type="button"
          onClick={() => onSelectItem(activeTask)}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-left transition hover:border-[var(--accent)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              <span
                className={`h-2 w-2 rounded-full ${
                  timer.isRunning ? 'animate-pulse bg-amber-400' : 'bg-slate-400'
                }`}
              />
              {timer.isRunning ? 'Focusing' : 'Paused'}
            </span>
            <span className="text-xs font-medium text-[var(--accent)]">
              View details
            </span>
          </div>
          <h3 className="mt-3 truncate text-lg font-semibold text-[var(--foreground)]">
            {getTaskTitle(activeTask)}
          </h3>
          <div className="mt-4 text-3xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatTime(timer.timeRemaining)}
          </div>
        </button>
      ) : (
        <>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true">
              <path
                d="M8 7h8M8 12h6m-6 5h4M5 4h14v16H5z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
            Select a task
          </h3>
          <p className="mt-2 max-w-[16rem] text-sm leading-6 text-[var(--muted-foreground)]">
            Choose an item from Today to inspect its progress and next steps.
          </p>
          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="mt-5 h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              New Task
            </button>
          )}
        </>
      )}
    </div>
  )
}
