import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getJobDetail, getJobStatusHistory } from '@/lib/queries/jobs'
import { JobDetailClient } from '@/components/admin/jobs/JobDetailClient'
import { JobHistory } from '@/components/admin/jobs/JobHistory'
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

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

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params

  const [job, history] = await Promise.all([
    getJobDetail(id),
    getJobStatusHistory(id),
  ])

  if (!job) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">
            {job.title} — {job.address}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {job.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy')}
                {job.scheduled_time && ` at ${job.scheduled_time.slice(0, 5)}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {job.city || 'No city'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {job.estimated_duration_minutes} min
            </span>
          </div>
        </div>

        {/* Delete button placeholder — Phase 3 */}
      </div>

      {/* Status + Assignment (read-only for Phase 1) */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow space-y-5">
        {/* Status display */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500">Status</span>
          <span
            className={`text-xs px-2 py-1 rounded-md font-medium ${statusBadge[job.status] ?? statusBadge.pending}`}
          >
            {statusLabel[job.status] ?? job.status}
          </span>
        </div>

        {/* Inspector assignment display */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Assigned To</span>
            <span className="text-sm text-slate-700">
              {job.inspector_name ?? 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Dispatch info */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Dispatch Status</span>
            <span className="text-xs px-2 py-1 rounded-md font-medium bg-slate-100 text-slate-600 border border-slate-300">
              {job.dispatch_status}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Scheduling (existing — untouched) */}
      <JobDetailClient job={job} />

      {/* Job Details (read-only for Phase 1) */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Job Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <DetailRow label="Type" value={job.title} />
            <DetailRow label="Client" value={job.client_name} />
            <DetailRow label="Email" value={job.client_email} />
            <DetailRow label="Lockbox" value={job.has_lockbox ? 'Yes' : 'No'} />
          </div>
          <div className="space-y-2">
            <DetailRow label="Phone" value={job.client_phone} />
            <DetailRow label="Duration" value={`${job.estimated_duration_minutes} min`} />
            <DetailRow label="Requested Date" value={job.requested_date} />
            <DetailRow label="Time Preference" value={job.requested_time_preference} />
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <DetailRow
            label="Address"
            value={[job.address, job.city, job.state, job.zip_code].filter(Boolean).join(', ')}
          />
          {job.scheduled_date && (
            <DetailRow
              label="Scheduled"
              value={`${job.scheduled_date}${job.scheduled_time ? ' at ' + job.scheduled_time.slice(0, 5) : ''}`}
            />
          )}
          {job.notes && <DetailRow label="Notes" value={job.notes} />}
        </div>
      </div>

      {/* Status History */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Status History
        </h3>
        <JobHistory history={history} />
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-700 min-w-[120px]">{label}:</span>
      <span className="text-slate-600">{value || '\u2014'}</span>
    </div>
  )
}
