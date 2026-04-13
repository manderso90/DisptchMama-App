'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScheduleToastProps {
  message: string
  onUndo?: () => void
  onDismiss: () => void
}

export function ScheduleToast({ message, onUndo, onDismiss }: ScheduleToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 200) // wait for fade-out animation
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-[#FDE047] text-black border-2 border-black px-5 py-2.5 rounded-lg neo-shadow-sm',
        'text-sm font-bold flex items-center gap-3',
        'transition-all duration-200',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
      )}
    >
      <span>{message}</span>
      {onUndo && (
        <button
          onClick={() => {
            onUndo()
            onDismiss()
          }}
          className="text-[#2563EB] hover:text-[#2563EB]/70 text-xs font-semibold uppercase tracking-wide"
        >
          Undo
        </button>
      )}
    </div>
  )
}

/**
 * Hook to manage schedule toast state.
 * Returns { toastMessage, showToast, hideToast } for easy use in any component.
 */
export function useScheduleToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
  }, [])

  const hideToast = useCallback(() => {
    setToastMessage(null)
  }, [])

  return { toastMessage, showToast, hideToast }
}
