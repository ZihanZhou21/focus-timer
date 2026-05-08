'use client'

import { Provider } from 'react-redux'
import { store } from '@/app/store'
import TimerBackgroundManager from '@/components/TimerBackgroundManager'

import { ReactNode } from 'react'

export default function ClientProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TimerBackgroundManager />
      {children}
    </Provider>
  )
}
