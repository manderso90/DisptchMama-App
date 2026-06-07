'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error'

interface ScheduleToastProps {
  message: string
  variant?: ToastVariant
  onUndo?: () => void
  onDismiss: () => void
}

export function ScheduleToast({ message, variant = 'success', onUndo, onDismiss }: ScheduleToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Errors linger longer so they're not missed.
    const duration = variant === 'error' ? 6000 : 3000
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 200) // wait for fade-out animation
    }, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, variant])

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'border-2 border-black px-5 py-2.5 rounded-lg neo-shadow-sm',
        'text-sm font-bold flex items-center gap-3',
        'transition-all duration-200',
        variant === 'error' ? 'bg-[#F87171] text-black' : 'bg-[#FDE047] text-black',
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
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null)

  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ message, variant })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
