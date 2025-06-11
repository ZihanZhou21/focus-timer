'use client'

import Layout from '@/components/Layout'
import { useState } from 'react'

export default function SettingsPage() {
  // 设置状态
  const [focusTime, setFocusTime] = useState(90)
  const [breakTime, setBreakTime] = useState(20)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoStartBreak, setAutoStartBreak] = useState(false)
  const [reminderInterval, setReminderInterval] = useState(5)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

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
