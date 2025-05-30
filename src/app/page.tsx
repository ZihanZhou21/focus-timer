'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArcWatchFace,
  SimpleWatchFace,
  DigitalWatchFace,
  WatchFaceType,
} from '@/components/watchfaces'

export default function Home() {
  // 状态管理
  const [mode, setMode] = useState<'focus' | 'break'>('focus') // 当前模式：专注/休息
  const [timeLeft, setTimeLeft] = useState<number>(90 * 60) // 剩余时间（秒）
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
    setTimeLeft(90 * 60)
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
              return 20 * 60 // 切换到休息模式，20分钟
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
  }, [isRunning, mode])

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
    const totalTime = mode === 'focus' ? 90 * 60 : 20 * 60
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          专注闹钟
        </h1>

        {/* 表盘选择菜单 - 改为图标按钮 */}
        <div className="mb-6 relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors duration-200 z-20"
            title={`当前表盘: ${getWatchFaceName(watchFaceType)}`}>
            {/* 设置图标 */}
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* 下拉菜单 */}
          {isMenuOpen && (
            <div className="absolute top-12 right-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-30">
              <div className="p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                  表盘样式
                </div>
                <button
                  onClick={() => handleWatchFaceSelect('arc')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-md ${
                    watchFaceType === 'arc'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                  弧形段
                </button>
                <button
                  onClick={() => handleWatchFaceSelect('simple')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-md ${
                    watchFaceType === 'simple'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                  简约圆环
                </button>
                <button
                  onClick={() => handleWatchFaceSelect('digital')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-md ${
                    watchFaceType === 'digital'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                  数字方块
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-center mb-4">
            {renderWatchFace(getProgress())}
          </div>

          {nextAlertTimeRef.current !== null && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              下一次提示: {formatTime(nextAlertTimeRef.current)}
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={toggleTimer}
            className={`px-6 py-2 rounded-lg font-medium shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/30'
            }`}
            style={{
              boxShadow: isRunning
                ? '0 4px 15px rgba(239, 68, 68, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)'
                : '0 4px 15px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
            }}>
            {isRunning ? '暂停' : '开始'}
          </button>

          <button
            onClick={resetTimer}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              boxShadow:
                '0 4px 15px rgba(156, 163, 175, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
            }}>
            重置
          </button>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          已完成循环: {completedCycles}
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 max-w-md text-center">
        <p>90分钟专注 + 20分钟休息 = 1个循环</p>
        <p className="mt-1">专注时间内，每隔3-5分钟随机提示一次</p>
      </div>
    </div>
  )
}
