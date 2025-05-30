export type WatchFaceType = 'arc' | 'simple' | 'digital'

export interface WatchFaceProps {
  progress: number
  timeLeft: number
  mode: 'focus' | 'break'
  formatTime: (seconds: number) => string
}
