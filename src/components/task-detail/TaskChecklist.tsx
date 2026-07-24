'use client'

interface TaskChecklistProps {
  details: string[] | undefined
  editingDetail: number | null
  editingText: string
  completedDetails: Set<number>
  onStartEditing: (index: number, text: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDeleteDetail: (index: number) => void
  onToggleDetail: (index: number) => void
  onAddNewDetail: () => void
  setEditingText: (text: string) => void
  isCheckInTask: boolean
  time: string
}

export default function TaskChecklist({
  details,
  editingDetail,
  editingText,
  completedDetails,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDeleteDetail,
  onToggleDetail,
  onAddNewDetail,
  setEditingText,
  isCheckInTask,
  time,
}: TaskChecklistProps) {
  const itemCount = details?.length ?? 0

  return (
    <div className="min-h-0 flex-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)]">
            {isCheckInTask ? 'Check-in notes' : 'Checklist'}
          </h4>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
            {time ? ` · ${time}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNewDetail}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          <svg
            className="h-3.5 w-3.5"
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
          Add item
        </button>
      </div>

      {itemCount === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-sm leading-6 text-[var(--muted-foreground)]">
          Add a short next step so the task is easier to begin.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[var(--border)]">
          {details?.map((detail, index) => {
            const isComplete = completedDetails.has(index)
            const isEditing = editingDetail === index

            return (
              <div
                key={`${detail}-${index}`}
                className="group flex items-start gap-3 py-3.5">
                <button
                  type="button"
                  onClick={() => onToggleDetail(index)}
                  aria-label={isComplete ? 'Mark item incomplete' : 'Complete item'}
                  aria-pressed={isComplete}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                    isComplete
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-[var(--surface-solid)] text-transparent hover:border-[var(--accent)] dark:border-slate-600'
                  }`}>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 12 12"
                    aria-hidden="true">
                    <path
                      d="m2.5 6 2.2 2.2L9.5 3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>

                {isEditing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') onSaveEdit()
                        if (event.key === 'Escape') onCancelEdit()
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={onSaveEdit}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                      aria-label="Save checklist item">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true">
                        <path
                          d="m6 12 4 4 8-8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      aria-label="Cancel editing checklist item">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true">
                        <path
                          d="m7 7 10 10M17 7 7 17"
                          strokeLinecap="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <p
                      className={`min-w-0 text-sm leading-6 ${
                        isComplete
                          ? 'text-[var(--muted-foreground)] line-through'
                          : 'text-[var(--foreground)]'
                      }`}>
                      {detail}
                    </p>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => onStartEditing(index, detail)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        aria-label="Edit checklist item">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true">
                          <path
                            d="M13.5 6.5 17.5 10.5M5 19l1-4 9.8-9.8a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L9 18l-4 1Z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDetail(index)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Delete checklist item">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true">
                          <path
                            d="M6 7h12m-9 0V4h6v3m-7 0 .8 13h6.4L16 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
