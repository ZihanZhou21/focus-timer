'use client'

import React from 'react'

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
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h4 className="text-slate-400 text-sm font-medium uppercase tracking-wider">
            {isCheckInTask ? 'Check-in List' : 'Task List'}
          </h4>
          <div className="text-slate-600">|</div>
          <span className="text-slate-400 text-sm">{time}</span>
        </div>
      </div>

      <div className="space-y-3">
        {details &&
          details.map((detail: string, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-b-0 group"
            >
              {editingDetail === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit()
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500"
                    autoFocus
                  />
                  <button
                    onClick={onSaveEdit}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-green-600/20 hover:bg-green-600/30 text-green-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 group/text">
                    <p className="text-white font-medium">{detail}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
                      <button
                        onClick={() => onStartEditing(index, detail)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteDetail(index)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 11a1 1 0 012 0v.01a1 1 0 01-2 0V11zm2-4a1 1 0 00-2 0v2a1 1 0 002 0V7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div
                    onClick={() => onToggleDetail(index)}
                    className={`w-5 h-5 rounded-full  transition-colors cursor-pointer flex items-center justify-center ${
                      completedDetails.has(index)
                        ? 'border-green-400/40 bg-green-400/20 text-white'
                        : ' border-2 border-amber-400/80 hover:border-amber-300'
                    }`}
                  >
                    {completedDetails.has(index) && (
                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
      </div>

      {/* 添加新清单项按钮 */}
      <div className="mt-4">
        <button
          onClick={onAddNewDetail}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
