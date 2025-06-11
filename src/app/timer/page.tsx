import FocusTimer from '@/components/FocusTimer'
import Link from 'next/link'

export default function TimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden">
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

      {/* 返回主页按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="group inline-flex items-center px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl hover:bg-white/90 dark:hover:bg-slate-700/90 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl border border-white/50 dark:border-slate-600/50 hover:border-amber-300/50 dark:hover:border-amber-600/50">
          <svg
            className="w-5 h-5 mr-3 text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300 group-hover:scale-110"
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
          <span className="font-light text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
            返回主页
          </span>
        </Link>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-16">
            <h1 className="text-3xl md:text-4xl font-extralight text-slate-800 dark:text-slate-100 mb-4 tracking-wide">
              专注时刻
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-light mb-8">
              让每一秒都充满意义
            </p>

            {/* 装饰线 */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"></div>
            </div>
          </div>

          {/* 计时器容器 */}
          <div className="relative">
            {/* 计时器背景装饰 */}
            <div className="absolute -inset-8 bg-gradient-to-r from-amber-400/5 via-orange-400/5 to-red-400/5 rounded-full blur-2xl opacity-50"></div>

            {/* 计时器组件 */}
            <div className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 border border-white/50 dark:border-slate-700/50 shadow-2xl">
              <FocusTimer showSettings={true} />
            </div>
          </div>

          {/* 底部提示 */}
          <div className="mt-16 opacity-60">
            <div className="flex items-center justify-center space-x-8 text-sm text-slate-500 dark:text-slate-400">
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
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 dark:border-slate-600/50 shadow-lg opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center justify-between space-x-4">
              <span>开始/暂停</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span>重置</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">
                R
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
