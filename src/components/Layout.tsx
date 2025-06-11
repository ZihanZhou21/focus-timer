import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  showNavigation?: boolean
}

export default function Layout({
  children,
  title,
  showNavigation = true,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 页面内容 */}
      <main className={`${showNavigation ? 'pb-20' : ''}`}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-4xl">
            {title && (
              <div className="mb-12 text-center">
                <h1 className="text-3xl font-light text-stone-700 dark:text-slate-200 tracking-wide">
                  {title}
                </h1>
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-stone-300 dark:via-slate-600 to-transparent mx-auto mt-6"></div>
              </div>
            )}
            {children}
          </div>
        </div>
      </main>

      {/* 底部导航 */}
      {showNavigation && <Navigation />}
    </div>
  )
}
