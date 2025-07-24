// 内存泄漏检测工具（仅在开发环境使用）

interface MemoryStats {
  intervals: number
  timeouts: number
  eventListeners: number
  cleanupFunctions: number
}

class MemoryLeakDetector {
  private initialStats: MemoryStats | null = null
  private checkInterval: NodeJS.Timeout | null = null

  // 获取当前内存统计
  private getMemoryStats(): MemoryStats {
    const stats: MemoryStats = {
      intervals: 0,
      timeouts: 0,
      eventListeners: 0,
      cleanupFunctions: 0,
    }

    // 这些是估算值，真实环境中需要更复杂的检测
    if (typeof window !== 'undefined') {
      // 获取清理函数数量
      import('./cleanup-manager').then(({ cleanupManager }) => {
        stats.cleanupFunctions = cleanupManager.getRegisteredCount()
      })
    }

    return stats
  }

  // 开始监控
  start(): void {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('MemoryLeakDetector 只能在开发环境中使用')
      return
    }

    console.log('🕵️ 开始内存泄漏检测...')
    this.initialStats = this.getMemoryStats()

    // 每30秒检查一次
    this.checkInterval = setInterval(() => {
      this.checkForLeaks()
    }, 30000)
  }

  // 停止监控
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    console.log('🛑 内存泄漏检测已停止')
  }

  // 检查内存泄漏
  private checkForLeaks(): void {
    if (!this.initialStats) return

    const currentStats = this.getMemoryStats()
    const warnings: string[] = []

    // 检查各项指标的增长
    Object.keys(currentStats).forEach((key) => {
      const statKey = key as keyof MemoryStats
      const initial = this.initialStats![statKey]
      const current = currentStats[statKey]
      const growth = current - initial

      if (growth > 10) {
        warnings.push(`${key}: +${growth} (${initial} → ${current})`)
      }
    })

    if (warnings.length > 0) {
      console.warn('⚠️ 检测到可能的内存泄漏:')
      warnings.forEach((warning) => console.warn(`  • ${warning}`))
    } else {
      console.log('✅ 内存使用正常')
    }
  }

  // 手动检查
  checkNow(): void {
    console.log('🔍 手动检查内存泄漏...')
    this.checkForLeaks()
  }

  // 获取修复建议
  getFixSuggestions(): string[] {
    return [
      '✅ 所有 setInterval/setTimeout 都有对应的 clear 调用',
      '✅ 所有 addEventListener 都有对应的 removeEventListener',
      '✅ 所有 useEffect 都有正确的清理函数',
      '✅ 使用 cleanupManager 统一管理清理函数',
      '✅ 组件卸载时清理所有引用和订阅',
    ]
  }
}

// 创建检测器实例
export const memoryLeakDetector = new MemoryLeakDetector()

// 在开发环境下自动启动
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 延迟启动，避免影响应用初始化
  setTimeout(() => {
    memoryLeakDetector.start()
  }, 5000)

  // 添加到全局对象方便调试
  const windowWithDebug = window as typeof window & {
    __memoryCheck?: () => void
    __memoryStop?: () => void
    __memoryTips?: () => void
  }

  windowWithDebug.__memoryCheck = () => memoryLeakDetector.checkNow()
  windowWithDebug.__memoryStop = () => memoryLeakDetector.stop()
  windowWithDebug.__memoryTips = () => {
    console.log('💡 内存泄漏修复建议:')
    memoryLeakDetector.getFixSuggestions().forEach((tip) => console.log(tip))
  }

  console.log('🔧 开发工具已注册:')
  console.log('  • __memoryCheck() - 立即检查内存')
  console.log('  • __memoryStop() - 停止监控')
  console.log('  • __memoryTips() - 获取修复建议')
  console.log('  • __cleanup() - 手动清理所有资源')
}

export default memoryLeakDetector
