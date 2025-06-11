import { WatchFaceProps } from './types'

export const ArcWatchFace = ({
  progress,
  timeLeft,
  mode,
  formatTime,
}: WatchFaceProps) => {
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
              ? 'text-amber-400 dark:text-amber-500'
              : 'text-emerald-400 dark:text-emerald-500'
            : 'text-stone-200 dark:text-slate-700'
        }`}
      />
    )
  }

  return (
    <div className="relative">
      <svg height={radius * 2} width={radius * 2} className="overflow-visible">
        <defs>
          {/* 阴影效果定义 */}
          <filter
            id="circleShadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%">
            <feDropShadow
              dx="2"
              dy="2"
              stdDeviation="4"
              floodColor="rgba(0,0,0,0.1)"
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
          strokeWidth="2"
          className="text-stone-300 dark:text-slate-600"
          filter="url(#circleShadow)"
        />
        {/* 内边界 - 带阴影 */}
        <circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-stone-300 dark:text-slate-600"
          filter="url(#circleShadow)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl font-light text-stone-700 dark:text-slate-200 tracking-wider mb-2">
            {formatTime(timeLeft)}
          </div>
          <div
            className={`text-sm font-light tracking-wide ${
              mode === 'focus'
                ? 'text-stone-500 dark:text-slate-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
            {mode === 'focus' ? '专注时间' : '休息时间'}
          </div>
        </div>
      </div>
    </div>
  )
}
