'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { DispatchCalendar } from './DispatchCalendar'

export function DispatchHeader({ currentDate, isToday }: { currentDate: string; isToday: boolean }) {
  const router = useRouter()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dateObj = new Date(currentDate + 'T12:00:00')
  const displayDate = format(dateObj, 'EEEE, MMMM d, yyyy')

  function navigateDate(date: Date) {
    router.push(`/admin/dispatch?date=${format(date, 'yyyy-MM-dd')}`)
    setCalendarOpen(false)
  }

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCalendarOpen(false)
      }
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [calendarOpen])

  return (
    <div className="flex items-center justify-between bg-white border-2 border-black rounded-lg px-4 py-3 neo-shadow-sm">
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="p-1.5 rounded-md hover:bg-[#FDE047]/30 text-slate-500 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
        </button>

        <h2 className="text-sm font-semibold text-slate-800 min-w-[240px] text-center font-[Syne]">
          {displayDate}
        </h2>

        {!isToday && (
          <button
            onClick={() => navigateDate(new Date())}
            className="ml-2 px-3 py-1 text-xs font-bold text-black bg-[#FDE047] border border-black rounded-md hover:bg-[#FDE047]/80 transition-colors"
          >
            Today
          </button>
        )}

        {/* Calendar dropdown */}
        {calendarOpen && (
          <div className="absolute top-full left-0 mt-2 z-50">
            <DispatchCalendar currentDate={currentDate} onSelectDate={navigateDate} />
          </div>
        )}
      </div>

      {/* View toggle — Day only in MVP */}
      <div className="flex items-center gap-1">
        <span className="px-3 py-1 text-xs font-medium bg-black text-white rounded-md">
          Day
        </span>
        <span className="px-3 py-1 text-xs font-medium text-slate-300 rounded-md cursor-not-allowed">
          3-Day
        </span>
        <span className="px-3 py-1 text-xs font-medium text-slate-300 rounded-md cursor-not-allowed">
          Week
        </span>
      </div>
    </div>
  )
}
