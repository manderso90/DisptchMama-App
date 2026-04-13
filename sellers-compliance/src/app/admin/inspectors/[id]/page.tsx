import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getInspectorById, getInspectorJobs } from '@/lib/queries/inspectors'
import { InspectorFormDialog } from '@/components/admin/inspectors/InspectorFormDialog'
import { DeleteInspectorDialog } from '@/components/admin/inspectors/DeleteInspectorDialog'
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, Briefcase } from 'lucide-react'
import { format } from 'date-fns'

interface InspectorDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InspectorDetailPage({
  params,
}: InspectorDetailPageProps) {
  const { id } = await params

  const [inspector, jobData] = await Promise.all([
    getInspectorById(id),
    getInspectorJobs(id),
  ])

  if (!inspector) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/inspectors"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Inspectors
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">
            {inspector.full_name}
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {inspector.region}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-medium ${
                inspector.is_active
                  ? 'bg-green-100 text-green-800 border border-green-400'
                  : 'bg-slate-100 text-slate-600 border border-slate-400'
              }`}
            >
              {inspector.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InspectorFormDialog
            inspector={inspector}
            assignedJobCount={jobData.total}
            trigger="icon"
          />
          <DeleteInspectorDialog
            inspectorId={inspector.id}
            inspectorName={inspector.full_name}
            assignedJobCount={jobData.total}
          />
        </div>
      </div>

      {/* Contact & Info */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            {inspector.phone || 'No phone'}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            {inspector.email || 'No email'}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            {inspector.region}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            Added {format(new Date(inspector.created_at), 'MMM d, yyyy')}
          </div>
        </div>
        {inspector.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">{inspector.notes}</p>
          </div>
        )}
      </div>

      {/* Workload Summary */}
      <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Workload
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <strong className="text-slate-900">{jobData.total}</strong> assigned
              job{jobData.total !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <strong className="text-slate-900">{jobData.upcoming.length}</strong>{' '}
              upcoming
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Jobs */}
      {jobData.upcoming.length > 0 && (
        <div className="bg-white border-2 border-black rounded-lg p-5 neo-shadow">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Upcoming Scheduled Jobs
          </h3>
          <div className="space-y-3">
            {jobData.upcoming.map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="block p-3 rounded-md border border-slate-200 hover:border-slate-400 hover:bg-[#FDE047]/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">
                    {job.title} — {job.address}
                  </span>
                  <span className="text-xs text-slate-400">
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  {job.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(
                        new Date(job.scheduled_date + 'T12:00:00'),
                        'MMM d, yyyy'
                      )}
                    </span>
                  )}
                  {job.scheduled_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {job.scheduled_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
