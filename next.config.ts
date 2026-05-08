import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      fs: {
        browser: './src/lib/empty-module.ts',
      },
      path: {
        browser: './src/lib/empty-module.ts',
      },
      os: {
        browser: './src/lib/empty-module.ts',
      },
    },
  },
}

export default nextConfig
