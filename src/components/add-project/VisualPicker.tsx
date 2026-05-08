'use client'

import React from 'react'
import { PRESET_ICONS, PRESET_COLORS } from '@/lib/constants'
import { FormField, SelectionGrid } from './FormHelpers'

interface VisualPickerProps {
  selectedIcon: string
  selectedColor: string
  onIconSelect: (icon: string) => void
  onColorSelect: (color: string) => void
}

export default function VisualPicker({
  selectedIcon,
  selectedColor,
  onIconSelect,
  onColorSelect,
}: VisualPickerProps) {
  return (
    <div className="space-y-4">
      <FormField label="Icon">
        <SelectionGrid
          options={PRESET_ICONS}
          selected={selectedIcon}
          onSelect={onIconSelect}
          renderOption={(icon, isSelected) => (
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${
                isSelected
                  ? `${selectedColor} text-white shadow-lg scale-110 ring-2 ring-offset-2 ring-slate-400`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {icon}
            </div>
          )}
        />
      </FormField>

      <FormField label="Color">
        <SelectionGrid
          options={PRESET_COLORS}
          selected={selectedColor}
          onSelect={onColorSelect}
          renderOption={(color, isSelected) => (
            <div
              className={`w-8 h-8 rounded-full ${color} transition-all ${
                isSelected
                  ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 shadow-md'
                  : 'hover:scale-105'
              }`}
            />
          )}
        />
      </FormField>
    </div>
  )
}
