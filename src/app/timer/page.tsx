'use client'

import FocusTimer from '@/components/FocusTimer'
import Link from 'next/link'

export default function TimerPage() {
  return (
    <div className="app-page min-h-screen relative overflow-hidden">
      {/* 返回主页按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="group inline-flex items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-3 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-[var(--accent)] hover:shadow-xl">
          <svg
            className="w-5 h-5 mr-3 text-[var(--muted-foreground)] group-hover:text-[var(--accent)] transition-colors duration-300 group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-300">
            返回主页
          </span>
        </Link>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-16">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-4">
              专注时刻
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] font-light mb-8">
              让每一秒都充满意义
            </p>

            {/* 装饰线 */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"></div>
              <div className="h-1.5 w-8 rounded-full bg-[var(--accent)]"></div>
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"></div>
            </div>
          </div>

          {/* 计时器容器 */}
          <div className="relative">
            {/* 计时器组件 */}
            <div className="app-surface relative rounded-[2rem] border p-8 backdrop-blur-xl">
              <FocusTimer showSettings={true} />
            </div>
          </div>

          {/* 底部提示 */}
          <div className="mt-16 opacity-60">
            <div className="flex items-center justify-center space-x-8 text-sm text-[var(--muted-foreground)]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <span>保持专注</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
                  style={{ animationDelay: '1s' }}></div>
                <span>享受过程</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '2s' }}></div>
                <span>收获成长</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 键盘快捷键提示 */}
      <div className="fixed bottom-6 right-6 z-20">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-lg opacity-70 backdrop-blur-xl transition-opacity duration-300 hover:opacity-100">
          <div className="text-xs text-[var(--muted-foreground)] space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span>开始/暂停</span>
              <kbd className="px-2 py-1 bg-[var(--surface-muted)] rounded text-xs font-mono text-[var(--foreground)]">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span>重置</span>
              <kbd className="px-2 py-1 bg-[var(--surface-muted)] rounded text-xs font-mono text-[var(--foreground)]">
                R
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
