'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type DayData = {
  day: string
  focus: number
  cycles: number
}

type StatsState = {
  weeklyData: DayData[]
  isLoading: boolean
  lastUpdated: number | null
}

const initialState: StatsState = {
  weeklyData: [],
  isLoading: true,
  lastUpdated: null,
}

export const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    setWeeklyData: (state, action: PayloadAction<DayData[]>) => {
      state.weeklyData = action.payload
      state.isLoading = false
      state.lastUpdated = Date.now()
    },
    setStatsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    resetStats: () => initialState,
  },
})

export const { setWeeklyData, setStatsLoading, resetStats } = statsSlice.actions

export default statsSlice.reducer
