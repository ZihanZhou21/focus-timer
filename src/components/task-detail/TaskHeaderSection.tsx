'use client'

import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { startTimer, pauseTimer, initializeTimer, resetTimer } from '@/app/slices/timerSlice'
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
  setEditingTaskData: React.Dispatch<React.SetStateAction<{
    title: string
    time: string
    tags: string[]
    durationMinutes: number
  }>>
  onStartEditingTask: () => void
  onSaveTaskEdit: () => void
  onCancelTaskEdit: () => void
  onRemoveTag: (index: number) => void
  onAddTag: (tag: string) => void
  onHandleCheckInToggle: (task: ProjectItem) => void
  getRemainingTime: (task: ProjectItem) => number
  getExecutedTime: (task: ProjectItem) => number
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
  getRemainingTime,
  getExecutedTime,
}: TaskHeaderSectionProps) {
  const isCheckInTask = selectedItem.type === 'check-in'
  const dispatch = useDispatch()
  const timer = useSelector((state: RootState) => state.timer)
  
  const isThisTaskActive = timer.taskId === selectedItem.id

  const handleStartTimer = () => {
    // 如果该任务不是当前计时任务，则初始化
    if (!isThisTaskActive) {
      const remaining = getRemainingTime(selectedItem)
      const executed = getExecutedTime(selectedItem)
      
      dispatch(initializeTimer({
        timeRemaining: remaining * 60,
        totalElapsed: executed * 60,
        totalEstimated: (remaining + executed) * 60,
        taskId: selectedItem.id,
        taskTitle: selectedItem.title,
        initialTime: selectedItem.durationMinutes || 25,
        originalRemaining: remaining,
        originalElapsed: executed
      }))
    }
    dispatch(startTimer())
  }

  const handlePauseTimer = () => {
    dispatch(pauseTimer())
  }

  const handleResetTimer = () => {
    if (window.confirm('Are you sure you want to reset the timer for this task?')) {
      dispatch(resetTimer())
    }
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex-1">
        {isEditingTask ? (
          // 编辑模式
          <div className="space-y-4">
            {/* 编辑标题 */}
            <div>
              <label className="block text-slate-400 text-xs mb-2">Task Title</label>
              <input
                type="text"
                value={editingTaskData.title}
                onChange={(e) =>
                  setEditingTaskData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-2xl font-bold focus:outline-none focus:border-amber-500"
                placeholder="Enter task title"
              />
            </div>

            {/* 编辑计划时间 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs mb-2">Planned Time</label>
                <input
                  type="time"
                  value={editingTaskData.time}
                  onChange={(e) =>
                    setEditingTaskData((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              {!isCheckInTask && (
                <div>
                  <label className="block text-slate-400 text-xs mb-2">
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    step="1"
                    value={editingTaskData.durationMinutes}
                    onChange={(e) =>
                      setEditingTaskData((prev) => ({
                        ...prev,
                        durationMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* 编辑标签 */}
            <div>
              <label className="block text-slate-400 text-xs mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editingTaskData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-600/50 rounded-md text-slate-300 text-xs"
                  >
                    #{tag}
                    <button
                      onClick={() => onRemoveTag(index)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tag"
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement
                      onAddTag(input.value.trim())
                      input.value = ''
                    }
                  }}
                />
              </div>
            </div>

            {/* 编辑操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={onSaveTaskEdit}
                disabled={isUpdating || !editingTaskData.title.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onCancelTaskEdit}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // 显示模式
          <div>
            {/* 任务类型标识和标题 */}
            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  taskTypeConfig[selectedItem.type ?? 'todo'].color
                }`}
              ></div>
              <h1 className="text-white text-3xl font-bold leading-tight">{selectedItem.title}</h1>
              {selectedItem.completed && selectedItem.type !== 'check-in' && (
                <div className="flex items-center gap-2 ml-3">
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                    Completed {selectedItem.repetitionsToday && selectedItem.repetitionsToday > 1 ? `x${selectedItem.repetitionsToday}` : ''}
                  </span>
                  <button
                    onClick={() => {
                      window.location.href = `/focus?id=${selectedItem.id}&repeat=true`;
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full transition-colors shadow-lg"
                  >
                    Repeat Task
                  </button>
                </div>
              )}
              <button
                onClick={onStartEditingTask}
                className="text-slate-400 hover:text-amber-400 transition-colors ml-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            </div>
            {/* 类型和标签在同一行 */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-slate-400 text-sm">
                {taskTypeConfig[selectedItem.type ?? 'todo'].name}
              </div>
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <>
                  <div className="text-slate-600">|</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-700/30 rounded-md text-slate-400 text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮组 */}
      {!isEditingTask && (
        <div className="flex items-center gap-3">
          {/* 主要操作按钮 */}
          {isCheckInTask ? (
            <button
              onClick={() => onHandleCheckInToggle(selectedItem)}
              disabled={isUpdating}
              className={`w-16 h-16 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                selectedItem.completed
                  ? 'border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUpdating ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : selectedItem.completed ? (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ) : selectedItem.completed || selectedItem.status === 'completed' ? (
            // 任务已完成，显示完成状态
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-green-500/50 bg-green-500/10 text-green-400 rounded-full">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            // 任务未完成，显示开始/暂停按钮
            <div className="flex gap-2">
              {isThisTaskActive && (
                <button
                  onClick={handleResetTimer}
                  className="inline-flex items-center justify-center w-10 h-10 border border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-full transition-all duration-200 self-center mr-1"
                  title="Reset Timer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              {isThisTaskActive && timer.isRunning ? (
                <button
                  onClick={handlePauseTimer}
                  className="inline-flex items-center justify-center w-16 h-16 border-2 border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-full transition-all duration-200"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleStartTimer}
                  className="inline-flex items-center justify-center w-16 h-16 border-2 border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white rounded-full transition-all duration-200"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
