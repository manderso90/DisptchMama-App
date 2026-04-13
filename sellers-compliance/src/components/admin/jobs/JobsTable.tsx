'use client'

import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import type { Job } from '@/types/database'

const statusBadge: Record<string, string> = {
  pending: 'bg-[#FDE047]/20 text-amber-800 border border-amber-400',
  confirmed: 'bg-[#2563EB]/10 text-blue-800 border border-blue-400',
  in_progress: 'bg-purple-100 text-purple-800 border border-purple-400',
  completed: 'bg-green-100 text-green-800 border border-green-400',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-400',
  on_hold: 'bg-slate-100 text-slate-600 border border-slate-400',
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

interface JobsTableProps {
  jobs: (Job & { inspector_name: string | null })[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter()

  return (
    <div className="bg-white border-2 border-black rounded-lg overflow-hidden neo-shadow">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-black bg-[#FFFDF5]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Title
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Client
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
              Address
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
              Scheduled
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
              Assigned To
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => router.push(`/admin/jobs/${job.id}`)}
              className="hover:bg-[#FDE047]/10 cursor-pointer"
            >
              <td className="px-5 py-3 font-medium text-slate-800">
                {job.title || '\u2014'}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {job.client_name || '\u2014'}
              </td>
              <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                <span className="truncate block max-w-[200px]">
                  {job.address ? `${job.address}, ${job.city}` : '\u2014'}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusBadge[job.status] ?? statusBadge.pending}`}>
                  {statusLabel[job.status] ?? job.status}
                </span>
              </td>
              <td className="px-5 py-3 text-xs text-slate-400 hidden lg:table-cell">
                {job.scheduled_date
                  ? format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')
                  : 'Unscheduled'}
              </td>
              <td className="px-5 py-3 text-xs text-slate-500 hidden lg:table-cell">
                {job.inspector_name ?? 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {jobs.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-slate-400">
          No jobs yet. Create your first job to get started.
        </div>
      )}
    </div>
  )
}
