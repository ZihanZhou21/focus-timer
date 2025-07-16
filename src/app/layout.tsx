import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ClientProvider from '@/components/ClientProvider'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f59e0b' },
    { media: '(prefers-color-scheme: dark)', color: '#d97706' },
  ],
}

export const metadata: Metadata = {
  title: '专注时光 - 让专注成为习惯',
  description: '一个简洁优雅的专注计时器应用，帮助您培养专注习惯，提高工作效率',
  keywords: ['专注', '计时器', '番茄钟', '效率', '专注力', '时间管理'],
  authors: [{ name: '专注时光团队' }],
  creator: '专注时光',
  publisher: '专注时光',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="专注时光" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="专注时光" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-slate-50 dark:bg-slate-950 selection:bg-amber-200 dark:selection:bg-amber-800 selection:text-amber-900 dark:selection:text-amber-100`}>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  )
}
