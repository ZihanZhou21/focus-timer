'use client'

import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import {
  ArcWatchFace,
  SimpleWatchFace,
  DigitalWatchFace,
  WatchFaceType,
} from '@/components/watchfaces'
import { useFocusTimerLogic } from '@/hooks/useFocusTimerLogic'
import { resetTimer as resetTimerAction } from '@/app/slices/timerSlice'

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
  const [completedCycles, setCompletedCycles] = useState<number>(0) // 完成的循环次数
  const [watchFaceType, setWatchFaceType] = useState<WatchFaceType>('arc')
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false) // 菜单开关状态

  // 引用
  const nextAlertTimeRef = useRef<number | null>(null) 
  const menuRef = useRef<HTMLDivElement | null>(null) // 菜单引用

  // 使用全局后台计时逻辑
  const { 
    timeRemaining: timeLeft, 
    isRunning, 
    toggleTimer, 
    formatTime: formatTimeGlobal 
  } = useFocusTimerLogic({
    initialTime: mode === 'focus' ? initialFocusTime : initialBreakTime,
    taskId: null, // 练习模式
    onComplete: () => handleTimerComplete()
  })

  const dispatch = useDispatch()

  // 处理点击外部关闭菜单
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
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

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
          if (isMenuOpen) setIsMenuOpen(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen, toggleTimer]) // eslint-disable-line react-hooks/exhaustive-deps

  // 处理计时完成
  const handleTimerComplete = () => {
    playAlert()

    if (mode === 'focus') {
      // 保存专注记录
      const focusTaskData = {
        userId: 'user_001',
        type: 'todo' as const,
        title: `专注时间 ${initialFocusTime}分钟`,
        content: [
          `专注时长: ${initialFocusTime}分钟`,
          '番茄钟专注法',
          `完成时间: ${new Date().toLocaleTimeString()}`,
        ],
        status: 'completed' as const,
        priority: 'medium' as const,
        tags: ['专注', '番茄钟'],
        plannedTime: new Date().toTimeString().substring(0, 5),
        estimatedDuration: initialFocusTime * 60,
        dailyTimeStats: {
          [new Date().toISOString().split('T')[0]]: initialFocusTime * 60,
        },
      }

      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(focusTaskData),
      }).catch((error) => {
        console.error('Failed to save focus session:', error)
      })

      setMode('break')
    } else {
      setMode('focus')
      setCompletedCycles((c) => c + 1)
    }
    nextAlertTimeRef.current = null
  }

  const playAlert = () => {
    try {
      new Audio('/alert.mp3').play().catch(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('专注提醒', { body: '计时结束' })
        }
      })
    } catch {}
  }

  // 随机提醒逻辑
  useEffect(() => {
    let randomTimer: NodeJS.Timeout | null = null
    
    if (isRunning && mode === 'focus') {
      randomTimer = setInterval(() => {
        if (nextAlertTimeRef.current !== null) {
          nextAlertTimeRef.current -= 1
          if (nextAlertTimeRef.current <= 0) {
            playAlert()
            nextAlertTimeRef.current = Math.floor(Math.random() * (5 * 60 - 3 * 60 + 1) + 3 * 60)
            setTimeout(() => {
              new Audio('/break_end.mp3').play().catch(() => {})
            }, 10000)
          }
        } else {
          nextAlertTimeRef.current = Math.floor(Math.random() * (5 * 60 - 3 * 60 + 1) + 3 * 60)
        }
      }, 1000)
    }

    return () => {
      if (randomTimer) clearInterval(randomTimer)
    }
  }, [isRunning, mode])

  const resetTimer = () => {
    dispatch(resetTimerAction())
    setMode('focus')
    setCompletedCycles(0)
    nextAlertTimeRef.current = null
  }

  const handleWatchFaceSelect = (type: WatchFaceType) => {
    setWatchFaceType(type)
    setIsMenuOpen(false)
  }

  const getWatchFaceName = (type: WatchFaceType) => {
    switch (type) {
      case 'arc': return '弧形段'
      case 'simple': return '简约圆环'
      case 'digital': return '数字方块'
      default: return '弧形段'
    }
  }

  const formatTimeLocal = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = (): number => {
    const totalTime = mode === 'focus' ? initialFocusTime * 60 : initialBreakTime * 60
    return (timeLeft / totalTime) * 100
  }

  const renderWatchFace = (progress: number) => {
    const props = { progress, timeLeft, mode, formatTime: formatTimeGlobal }
    switch (watchFaceType) {
      case 'arc': return <ArcWatchFace {...props} />
      case 'simple': return <SimpleWatchFace {...props} />
      case 'digital': return <DigitalWatchFace {...props} />
      default: return <ArcWatchFace {...props} />
    }
  }

  return (
    <div className={`relative w-full max-w-lg ${className}`}>
      {showSettings && (
        <div className="fixed top-6 right-6 z-20" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-slate-700/90 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl border border-stone-200/50 dark:border-slate-600/50"
            title={`当前表盘: ${getWatchFaceName(watchFaceType)}`}>
            <svg className="w-5 h-5 text-stone-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {isMenuOpen && (
            <div className="absolute top-16 right-0 w-52 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-stone-200/50 dark:border-slate-600/50 rounded-2xl shadow-xl z-30">
              <div className="p-4">
                <div className="text-xs font-medium text-stone-500 dark:text-slate-400 mb-3 tracking-wide uppercase">表盘样式</div>
                <button onClick={() => handleWatchFaceSelect('arc')} className={`w-full px-4 py-3 text-left text-sm rounded-xl mb-1 ${watchFaceType === 'arc' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50'}`}>弧形段</button>
                <button onClick={() => handleWatchFaceSelect('simple')} className={`w-full px-4 py-3 text-left text-sm rounded-xl mb-1 ${watchFaceType === 'simple' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50'}`}>简约圆环</button>
                <button onClick={() => handleWatchFaceSelect('digital')} className={`w-full px-4 py-3 text-left text-sm rounded-xl ${watchFaceType === 'digital' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50'}`}>数字方块</button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="text-center">
        <div className="mb-16">
          <div className="flex justify-center mb-6">{renderWatchFace(getProgress())}</div>
          {nextAlertTimeRef.current !== null && (
            <div className="text-sm text-stone-500 dark:text-slate-400 font-light">下次提醒 {formatTimeLocal(nextAlertTimeRef.current)}</div>
          )}
        </div>
        <div className="flex justify-center space-x-6 mb-12">
          <button onClick={toggleTimer} className={`px-8 py-4 rounded-full font-light text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 ${isRunning ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600'}`}>{isRunning ? '暂停' : '开始'}</button>
          <button onClick={resetTimer} className="px-6 py-4 rounded-full font-light text-lg bg-stone-100 hover:bg-stone-200 text-stone-600 border-2 border-stone-200 transition-all duration-300 transform hover:scale-105 active:scale-95 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">重置</button>
        </div>
        <div className="text-stone-500 dark:text-slate-400 font-light">
          <div className="text-sm mb-4">已完成 {completedCycles} 个循环</div>
          <div className="text-xs text-stone-400 dark:text-slate-500 space-y-1">
            <div>{initialFocusTime}分钟专注 · {initialBreakTime}分钟休息</div>
            <div>随机间隔提醒助您保持专注</div>
          </div>
        </div>
      </div>
    </div>
  )
}
