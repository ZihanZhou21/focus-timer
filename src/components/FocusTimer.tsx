'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArcWatchFace,
  SimpleWatchFace,
  DigitalWatchFace,
  WatchFaceType,
} from '@/components/watchfaces'

interface FocusTimerProps {
  showSettings?: boolean
  className?: string
  initialFocusTime?: number // 分钟
  initialBreakTime?: number // 分钟
}

export default function FocusTimer({
  showSettings = true,
  className = '',
  initialFocusTime = 90,
  initialBreakTime = 20,
}: FocusTimerProps) {
  // 状态管理
  const [mode, setMode] = useState<'focus' | 'break'>('focus') // 当前模式：专注/休息
  const [timeLeft, setTimeLeft] = useState<number>(initialFocusTime * 60) // 剩余时间（秒）
  const [isRunning, setIsRunning] = useState<boolean>(false) // 计时器是否运行中
  const [completedCycles, setCompletedCycles] = useState<number>(0) // 完成的循环次数
  const [watchFaceType, setWatchFaceType] = useState<WatchFaceType>('arc')
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false) // 菜单开关状态

  // 引用
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const nextAlertTimeRef = useRef<number | null>(null) // 使用ref替代state
  const menuRef = useRef<HTMLDivElement | null>(null) // 菜单引用

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      // 尝试获取通知权限
      Notification.requestPermission()
    }
  }, [])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略在输入框中的按键
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          toggleTimer()
          break
        case 'KeyR':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault()
            resetTimer()
          }
          break
        case 'Escape':
          if (isMenuOpen) {
            setIsMenuOpen(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  // 表盘选择处理函数
  const handleWatchFaceSelect = (type: WatchFaceType) => {
    setWatchFaceType(type)
    setIsMenuOpen(false)
  }

  // 获取表盘显示名称
  const getWatchFaceName = (type: WatchFaceType) => {
    switch (type) {
      case 'arc':
        return '弧形段'
      case 'simple':
        return '简约圆环'
      case 'digital':
        return '数字方块'
      default:
        return '弧形段'
    }
  }

  // 生成3-5分钟的随机时间（秒）
  const generateRandomTime = (): number => {
    return Math.floor(Math.random() * (5 * 60 - 3 * 60 + 1) + 3 * 60)
  }

  // 播放提示音
  const playAlert = () => {
    try {
      // 尝试使用浏览器内置API播放提示音
      if ('Audio' in window) {
        new Audio('/alert.mp3').play().catch(() => {
          console.log('尝试使用其他方式播放提示音')
          // 如果播放失败，尝试使用浏览器通知
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('专注提醒', { body: '请保持专注' })
          } else {
            console.log('提示音播放')
          }
        })
      } else if (
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('专注提醒', { body: '请保持专注' })
      } else {
        console.log('提示音播放')
      }
    } catch (error) {
      console.error('提示音播放失败:', error)
    }
  }

  // 开始/暂停计时器
  const toggleTimer = () => {
    setIsRunning((prev) => {
      const newIsRunning = !prev
      if (newIsRunning && mode === 'focus') {
        // 立即设置第一个随机时间
        setTimeout(() => {
          const randomTime = generateRandomTime()
          nextAlertTimeRef.current = randomTime
        }, 0)
      }
      return newIsRunning
    })
  }

  // 重置计时器
  const resetTimer = () => {
    setIsRunning(false)
    setMode('focus')
    setTimeLeft(initialFocusTime * 60)
    nextAlertTimeRef.current = null
    setCompletedCycles(0)
  }

  // 计时器效果
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          // 当计时结束时
          if (prev <= 1) {
            // 播放提示音
            playAlert()

            // 切换模式
            if (mode === 'focus') {
              setMode('break')
              nextAlertTimeRef.current = null // 休息模式清空提示时间
              return initialBreakTime * 60 // 切换到休息模式，initialBreakTime分钟
            } else {
              // 休息结束后停止计时器，不自动开始下一个循环
              setIsRunning(false)
              setCompletedCycles((c) => c + 1)
              nextAlertTimeRef.current = null
              return 0 // 停止计时
            }
          }

          // 检查是否需要触发提示音（仅在专注模式）
          if (
            mode === 'focus' &&
            nextAlertTimeRef.current !== null &&
            nextAlertTimeRef.current <= 1
          ) {
            playAlert()
            // 10秒后播放break_end.mp3
            setTimeout(() => {
              new Audio('/break_end.mp3').play().catch(() => {
                console.log('break_end.mp3播放失败')
              })
            }, 10000)
            // 设置下一次提示时间
            const randomTime = generateRandomTime()
            nextAlertTimeRef.current = randomTime
          }

          // 递减下一次提示的剩余时间（仅在专注模式）
          if (mode === 'focus' && nextAlertTimeRef.current !== null) {
            nextAlertTimeRef.current = nextAlertTimeRef.current - 1
          }

          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning, mode, initialBreakTime])

  // 格式化时间为 MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }

  // 计算进度百分比（倒计时）
  const getProgress = (): number => {
    const totalTime =
      mode === 'focus' ? initialFocusTime * 60 : initialBreakTime * 60
    return (timeLeft / totalTime) * 100
  }

  // 渲染当前选择的表盘
  const renderWatchFace = (progress: number) => {
    const watchFaceProps = {
      progress,
      timeLeft,
      mode,
      formatTime,
    }

    switch (watchFaceType) {
      case 'arc':
        return <ArcWatchFace {...watchFaceProps} />
      case 'simple':
        return <SimpleWatchFace {...watchFaceProps} />
      case 'digital':
        return <DigitalWatchFace {...watchFaceProps} />
      default:
        return <ArcWatchFace {...watchFaceProps} />
    }
  }

  return (
    <div className={`relative w-full max-w-lg ${className}`}>
      {/* 设置按钮 - 可选显示 */}
      {showSettings && (
        <div className="fixed top-6 right-6 z-20" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl border border-stone-200/50 dark:border-slate-600/50"
            title={`当前表盘: ${getWatchFaceName(watchFaceType)}`}>
            <svg
              className="w-5 h-5 text-stone-600 dark:text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* 下拉菜单 */}
          {isMenuOpen && (
            <div className="absolute top-16 right-0 w-52 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-stone-200/50 dark:border-slate-600/50 rounded-2xl shadow-xl z-30">
              <div className="p-4">
                <div className="text-xs font-medium text-stone-500 dark:text-slate-400 mb-3 tracking-wide uppercase">
                  表盘样式
                </div>
                <button
                  onClick={() => handleWatchFaceSelect('arc')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-all duration-200 rounded-xl mb-1 ${
                    watchFaceType === 'arc'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}>
                  弧形段
                </button>
                <button
                  onClick={() => handleWatchFaceSelect('simple')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-all duration-200 rounded-xl mb-1 ${
                    watchFaceType === 'simple'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}>
                  简约圆环
                </button>
                <button
                  onClick={() => handleWatchFaceSelect('digital')}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-all duration-200 rounded-xl ${
                    watchFaceType === 'digital'
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'text-stone-700 dark:text-slate-300'
                  }`}>
                  数字方块
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="text-center">
        {/* 计时器区域 - 成为焦点 */}
        <div className="mb-16">
          <div className="flex justify-center mb-6">
            {renderWatchFace(getProgress())}
          </div>

          {/* 下一次提示时间 - 更隐蔽 */}
          {nextAlertTimeRef.current !== null && (
            <div className="text-sm text-stone-500 dark:text-slate-400 font-light">
              下次提醒 {formatTime(nextAlertTimeRef.current)}
            </div>
          )}
        </div>

        {/* 控制按钮 - 简化设计 */}
        <div className="flex justify-center space-x-6 mb-12">
          <button
            onClick={toggleTimer}
            className={`px-8 py-4 rounded-full font-light text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 ${
              isRunning
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-600'
            }`}>
            {isRunning ? '暂停' : '开始'}
          </button>

          <button
            onClick={resetTimer}
            className="px-6 py-4 rounded-full font-light text-lg bg-stone-100 hover:bg-stone-200 text-stone-600 border-2 border-stone-200 transition-all duration-300 transform hover:scale-105 active:scale-95 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 dark:border-slate-600">
            重置
          </button>
        </div>

        {/* 统计信息 - 简化 */}
        <div className="text-stone-500 dark:text-slate-400 font-light">
          <div className="text-sm mb-4">已完成 {completedCycles} 个循环</div>
          <div className="text-xs text-stone-400 dark:text-slate-500 space-y-1">
            <div>
              {initialFocusTime}分钟专注 · {initialBreakTime}分钟休息
            </div>
            <div>随机间隔提醒助您保持专注</div>
          </div>
        </div>
      </div>
    </div>
  )
}
