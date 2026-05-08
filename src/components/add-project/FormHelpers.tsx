'use client'

import React from 'react'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  error?: string
}

export const FormField = ({ label, children, error }: FormFieldProps) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
    </label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

interface SelectionGridProps<T> {
  options: T[]
  selected: T
  onSelect: (option: T) => void
  renderOption: (option: T, isSelected: boolean) => React.ReactNode
  columns?: string
}

export function SelectionGrid<T>({
  options,
  selected,
  onSelect,
  renderOption,
  columns = 'grid-cols-8'
}: SelectionGridProps<T>) {
  return (
    <div className={`grid ${columns} gap-2`}>
      {options.map((option, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(option)}
          className="transition-transform active:scale-90"
        >
          {renderOption(option, option === selected)}
        </button>
      ))}
    </div>
  )
}
