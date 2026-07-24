'use client'

import type { Dispatch, SetStateAction } from 'react'
import { taskTypeConfig } from '@/lib/constants'
import { ProjectItem } from '@/lib/api'

interface TaskHeaderSectionProps {
  selectedItem: ProjectItem
  isEditingTask: boolean
  isUpdating: boolean
  editingTaskData: {
    title: string
    time: string
    tags: string[]
    durationMinutes: number
  }
  setEditingTaskData: Dispatch<
    SetStateAction<{
      title: string
      time: string
      tags: string[]
      durationMinutes: number
    }>
  >
  onStartEditingTask: () => void
  onSaveTaskEdit: () => void
  onCancelTaskEdit: () => void
  onRemoveTag: (index: number) => void
  onAddTag: (tag: string) => void
  onHandleCheckInToggle: (task: ProjectItem) => void
  onRequestDelete: () => void
}

export default function TaskHeaderSection({
  selectedItem,
  isEditingTask,
  isUpdating,
  editingTaskData,
  setEditingTaskData,
  onStartEditingTask,
  onSaveTaskEdit,
  onCancelTaskEdit,
  onRemoveTag,
  onAddTag,
  onHandleCheckInToggle,
  onRequestDelete,
}: TaskHeaderSectionProps) {
  const isCheckInTask = selectedItem.type === 'check-in'
  const typeName = taskTypeConfig[selectedItem.type ?? 'todo'].name

  if (isEditingTask) {
    return (
      <div className="mb-5 space-y-4 border-b border-[var(--border)] pb-5">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
            Task title
          </label>
          <input
            type="text"
            value={editingTaskData.title}
            onChange={(event) =>
              setEditingTaskData((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-lg font-semibold text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Enter task title"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
              Planned time
            </label>
            <input
              type="time"
              value={editingTaskData.time}
              onChange={(event) =>
                setEditingTaskData((previous) => ({
                  ...previous,
                  time: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          {!isCheckInTask && (
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
                Minutes
              </label>
              <input
                type="number"
                min="1"
                max="480"
                step="1"
                value={editingTaskData.durationMinutes}
                onChange={(event) =>
                  setEditingTaskData((previous) => ({
                    ...previous,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--muted-foreground)]">
            Tags
          </label>
          {editingTaskData.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {editingTaskData.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(index)}
                    className="grid h-5 w-5 place-items-center rounded text-[var(--muted-foreground)] hover:text-red-500"
                    aria-label={`Remove ${tag} tag`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="Type a tag and press Enter"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              const input = event.currentTarget
              onAddTag(input.value.trim())
              input.value = ''
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaveTaskEdit}
            disabled={isUpdating || !editingTaskData.title.trim()}
            className="h-10 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50">
            {isUpdating ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onCancelTaskEdit}
            className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 border-b border-[var(--border)] pb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
            <span>{typeName}</span>
            {selectedItem.completed && (
              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
                Completed
                {selectedItem.repetitionsToday && selectedItem.repetitionsToday > 1
                  ? ` ×${selectedItem.repetitionsToday}`
                  : ''}
              </span>
            )}
          </div>
          <h3 className="mt-2 break-words text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] sm:text-2xl">
            {selectedItem.title}
          </h3>
          {selectedItem.tags && selectedItem.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedItem.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted-foreground)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isCheckInTask && (
            <button
              type="button"
              onClick={() => onHandleCheckInToggle(selectedItem)}
              disabled={isUpdating}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                selectedItem.completed
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-emerald-500 hover:text-emerald-600'
              } disabled:opacity-50`}
              aria-label={
                selectedItem.completed ? 'Mark check-in incomplete' : 'Complete check-in'
              }>
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
          )}
          <button
            type="button"
            onClick={onStartEditingTask}
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Edit task">
            <svg
              className="h-4 w-4"
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
            onClick={onRequestDelete}
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-red-500/10 hover:text-red-500"
            aria-label="Delete task">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true">
              <path
                d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      </div>

      {selectedItem.completed && selectedItem.type !== 'check-in' && (
        <button
          type="button"
          onClick={() => {
            window.location.href = `/focus?id=${selectedItem.id}&repeat=true`
          }}
          className="mt-4 h-9 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Repeat task
        </button>
      )}
    </div>
  )
}
