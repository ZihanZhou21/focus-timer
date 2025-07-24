// 自动重置触发器 - 确保每天0时重置逻辑被执行

interface AutoResetState {
  lastResetDate: string | null
  lastCheckTimestamp: number
  autoResetEnabled: boolean
}

const STORAGE_KEY = 'focus-timer-auto-reset'
const CHECK_INTERVAL = 60 * 1000 // 1分钟检查一次

class AutoResetService {
  private state: AutoResetState
  private checkInterval: NodeJS.Timeout | null = null
  // 新增：保存事件监听器引用以便清理
  private visibilityChangeHandler: (() => void) | null = null
  private focusHandler: (() => void) | null = null

  constructor() {
    this.state = this.loadState()
    console.log('AutoResetService 初始化:', this.state)
  }

  // 从localStorage加载状态
  private loadState(): AutoResetState {
    if (typeof window === 'undefined') {
      return {
        lastResetDate: null,
        lastCheckTimestamp: 0,
        autoResetEnabled: true,
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载自动重置状态失败:', error)
    }

    return {
      lastResetDate: null,
      lastCheckTimestamp: 0,
      autoResetEnabled: true,
    }
  }

  // 保存状态到localStorage
  private saveState(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch (error) {
      console.error('保存自动重置状态失败:', error)
    }
  }

  // 获取今天的日期字符串
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0]
  }

  // 检查是否需要执行重置
  private shouldPerformReset(): boolean {
    const today = this.getTodayDateString()

    // 如果自动重置被禁用
    if (!this.state.autoResetEnabled) {
      return false
    }

    // 如果今天还没有重置过
    if (this.state.lastResetDate !== today) {
      console.log(
        `需要重置: 上次重置日期 ${this.state.lastResetDate}, 今天 ${today}`
      )
      return true
    }

    return false
  }

  // 执行重置检查
  private async performResetCheck(): Promise<void> {
    try {
      console.log('执行重置检查...')

      if (!this.shouldPerformReset()) {
        console.log('今天已经重置过，跳过')
        return
      }

      console.log('开始执行自动重置...')

      // 调用调度器API执行重置
      const response = await fetch('/api/scheduler?action=daily-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('自动重置成功:', result)

        // 更新状态
        this.state.lastResetDate = this.getTodayDateString()
        this.state.lastCheckTimestamp = Date.now()
        this.saveState()

        // 触发页面刷新或重新加载数据的事件
        window.dispatchEvent(
          new CustomEvent('daily-reset-completed', {
            detail: result,
          })
        )
      } else {
        console.error('自动重置失败:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('执行重置检查失败:', error)
    }
  }

  // 启动自动重置服务
  start(): void {
    if (typeof window === 'undefined') {
      console.log('服务端环境，跳过自动重置服务')
      return
    }

    console.log('启动自动重置服务')

    // 立即执行一次检查
    this.performResetCheck()

    // 设置定期检查
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(() => {
      this.performResetCheck()
    }, CHECK_INTERVAL)

    // 先清理已有的事件监听器（防止重复添加）
    this.removeEventListeners()

    // 创建事件处理函数
    this.visibilityChangeHandler = () => {
      if (!document.hidden) {
        console.log('页面重新可见，执行重置检查')
        this.performResetCheck()
      }
    }

    this.focusHandler = () => {
      console.log('页面重新获得焦点，执行重置检查')
      this.performResetCheck()
    }

    // 监听页面可见性变化，当页面重新可见时检查
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    // 监听焦点事件，当页面重新获得焦点时检查
    window.addEventListener('focus', this.focusHandler)
  }

  // 清理事件监听器
  private removeEventListeners(): void {
    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityChangeHandler
      )
      this.visibilityChangeHandler = null
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler)
      this.focusHandler = null
    }
  }

  // 停止自动重置服务
  stop(): void {
    console.log('停止自动重置服务')

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    // 清理事件监听器
    this.removeEventListeners()
  }

  // 手动触发重置
  async manualReset(): Promise<boolean> {
    try {
      console.log('手动触发重置')

      const response = await fetch('/api/scheduler?action=daily-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('手动重置成功:', result)

        // 更新状态
        this.state.lastResetDate = this.getTodayDateString()
        this.state.lastCheckTimestamp = Date.now()
        this.saveState()

        // 触发重置完成事件
        window.dispatchEvent(
          new CustomEvent('daily-reset-completed', {
            detail: result,
          })
        )

        return true
      } else {
        console.error('手动重置失败:', response.status, response.statusText)
        return false
      }
    } catch (error) {
      console.error('手动重置失败:', error)
      return false
    }
  }

  // 获取状态信息
  getStatus(): AutoResetState & { todayDate: string; needsReset: boolean } {
    return {
      ...this.state,
      todayDate: this.getTodayDateString(),
      needsReset: this.shouldPerformReset(),
    }
  }

  // 设置自动重置开关
  setAutoResetEnabled(enabled: boolean): void {
    this.state.autoResetEnabled = enabled
    this.saveState()
    console.log(`自动重置已${enabled ? '启用' : '禁用'}`)
  }

  // 重置状态（用于测试）
  resetState(): void {
    this.state = {
      lastResetDate: null,
      lastCheckTimestamp: 0,
      autoResetEnabled: true,
    }
    this.saveState()
    console.log('自动重置状态已重置')
  }
}

// 创建全局实例
import { cleanupManager } from './cleanup-manager'

// 导出自动重置服务实例
export const autoResetService = new AutoResetService()

// 导出类型
export type { AutoResetState }

// 在模块加载时自动启动（仅在客户端）
if (typeof window !== 'undefined') {
  // 注册清理函数
  cleanupManager.register(() => {
    autoResetService.stop()
  })

  // 等待DOM加载完成后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoResetService.start()
    })
  } else {
    // 如果DOM已经加载完成，立即启动
    autoResetService.start()
  }
}
