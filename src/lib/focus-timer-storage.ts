const STORAGE_PREFIX = 'focus-timer'

export type StoredFocusTimerState = {
  timeRemaining: number
  totalElapsed: number
  totalEstimated: number
  lastSaveTime: number
  wasRunning?: boolean
}

export const getFocusTimerStorageKey = (taskId?: string | null) => {
  if (!taskId) {
    return `${STORAGE_PREFIX}-practice`
  }
  return `${STORAGE_PREFIX}-${taskId}`
}

export const loadFocusTimerState = (
  storageKey: string,
  maxAgeHours = 24
): StoredFocusTimerState | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredFocusTimerState | undefined
    if (
      !parsed ||
      typeof parsed.timeRemaining !== 'number' ||
      typeof parsed.totalElapsed !== 'number' ||
      typeof parsed.totalEstimated !== 'number' ||
      typeof parsed.lastSaveTime !== 'number'
    ) {
      return null
    }

    const ageHours = (Date.now() - parsed.lastSaveTime) / (1000 * 60 * 60)
    if (ageHours > maxAgeHours) {
      localStorage.removeItem(storageKey)
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to load focus timer state:', error)
    return null
  }
}

export const saveFocusTimerState = (
  storageKey: string,
  state: StoredFocusTimerState
) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save focus timer state:', error)
  }
}

export const clearFocusTimerState = (storageKey: string) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Failed to clear focus timer state:', error)
  }
}
