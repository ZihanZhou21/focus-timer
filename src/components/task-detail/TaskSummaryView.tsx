'use client'

import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/app/store'
import { startTimer, pauseTimer, resetTimer } from '@/app/slices/timerSlice'
import { ProjectItem } from '@/lib/api'
import { taskTypeConfig } from '@/lib/constants'

interface TaskSummaryViewProps {
  timelineItems: ProjectItem[]
  onSelectItem: (item: ProjectItem) => void
  calculateProgress: (item: ProjectItem) => number
  onAddTask?: () => void
}

export default function TaskSummaryView({
  timelineItems,
  onSelectItem,
  calculateProgress,
  onAddTask,
}: TaskSummaryViewProps) {
  const timer = useSelector((state: RootState) => state.timer)
  const dispatch = useDispatch()
  
  const activeTask = timelineItems.find(item => item.id === timer.taskId)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Reset timer for this task?')) {
      dispatch(resetTimer())
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 正在进行中的任务展示 (如有) */}
      {activeTask && (
        <div className="mb-7 h-[250px] flex-shrink-0 p-6 bg-[var(--surface-muted)] border border-[var(--border)] rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-5 opacity-40 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onSelectItem(activeTask)}
              className="text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
              title="View Details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 pr-10">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2.5">
                  <div className="flex space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${taskTypeConfig[activeTask.type].color} ${timer.isRunning ? 'animate-pulse' : ''}`}></div>
                    {timer.isRunning && <div className={`w-1.5 h-1.5 rounded-full ${taskTypeConfig[activeTask.type].color} animate-pulse [animation-delay:200ms]`}></div>}
                  </div>
                  <span className="text-[var(--accent)] text-[10px] font-bold tracking-[0.2em] uppercase">
                    {timer.isRunning ? 'Currently Focusing' : 'Focus Paused'}
                  </span>
                </div>
                <h4 className="truncate text-xl font-bold tracking-tight text-[var(--foreground)]">{activeTask.title}</h4>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-1">
              <div className="max-w-full text-center text-8xl font-mono font-black text-[var(--foreground)] tabular-nums tracking-tighter leading-none">
                {formatTime(timer.timeRemaining)}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-end gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                    Progress
                  </span>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    {Math.floor(timer.totalElapsed / 60)}m / {Math.floor(timer.totalEstimated / 60)}m
                  </span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    style={{ width: `${Math.min((timer.totalElapsed / timer.totalEstimated) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all border border-[var(--border)] shadow-lg group/btn"
                  title="Reset Timer"
                >
                  <svg className="w-5 h-5 group-hover/btn:rotate-[-45deg] transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (timer.isRunning) {
                      dispatch(pauseTimer())
                    } else {
                      dispatch(startTimer())
                    }
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-110 active:scale-90 border-2 ${
                    timer.isRunning
                    ? 'bg-amber-500 text-white border-amber-400/20 shadow-amber-500/40'
                    : 'bg-white text-slate-900 border-slate-200 shadow-white/20'
                  }`}
                >
                  {timer.isRunning ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 今日统计 */}
      <div className="mb-6 flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Today&apos;s Projects</h3>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition-colors hover:opacity-85"
              aria-label="Create project"
              title="Create project"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-semibold text-[var(--accent)]">
            {timelineItems.filter((item) => item.completed).length}
          </div>
          <div className="text-[var(--muted-foreground)]">/</div>
          <div className="text-lg text-[var(--muted-foreground)]">{timelineItems.length}</div>
        </div>
      </div>

      {timelineItems.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="relative grid h-full min-h-0 grid-cols-2 gap-4">
              {/* 渐变分隔线 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px transform -translate-x-1/2 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent"></div>

              {/* 已完成项目 */}
              <div className="flex min-h-0 flex-col pr-2">
                <h4 className="mb-2 flex-shrink-0 text-xs font-medium text-[var(--muted-foreground)]">Completed</h4>
                <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
                  {timelineItems
                    .filter((item) => item.completed)
                    .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="group relative bg-[var(--surface-muted)] hover:bg-[var(--surface)] rounded-3xl px-4 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              taskTypeConfig[item.type ?? 'todo'].color
                            }`}
                          ></span>
                          <h5 className="text-[var(--foreground)] text-sm truncate flex-1">{item.title}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 ml-2">
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* 进度条预览 */}
                      {item.type !== 'check-in' && (
                        <div className="mt-2">
                          <div className="w-full bg-[var(--border)] rounded-full h-1">
                            <div
                              className="bg-green-400 h-1 rounded-full"
                              style={{
                                width: `${calculateProgress(item)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                </div>
              </div>

              {/* 未完成项目 */}
              <div className="flex min-h-0 flex-col pl-2">
                <h4 className="mb-2 flex-shrink-0 text-xs font-medium text-[var(--muted-foreground)]">Incomplete</h4>
                <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
                  {timelineItems
                    .filter((item) => !item.completed)
                    .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="group relative bg-[var(--surface-muted)] hover:bg-[var(--surface)] rounded-3xl px-4 py-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              taskTypeConfig[item.type ?? 'todo'].color
                            }`}
                          ></span>
                          <h5 className="text-[var(--foreground)] text-sm truncate flex-1">{item.title}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-amber-400"></div>
                        </div>
                      </div>
                      {/* 进度条预览 */}
                      {item.type !== 'check-in' && (
                        <div className="mt-2">
                          <div className="w-full bg-[var(--border)] rounded-full h-1">
                            <div
                              className="bg-amber-400 h-1 rounded-full"
                              style={{
                                width: `${calculateProgress(item)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* 底部统计 - 置底 */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex-shrink-0">
            <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
              <span>
                Check-in{' '}
                {timelineItems.filter((item) => item.type === 'check-in' && item.completed).length}/
                {timelineItems.filter((item) => item.type === 'check-in').length}
              </span>
              <span>
                Tasks{' '}
                {timelineItems.filter((item) => item.type !== 'check-in' && item.completed).length}/
                {timelineItems.filter((item) => item.type !== 'check-in').length}
              </span>
            </div>
            {timelineItems.length > 0 && (
              <div className="mt-2 w-full bg-[var(--border)] rounded-full h-1">
                <div
                  className="bg-amber-500 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (timelineItems.filter((item) => item.completed).length /
                        timelineItems.length) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-[var(--muted-foreground)]">
            <p className="text-lg mb-2">No tasks</p>
            <p className="text-sm">Click on tasks in the timeline to view details</p>
          </div>
        </div>
      )}
    </div>
  )
}
