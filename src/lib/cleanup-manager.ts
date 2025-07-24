// 全局清理管理器，用于统一管理应用中的所有清理函数

type CleanupFunction = () => void

class CleanupManager {
  private cleanupFunctions: Set<CleanupFunction> = new Set()
  private isCleaningUp = false

  // 注册清理函数
  register(cleanupFn: CleanupFunction): () => void {
    this.cleanupFunctions.add(cleanupFn)

    // 返回取消注册的函数
    return () => {
      this.cleanupFunctions.delete(cleanupFn)
    }
  }

  // 执行所有清理函数
  cleanup(): void {
    if (this.isCleaningUp) return // 防止重复清理

    this.isCleaningUp = true
    console.log(`🧹 开始清理 ${this.cleanupFunctions.size} 个资源...`)

    let cleanedCount = 0
    this.cleanupFunctions.forEach((cleanupFn) => {
      try {
        cleanupFn()
        cleanedCount++
      } catch (error) {
        console.error('清理函数执行失败:', error)
      }
    })

    console.log(`✅ 成功清理 ${cleanedCount} 个资源`)
    this.cleanupFunctions.clear()
    this.isCleaningUp = false
  }

  // 获取当前注册的清理函数数量
  getRegisteredCount(): number {
    return this.cleanupFunctions.size
  }
}

// 创建全局实例
export const cleanupManager = new CleanupManager()

// 在浏览器环境中自动设置页面卸载时清理
if (typeof window !== 'undefined') {
  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    cleanupManager.cleanup()
  })

  // 页面隐藏时也清理（适用于移动端）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupManager.cleanup()
    }
  })

  // 开发环境下在控制台提供清理命令
  if (process.env.NODE_ENV === 'development') {
    // 安全地扩展window对象
    const windowWithCleanup = window as typeof window & {
      __cleanup?: () => void
    }
    windowWithCleanup.__cleanup = () => {
      cleanupManager.cleanup()
      console.log('手动清理完成')
    }
  }
}

export default cleanupManager
