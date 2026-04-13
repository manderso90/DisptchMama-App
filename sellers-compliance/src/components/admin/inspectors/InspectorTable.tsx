'use client'

import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import type { Inspector } from '@/types/database'

interface InspectorTableProps {
  inspectors: Inspector[]
}

export function InspectorTable({ inspectors }: InspectorTableProps) {
  const router = useRouter()

  return (
    <div className="bg-white border-2 border-black rounded-lg overflow-hidden neo-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-black bg-[#FFFDF5]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Name
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Region
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
              Phone
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
              Added
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {inspectors.map((inspector) => (
            <tr
              key={inspector.id}
              onClick={() => router.push(`/admin/inspectors/${inspector.id}`)}
              className="hover:bg-[#FDE047]/10 cursor-pointer"
            >
              <td className="px-5 py-3 font-medium text-slate-800">
                {inspector.full_name}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {inspector.region}
              </td>
              <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                {inspector.phone || '\u2014'}
              </td>
              <td className="px-5 py-3">
                <span
                  className={`text-xs px-2 py-1 rounded-md font-medium ${
                    inspector.is_active
                      ? 'bg-green-100 text-green-800 border border-green-400'
                      : 'bg-slate-100 text-slate-600 border border-slate-400'
                  }`}
                >
                  {inspector.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-3 text-xs text-slate-400 hidden lg:table-cell">
                {format(new Date(inspector.created_at), 'MMM d, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {inspectors.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          No inspectors yet. Add your first inspector to get started.
        </div>
      )}
    </div>
  )
}
