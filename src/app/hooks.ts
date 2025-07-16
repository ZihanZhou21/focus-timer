'use client'

import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

// 使用类型化的 hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
