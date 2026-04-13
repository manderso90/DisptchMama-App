'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Briefcase,
  UserX,
  CalendarClock,
  PauseCircle,
  AlertTriangle,
  AlertOctagon,
  MapPin,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import type { CommandCenterData, RiskJob } from '@/lib/queries/command-center'

interface CommandCenterProps {
  data: CommandCenterData
}

export function CommandCenter({ data }: CommandCenterProps) {
  const criticalCount =
    data.critical.confirmedUnscheduled.length +
    data.critical.inactiveInspector.length +
    data.critical.overdueUnconfirmed.length

  const attentionCount =
    data.needsAttention.unassignedPending.length +
    data.needsAttention.onHold.length +
    data.needsAttention.assignedNoSchedule.length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">
          Command Center
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — System overview and
          risk detection
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Active Jobs"
          value={data.totalActiveJobs}
          href="/admin/jobs"
          icon={<Briefcase className="w-4 h-4" />}
          color="slate"
        />
        <SummaryCard
          label="Unassigned"
          value={data.unassignedPendingCount}
          href="/admin/jobs"
          icon={<UserX className="w-4 h-4" />}
          color={data.unassignedPendingCount > 0 ? 'amber' : 'slate'}
        />
        <SummaryCard
          label="Today's Schedule"
          value={data.todayScheduledCount}
          href="/admin/dispatch"
          icon={<CalendarClock className="w-4 h-4" />}
          color="slate"
        />
        <SummaryCard
          label="On Hold"
          value={data.onHoldCount}
          href="/admin/jobs"
          icon={<PauseCircle className="w-4 h-4" />}
          color={data.onHoldCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* At-Risk: Critical */}
      {criticalCount > 0 && (
        <div className="bg-white border-2 border-red-400 rounded-lg p-5 neo-shadow">
          <div className="flex items-center gap-2 mb-4">
            <AlertOctagon className="w-4.5 h-4.5 text-red-600" />
            <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wide">
              Critical
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-300">
              {criticalCount}
            </span>
          </div>

          <div className="space-y-4">
            {data.critical.confirmedUnscheduled.length > 0 && (
              <RiskGroup
                label="Confirmed but missing schedule or assignment"
                jobs={data.critical.confirmedUnscheduled}
              />
            )}
            {data.critical.inactiveInspector.length > 0 && (
              <RiskGroup
                label="Assigned to inactive inspector"
                jobs={data.critical.inactiveInspector}
              />
            )}
            {data.critical.overdueUnconfirmed.length > 0 && (
              <RiskGroup
                label="Past scheduled date, still pending"
                jobs={data.critical.overdueUnconfirmed}
              />
            )}
          </div>
        </div>
      )}

      {/* At-Risk: Needs Attention */}
      {attentionCount > 0 && (
        <div className="bg-white border-2 border-amber-400 rounded-lg p-5 neo-shadow">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
              Needs Attention
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-300">
              {attentionCount}
            </span>
          </div>

          <div className="space-y-4">
            {data.needsAttention.unassignedPending.length > 0 && (
              <RiskGroup
                label="Pending with no inspector assigned"
                jobs={data.needsAttention.unassignedPending}
              />
            )}
            {data.needsAttention.onHold.length > 0 && (
              <RiskGroup
                label="On hold"
                jobs={data.needsAttention.onHold}
              />
            )}
            {data.needsAttention.assignedNoSchedule.length > 0 && (
              <RiskGroup
                label="Inspector assigned but no scheduled date"
                jobs={data.needsAttention.assignedNoSchedule}
              />
            )}
          </div>
        </div>
      )}

      {/* All clear */}
      {criticalCount === 0 && attentionCount === 0 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-5 neo-shadow text-center">
          <p className="text-sm font-medium text-green-800">
            All clear — no at-risk jobs detected.
          </p>
        </div>
      )}

      {/* Inspector Workload */}
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden neo-shadow">
        <div className="px-5 py-3 border-b-2 border-black bg-[#FFFDF5]">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Inspector Workload
          </h2>
        </div>
        <WorkloadTable inspectors={data.inspectorWorkload} />
      </div>
    </div>
  )
}

// --- Sub-components ---

function SummaryCard({
  label,
  value,
  href,
  icon,
  color,
}: {
  label: string
  value: number
  href: string
  icon: React.ReactNode
  color: 'slate' | 'amber'
}) {
  return (
    <Link
      href={href}
      className="bg-white border-2 border-black rounded-lg p-4 neo-shadow hover:translate-y-0.5 hover:shadow-none transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`p-1.5 rounded-md ${
            color === 'amber'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Link>
  )
}

function RiskGroup({ label, jobs }: { label: string; jobs: RiskJob[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">
        {label}{' '}
        <span className="text-slate-400">({jobs.length})</span>
      </p>
      <div className="space-y-1.5">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/admin/jobs/${job.id}`}
            className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-400 hover:bg-[#FDE047]/5 transition-colors text-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-medium text-slate-800 truncate">
                {job.title}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                <MapPin className="w-3 h-3" />
                {job.address}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              {job.inspector_name && (
                <span className="text-xs text-slate-500">
                  {job.inspector_name}
                </span>
              )}
              {job.scheduled_date && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {format(
                    new Date(job.scheduled_date + 'T12:00:00'),
                    'MMM d'
                  )}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function WorkloadTable({
  inspectors,
}: {
  inspectors: CommandCenterData['inspectorWorkload']
}) {
  const router = useRouter()

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-[#FFFDF5]">
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Inspector
            </th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Region
            </th>
            <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assigned
            </th>
            <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Today
            </th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {inspectors.map((inspector) => (
            <tr
              key={inspector.id}
              onClick={() =>
                router.push(`/admin/inspectors/${inspector.id}`)
              }
              className="hover:bg-[#FDE047]/10 cursor-pointer"
            >
              <td className="px-5 py-2.5 font-medium text-slate-800">
                {inspector.full_name}
              </td>
              <td className="px-5 py-2.5 text-slate-600">
                {inspector.region}
              </td>
              <td className="px-5 py-2.5 text-center">
                <span className="font-bold text-slate-900">
                  {inspector.totalAssigned}
                </span>
              </td>
              <td className="px-5 py-2.5 text-center">
                <span
                  className={
                    inspector.todayCount > 0
                      ? 'font-bold text-slate-900'
                      : 'text-slate-400'
                  }
                >
                  {inspector.todayCount}
                </span>
              </td>
              <td className="px-5 py-2.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    inspector.is_active
                      ? 'bg-green-100 text-green-800 border border-green-400'
                      : 'bg-slate-100 text-slate-600 border border-slate-400'
                  }`}
                >
                  {inspector.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {inspectors.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No inspectors in the system.
        </div>
      )}
    </>
  )
}
