'use client'

import { useState, useEffect, useRef } from 'react'

export default function Home() {
  // 状态管理
  const [mode, setMode] = useState<'focus' | 'break'>('focus') // 当前模式：专注/休息
  const [timeLeft, setTimeLeft] = useState<number>(90 * 60) // 剩余时间（秒）
  const [isRunning, setIsRunning] = useState<boolean>(false) // 计时器是否运行中
  const [completedCycles, setCompletedCycles] = useState<number>(0) // 完成的循环次数

  // 引用
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const nextAlertTimeRef = useRef<number | null>(null) // 使用ref替代state

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      // 尝试获取通知权限
      Notification.requestPermission()
    }
  }, [])

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

  // 环形进度条组件 - 离散弧形段版本
  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 180
    const centerX = radius
    const centerY = radius
    const segmentCount = 60 // 60个独立段
    const innerRadius = radius - 80 // 内半径
    const outerRadius = radius // 外半径
    const gapAngle = 1 // 段之间的间隙角度（度）
    const segmentAngle = 360 / segmentCount - gapAngle // 每段占用的角度

    // 计算需要填充的段数
    const filledSegments = Math.floor((segmentCount * progress) / 100)

    // 创建弧形路径的函数
    const createArcPath = (
      startAngle: number,
      endAngle: number,
      innerR: number,
      outerR: number
    ) => {
      const startAngleRad = (startAngle * Math.PI) / 180
      const endAngleRad = (endAngle * Math.PI) / 180

      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

      // 固定精度避免水合错误
      const x1 = Number((centerX + innerR * Math.cos(startAngleRad)).toFixed(6))
      const y1 = Number((centerY + innerR * Math.sin(startAngleRad)).toFixed(6))
      const x2 = Number((centerX + outerR * Math.cos(startAngleRad)).toFixed(6))
      const y2 = Number((centerY + outerR * Math.sin(startAngleRad)).toFixed(6))

      const x3 = Number((centerX + outerR * Math.cos(endAngleRad)).toFixed(6))
      const y3 = Number((centerY + outerR * Math.sin(endAngleRad)).toFixed(6))
      const x4 = Number((centerX + innerR * Math.cos(endAngleRad)).toFixed(6))
      const y4 = Number((centerY + innerR * Math.sin(endAngleRad)).toFixed(6))

      return [
        'M',
        x1,
        y1, // 移动到内弧起点
        'L',
        x2,
        y2, // 直线到外弧起点
        'A',
        outerR,
        outerR,
        0,
        largeArcFlag,
        1,
        x3,
        y3, // 外弧
        'L',
        x4,
        y4, // 直线到内弧终点
        'A',
        innerR,
        innerR,
        0,
        largeArcFlag,
        0,
        x1,
        y1, // 内弧（逆向）
        'Z', // 闭合路径
      ].join(' ')
    }

    // 生成所有段
    const segments = []
    for (let i = 0; i < segmentCount; i++) {
      // 计算角度（从顶部开始，顺时针）
      const startAngle = (i * 360) / segmentCount - 90 // -90度让起始点在顶部
      const endAngle = startAngle + segmentAngle

      // 判断这个段是否应该被填充
      const isFilled = i < filledSegments

      const pathData = createArcPath(
        startAngle,
        endAngle,
        innerRadius,
        outerRadius
      )

      segments.push(
        <path
          key={i}
          d={pathData}
          fill="currentColor"
          className={`transition-colors duration-300 ${
            isFilled
              ? mode === 'focus'
                ? 'text-red-500 dark:text-gray-600'
                : 'text-green-500 dark:text-green-400'
              : 'text-gray-200 dark:text-gray-700'
          }`}
        />
      )
    }

    return (
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="overflow-visible">
          <defs>
            {/* 阴影效果定义 */}
            <filter
              id="circleShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%">
              <feDropShadow
                dx="3"
                dy="3"
                stdDeviation="5"
                floodColor="rgba(0,0,0,0.8)"
              />
            </filter>
          </defs>
          {segments}
          {/* 外边界 - 带阴影 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-500 dark:text-gray-500"
            filter="url(#circleShadow)"
          />
          {/* 内边界 - 带阴影 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-500 dark:text-gray-500"
            filter="url(#circleShadow)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-gray-800 dark:text-white">
              {formatTime(timeLeft)}
            </div>
            <div
              className={`text-sm font-medium ${
                mode === 'focus'
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
              {mode === 'focus' ? '专注时间' : '休息时间'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          专注闹钟
        </h1>

        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <CircularProgress progress={getProgress()} />
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
