'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import FocusTimer from '@/components/FocusTimer'

export default function FocusPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [currentQuote, setCurrentQuote] = useState(0)

  // 专注励志语句
  const quotes = [
    { text: '专注是成功的秘诀', author: '拉尔夫·瓦尔多·爱默生' },
    { text: '一心一意，无往不胜', author: '孔子' },
    { text: '专注让平凡变成非凡', author: '约翰·C·麦克斯韦尔' },
    { text: '心无旁骛，方得始终', author: '古语' },
    { text: '专注当下，未来自来', author: '佛陀' },
  ]

  useEffect(() => {
    setIsMounted(true)
    // 每30秒切换一次励志语句
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length)
    }, 30000)

    return () => clearInterval(interval)
  }, [quotes.length])

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-amber-400/5 to-orange-400/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-72 h-72 bg-gradient-to-tl from-blue-400/5 to-cyan-400/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1.5s' }}></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-violet-400/3 to-pink-400/3 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '3s' }}></div>
      </div>

      {/* 顶部导航栏 */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="flex items-center space-x-12">
          <div className="text-xl font-bold text-slate-300">LOGO</div>
          <nav className="flex space-x-8">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/focus"
              className="text-white hover:text-amber-400 transition-colors">
              Focus
            </Link>
            <Link
              href="/calendar"
              className="text-slate-400 hover:text-white transition-colors">
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors">
            <span className="text-lg">+</span>
          </button>
          <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-88px)] p-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extralight text-slate-100 mb-4 tracking-wide">
              专注空间
            </h1>
            <p className="text-lg text-slate-400 font-light mb-8">
              在这里，时间有了意义
            </p>

            {/* 励志语句 */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-8">
              <blockquote className="text-slate-300 text-lg font-light italic mb-2">
                &ldquo;{quotes[currentQuote].text}&rdquo;
              </blockquote>
              <cite className="text-slate-500 text-sm">
                — {quotes[currentQuote].author}
              </cite>
            </div>

            {/* 装饰线 */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            </div>
          </div>

          {/* 计时器容器 */}
          <div className="relative mb-12">
            {/* 计时器背景装饰 */}
            <div className="absolute -inset-8 bg-gradient-to-r from-amber-400/5 via-orange-400/5 to-red-400/5 rounded-full blur-2xl opacity-50"></div>

            {/* 计时器组件 */}
            <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
              <FocusTimer showSettings={true} />
            </div>
          </div>

          {/* 专注小贴士 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-slate-200 font-medium mb-2">设定目标</h3>
              <p className="text-slate-400 text-sm">
                明确的目标是专注的起点，让每一分钟都有方向感
              </p>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🧘</span>
              </div>
              <h3 className="text-slate-200 font-medium mb-2">保持专注</h3>
              <p className="text-slate-400 text-sm">
                排除干扰，沉浸在当下的任务中，感受专注的力量
              </p>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-slate-200 font-medium mb-2">享受成果</h3>
              <p className="text-slate-400 text-sm">
                每个专注时段都是成长，记录并庆祝您的进步
              </p>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="flex items-center justify-center space-x-6">
            <Link
              href="/timer"
              className="group inline-flex items-center px-6 py-3 bg-amber-600/80 hover:bg-amber-600 backdrop-blur-xl rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl border border-amber-500/50">
              <span className="text-white font-medium">全屏专注</span>
              <svg
                className="w-4 h-4 ml-2 text-white group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            <Link
              href="/calendar"
              className="group inline-flex items-center px-6 py-3 bg-slate-700/80 hover:bg-slate-700 backdrop-blur-xl rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-600/50">
              <span className="text-slate-200 font-medium">查看历史</span>
              <svg
                className="w-4 h-4 ml-2 text-slate-400 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* 底部提示 */}
      <div className="relative z-10 pb-6">
        <div className="flex items-center justify-center space-x-8 text-sm text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span>专注当下</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"
              style={{ animationDelay: '1s' }}></div>
            <span>保持节奏</span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '2s' }}></div>
            <span>享受过程</span>
          </div>
        </div>
      </div>

      {/* 键盘快捷键提示 */}
      <div className="fixed bottom-6 right-6 z-20">
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-700/50 shadow-lg opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span>开始/暂停</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span>重置</span>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">
                R
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
