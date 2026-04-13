'use client'

import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DispatchCalendarProps {
  currentDate: string
  onSelectDate: (date: Date) => void
}

export function DispatchCalendar({ currentDate, onSelectDate }: DispatchCalendarProps) {
  const selected = new Date(currentDate + 'T12:00:00')
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected))

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="w-[240px] bg-[#FFFDF5] border-2 border-black rounded-lg neo-shadow p-3">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-[#F9A8D4]/30 text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-slate-700 font-[Syne]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-[#F9A8D4]/30 text-slate-500 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          const inMonth = isSameMonth(day, viewMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'w-8 h-8 flex items-center justify-center text-xs rounded-full transition-colors',
                !inMonth && 'text-slate-300',
                inMonth && !isSelected && !isToday && 'text-slate-700 hover:bg-[#F9A8D4]/30',
                isToday && !isSelected && 'ring-1 ring-[#2563EB] text-slate-700',
                isSelected && 'bg-[#FDE047] text-black border border-black font-bold'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
