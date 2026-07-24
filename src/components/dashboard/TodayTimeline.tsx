'use client'

import { ProjectItem } from '@/lib/api'
import { taskTypeConfig } from '@/lib/constants'
import { formatDuration } from '@/lib/utils'

interface TodayTimelineProps {
  items: ProjectItem[]
  selectedId?: string
  isLoading: boolean
  onSelect: (item: ProjectItem) => void
  onAddTask: () => void
}

const hasDirtyText = (value: string) => /�|Ã|Â|å|æ|ç|ð/i.test(value)

const getTaskTitle = (item: ProjectItem) => {
  const title = item.title?.trim()
  return title && !hasDirtyText(title) ? title : 'Untitled task'
}

export default function TodayTimeline({
  items,
  selectedId,
  isLoading,
  onSelect,
  onAddTask,
}: TodayTimelineProps) {
  const openCount = items.filter((item) => !item.completed).length
  const doneCount = items.length - openCount
  const plannedMinutes = items.reduce(
    (total, item) => total + Math.max(item.durationMinutes || 0, 0),
    0
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Today
        </h2>
        <div className="text-right text-xs font-medium text-[var(--muted-foreground)] sm:text-sm">
          <span className="font-semibold text-[var(--foreground)]">{openCount}</span>{' '}
          open <span className="mx-1.5 text-[var(--border)]">·</span>
          <span className="font-semibold text-[var(--foreground)]">{doneCount}</span>{' '}
          done <span className="mx-1.5 text-[var(--border)]">·</span>
          <span className="font-semibold text-[var(--foreground)]">
            {plannedMinutes > 0 ? formatDuration(plannedMinutes) : '0m'}
          </span>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)]">
        {isLoading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex h-[76px] items-center gap-4 px-4">
                <div className="h-5 w-12 animate-pulse rounded bg-[var(--surface-muted)]" />
                <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                <div className="h-5 flex-1 animate-pulse rounded bg-[var(--surface-muted)]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <svg
                className="h-5 w-5"
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
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
              Your day is open
            </h3>
            <p className="mt-1 max-w-xs text-sm leading-6 text-[var(--muted-foreground)]">
              Add one task that genuinely belongs today.
            </p>
            <button
              type="button"
              onClick={onAddTask}
              className="mt-4 h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)]">
              New Task
            </button>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {items.map((item, index) => {
              const isSelected = selectedId === item.id
              const isLast = index === items.length - 1
              const title = getTaskTitle(item)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={isSelected}
                  aria-label={`${title}, ${item.time || 'Anytime'}, ${
                    item.completed ? 'completed' : taskTypeConfig[item.type].name
                  }`}
                  className={`group relative grid min-h-[72px] w-full grid-cols-[3.75rem_1.25rem_minmax(0,1fr)_1rem] items-stretch gap-2.5 border-b border-[var(--border)] px-3 text-left transition duration-200 last:border-b-0 sm:min-h-[76px] sm:grid-cols-[4.5rem_1.5rem_minmax(0,1fr)_1rem] sm:gap-3 sm:px-4 ${
                    isSelected
                      ? 'bg-[var(--accent-soft)]'
                      : 'hover:bg-[var(--surface-muted)]'
                  }`}>
                  {isSelected && (
                    <span className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" />
                  )}

                  <span
                    className={`flex items-center justify-center text-center text-[13px] font-semibold leading-none tabular-nums tracking-tight sm:text-sm ${
                      isSelected
                        ? 'text-[var(--accent)]'
                        : item.completed
                        ? 'text-[var(--muted-foreground)]'
                        : 'text-[var(--foreground)]'
                    }`}>
                    {item.time || 'Any'}
                  </span>

                  <span className="relative flex justify-center">
                    <span
                      className={`absolute left-1/2 top-0 w-px -translate-x-1/2 bg-[var(--border)] ${
                        index === 0 ? 'bottom-0 top-1/2' : isLast ? 'bottom-1/2' : 'bottom-0'
                      }`}
                    />
                    <span
                      className={`relative z-10 m-auto grid h-3.5 w-3.5 place-items-center rounded-full ring-[4px] ring-[var(--surface-solid)] ${
                        item.completed
                          ? 'bg-emerald-500 text-white'
                          : isSelected
                          ? 'border-2 border-[var(--accent)] bg-[var(--surface-solid)]'
                          : taskTypeConfig[item.type].color
                      }`}>
                      {item.completed && (
                        <svg
                          className="h-2.5 w-2.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 12 12"
                          aria-hidden="true">
                          <path
                            d="m3 6 2 2 4-4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      )}
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-col justify-center py-3">
                    <span
                      className={`truncate text-[15px] font-semibold sm:text-base ${
                        item.completed
                          ? 'text-[var(--muted-foreground)]'
                          : 'text-[var(--foreground)]'
                      }`}>
                      {title}
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>{taskTypeConfig[item.type].name}</span>
                      {item.durationMinutes > 0 && (
                        <>
                          <span className="text-[var(--border)]">·</span>
                          <span>{formatDuration(item.durationMinutes)}</span>
                        </>
                      )}
                      {item.completed && (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Completed
                        </span>
                      )}
                    </span>
                  </span>

                  <span className="flex items-center justify-end text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <path
                        d="m9 6 6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
