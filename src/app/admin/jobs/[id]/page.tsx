import { notFound } from 'next/navigation'
import { getJobDetail } from '@/lib/queries/jobs'
import { JobDetailClient } from '@/components/admin/jobs/JobDetailClient'
import Link from 'next/link'

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params
  const job = await getJobDetail(id)

  if (!job) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/jobs"
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          &larr; Back to Jobs
        </Link>
      </div>

      <JobDetailClient job={job} />
    </div>
  )
}
