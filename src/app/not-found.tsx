import Layout from '@/components/Layout'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Layout showNavigation={false}>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-8">
            <div className="text-8xl font-light text-stone-300 dark:text-slate-600 mb-4">
              404
            </div>
            <h1 className="text-2xl font-light text-stone-700 dark:text-slate-200 mb-2">
              页面未找到
            </h1>
            <p className="text-stone-500 dark:text-slate-400 font-light">
              抱歉，您访问的页面不存在或已被移动
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-8 py-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border-2 border-amber-200 rounded-full font-light text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              回到首页
            </Link>

            <div className="text-sm text-stone-400 dark:text-slate-500">
              或者使用下方导航栏访问其他页面
            </div>
          </div>

          <div className="mt-12">
            <div className="text-6xl mb-4">🧘‍♀️</div>
            <p className="text-stone-400 dark:text-slate-500 font-light italic text-sm">
              保持内心的平静，就像专注时一样
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
