'use client'

import { ProjectItem } from '@/lib/api'
import { formatDuration } from '@/lib/utils'

interface NextFocusCardProps {
  item: ProjectItem | null
  onStart: (item: ProjectItem) => void
  onAddTask: () => void
}

const hasDirtyText = (value: string) => /�|Ã|Â|å|æ|ç|ð/i.test(value)

const getTaskTitle = (item: ProjectItem) => {
  const title = item.title?.trim()
  return title && !hasDirtyText(title) ? title : 'Untitled task'
}

export default function NextFocusCard({
  item,
  onStart,
  onAddTask,
}: NextFocusCardProps) {
  if (!item) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-solid)] px-5 py-6 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Make room for one important thing
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">
          Add a task with a planned time, then start when you are ready.
        </p>
        <button
          type="button"
          onClick={onAddTask}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:opacity-95">
          New Task
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Next focus
          </div>
          <h2 className="mt-1 break-words text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">
            {getTaskTitle(item)}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
                  <path
                    d="M12 7.5v5l3 1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <span className="tabular-nums text-[var(--foreground)]">
                {item.time || 'Anytime'}
              </span>
            </div>

            {item.durationMinutes > 0 && (
              <>
                <span className="hidden h-5 w-px bg-[var(--border)] sm:block" />
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true">
                      <path
                        d="M8 4h8M8 20h8M9 4c0 3 1 4.5 3 6 2-1.5 3-3 3-6M9 20c0-3 1-4.5 3-6 2 1.5 3 3 3 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                  <span>{formatDuration(item.durationMinutes)} planned</span>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart(item)}
          className="dashboard-primary-cta inline-flex h-11 w-full shrink-0 items-center justify-center rounded-xl border px-5 text-sm font-semibold transition-[transform,background,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 md:h-10 md:w-auto md:min-w-36 md:rounded-lg">
          Start Focus
        </button>
      </div>
    </section>
  )
}
