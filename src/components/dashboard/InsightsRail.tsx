'use client'

import ActivityCalendar from '@/components/ActivityCalendar'
import WeekChart from '@/components/WeekChart'
import { DEFAULT_USER_ID } from '@/lib/constants'

interface InsightsRailProps {
  onClose?: () => void
}

export default function InsightsRail({ onClose }: InsightsRailProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Insights
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Rhythm and consistency
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close insights"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
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
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <WeekChart userId={DEFAULT_USER_ID} compact />
        <ActivityCalendar compact />
      </div>
    </div>
  )
}
