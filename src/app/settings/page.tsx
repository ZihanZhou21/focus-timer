'use client'

import Layout from '@/components/Layout'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  // 设置状态
  const [focusTime, setFocusTime] = useState(90)
  const [breakTime, setBreakTime] = useState(20)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoStartBreak, setAutoStartBreak] = useState(false)
  const [reminderInterval, setReminderInterval] = useState(5)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

  // 每日重置相关状态
  const [schedulerStatus, setSchedulerStatus] = useState({
    isRunning: false,
    nextRun: null as string | null,
  })
  const [resetStatus, setResetStatus] = useState({
    totalTasks: 0,
    completedCheckIns: 0,
    completedTodos: 0,
    todosWithProgress: 0,
    canReset: false,
  })
  const [isResetting, setIsResetting] = useState(false)
  const [lastResetTime, setLastResetTime] = useState<string | null>(null)

  // 加载定时任务状态和重置状态
  useEffect(() => {
    loadSchedulerStatus()
    loadResetStatus()
  }, [])

  // 获取定时任务状态
  const loadSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/scheduler')
      if (response.ok) {
        const status = await response.json()
        setSchedulerStatus(status)
      }
    } catch (error) {
      console.error('获取定时任务状态失败:', error)
    }
  }

  // 获取重置状态
  const loadResetStatus = async () => {
    try {
      const response = await fetch('/api/tasks/reset-daily')
      if (response.ok) {
        const status = await response.json()
        setResetStatus(status)
      }
    } catch (error) {
      console.error('获取重置状态失败:', error)
    }
  }

  // 手动执行重置
  const handleManualReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-now' }),
      })

      if (response.ok) {
        const result = await response.json()
        setLastResetTime(new Date().toISOString())
        await loadResetStatus() // 重新加载状态
        alert(result.message)
      } else {
        alert('重置失败，请稍后重试')
      }
    } catch (error) {
      console.error('手动重置失败:', error)
      alert('重置失败，请稍后重试')
    } finally {
      setIsResetting(false)
    }
  }

  // 控制定时任务
  const handleSchedulerControl = async (action: 'start' | 'stop') => {
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        const result = await response.json()
        setSchedulerStatus(result.status)
        alert(result.message)
      } else {
        alert('操作失败，请稍后重试')
      }
    } catch (error) {
      console.error('控制定时任务失败:', error)
      alert('操作失败，请稍后重试')
    }
  }

  const handleSave = () => {
    // 这里可以添加保存设置的逻辑
    alert('设置已保存！')
  }

  const handleReset = () => {
    setFocusTime(90)
    setBreakTime(20)
    setNotificationsEnabled(true)
    setSoundEnabled(true)
    setAutoStartBreak(false)
    setReminderInterval(5)
    setTheme('auto')
  }

  return (
    <Layout title="偏好设置">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 计时器设置 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-stone-200/50 dark:border-slate-600/50">
          <h3 className="text-lg font-light text-stone-700 dark:text-slate-200 mb-6">
            计时器设置
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-light text-stone-600 dark:text-slate-400 mb-2">
                专注时间 (分钟)
              </label>
              <input
                type="range"
                min="25"
                max="120"
                step="5"
                value={focusTime}
                onChange={(e) => setFocusTime(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 mt-1">
                <span>25分钟</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {focusTime}分钟
                </span>
                <span>120分钟</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-light text-stone-600 dark:text-slate-400 mb-2">
                休息时间 (分钟)
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={breakTime}
                onChange={(e) => setBreakTime(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-stone-500 dark:text-slate-400 mt-1">
                <span>5分钟</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {breakTime}分钟
                </span>
                <span>30分钟</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-light text-stone-600 dark:text-slate-400 mb-2">
                提醒间隔 (分钟)
              </label>
              <select
                value={reminderInterval}
                onChange={(e) => setReminderInterval(Number(e.target.value))}
                className="w-full px-4 py-2 bg-stone-50 dark:bg-slate-700 border border-stone-200 dark:border-slate-600 rounded-lg text-stone-700 dark:text-slate-200 font-light">
                <option value={3}>3分钟</option>
                <option value={5}>5分钟</option>
                <option value={10}>10分钟</option>
                <option value={15}>15分钟</option>
              </select>
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-stone-200/50 dark:border-slate-600/50">
          <h3 className="text-lg font-light text-stone-700 dark:text-slate-200 mb-6">
            通知设置
          </h3>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-light text-stone-700 dark:text-slate-200">
                  桌面通知
                </div>
                <div className="text-xs text-stone-500 dark:text-slate-400">
                  在浏览器中显示通知
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationsEnabled
                    ? 'bg-amber-500'
                    : 'bg-stone-300 dark:bg-slate-600'
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-light text-stone-700 dark:text-slate-200">
                  提示音
                </div>
                <div className="text-xs text-stone-500 dark:text-slate-400">
                  播放提醒音效
                </div>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled
                    ? 'bg-amber-500'
                    : 'bg-stone-300 dark:bg-slate-600'
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-light text-stone-700 dark:text-slate-200">
                  自动开始休息
                </div>
                <div className="text-xs text-stone-500 dark:text-slate-400">
                  专注时间结束后自动开始休息
                </div>
              </div>
              <button
                onClick={() => setAutoStartBreak(!autoStartBreak)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoStartBreak
                    ? 'bg-amber-500'
                    : 'bg-stone-300 dark:bg-slate-600'
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoStartBreak ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 外观设置 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-stone-200/50 dark:border-slate-600/50">
          <h3 className="text-lg font-light text-stone-700 dark:text-slate-200 mb-6">
            外观设置
          </h3>

          <div>
            <label className="block text-sm font-light text-stone-600 dark:text-slate-400 mb-3">
              主题模式
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: '浅色', icon: '☀️' },
                { value: 'dark', label: '深色', icon: '🌙' },
                { value: 'auto', label: '自动', icon: '🔄' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setTheme(option.value as 'light' | 'dark' | 'auto')
                  }
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    theme === option.value
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-stone-200 dark:border-slate-600 hover:border-stone-300 dark:hover:border-slate-500 text-stone-600 dark:text-slate-400'
                  }`}>
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="text-sm font-light">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 每日重置管理 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-stone-200/50 dark:border-slate-600/50">
          <h3 className="text-lg font-light text-stone-700 dark:text-slate-200 mb-6">
            每日重置管理
          </h3>

          <div className="space-y-6">
            {/* 当前状态 */}
            <div className="bg-stone-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-stone-700 dark:text-slate-200 mb-3">
                当前状态
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-stone-500 dark:text-slate-400">
                    总任务数:
                  </span>
                  <span className="ml-2 font-medium text-stone-700 dark:text-slate-200">
                    {resetStatus.totalTasks}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400">
                    已完成打卡:
                  </span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                    {resetStatus.completedCheckIns}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400">
                    已完成任务:
                  </span>
                  <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                    {resetStatus.completedTodos}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 dark:text-slate-400">
                    有进度任务:
                  </span>
                  <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                    {resetStatus.todosWithProgress}
                  </span>
                </div>
              </div>
            </div>

            {/* 定时任务状态 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-light text-stone-700 dark:text-slate-200">
                  自动每日重置
                </div>
                <div className="text-xs text-stone-500 dark:text-slate-400">
                  {schedulerStatus.isRunning
                    ? `每日00:05自动重置 ${
                        schedulerStatus.nextRun
                          ? `(下次: ${new Date(
                              schedulerStatus.nextRun
                            ).toLocaleString()})`
                          : ''
                      }`
                    : '当前未启用自动重置'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    schedulerStatus.isRunning ? 'bg-green-500' : 'bg-stone-400'
                  }`}></div>
                <button
                  onClick={() =>
                    handleSchedulerControl(
                      schedulerStatus.isRunning ? 'stop' : 'start'
                    )
                  }
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    schedulerStatus.isRunning
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                  }`}>
                  {schedulerStatus.isRunning ? '停止' : '启动'}
                </button>
              </div>
            </div>

            {/* 手动重置 */}
            <div className="border-t border-stone-200 dark:border-slate-600 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-light text-stone-700 dark:text-slate-200">
                    手动重置
                  </div>
                  <div className="text-xs text-stone-500 dark:text-slate-400">
                    立即重置所有任务和打卡的进度
                    {lastResetTime && (
                      <span className="ml-2">
                        (上次重置: {new Date(lastResetTime).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleManualReset}
                  disabled={!resetStatus.canReset || isResetting}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    resetStatus.canReset && !isResetting
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                      : 'bg-stone-100 dark:bg-slate-700 text-stone-400 dark:text-slate-500 cursor-not-allowed'
                  }`}>
                  {isResetting
                    ? '重置中...'
                    : resetStatus.canReset
                    ? '立即重置'
                    : '无需重置'}
                </button>
              </div>
            </div>

            {/* 说明 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-amber-600 dark:text-amber-400 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                    重置说明
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    <p>• 打卡任务: 重置完成状态，保留历史记录</p>
                    <p>• TODO任务: 重置完成状态和进度，清空时间记录</p>
                    <p>
                      • 自动重置: 每日凌晨00:05执行，确保新一天的任务从零开始
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 border border-stone-200/50 dark:border-slate-600/50">
          <h3 className="text-lg font-light text-stone-700 dark:text-slate-200 mb-6">
            数据管理
          </h3>

          <div className="space-y-4">
            <button className="w-full px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 border-2 border-blue-200 rounded-xl font-light transition-all duration-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
              导出数据
            </button>

            <button className="w-full px-6 py-3 bg-green-50 hover:bg-green-100 text-green-600 border-2 border-green-200 rounded-xl font-light transition-all duration-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-800">
              导入数据
            </button>

            <button className="w-full px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 rounded-xl font-light transition-all duration-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800">
              清除所有数据
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 px-8 py-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border-2 border-amber-200 rounded-full font-light text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            保存设置
          </button>

          <button
            onClick={handleReset}
            className="flex-1 px-8 py-4 bg-stone-100 hover:bg-stone-200 text-stone-600 border-2 border-stone-200 rounded-full font-light text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 dark:border-slate-600">
            重置默认
          </button>
        </div>
      </div>
    </Layout>
  )
}
