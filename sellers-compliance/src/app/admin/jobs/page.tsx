import { getJobsList } from '@/lib/queries/jobs'
import { JobsTable } from '@/components/admin/jobs/JobsTable'
import Link from 'next/link'

export default async function JobsPage() {
  const jobs = await getJobsList()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 font-[Syne]">Jobs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All jobs in the system. Create new jobs to populate the dispatch board.
          </p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-[#FDE047] border-2 border-black rounded-md neo-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          + New Job
        </Link>
      </div>

      <JobsTable jobs={jobs} />
    </div>
  )
}
