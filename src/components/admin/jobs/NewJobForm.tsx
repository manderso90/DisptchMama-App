'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createJob } from '@/lib/actions/job-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function NewJobForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [title, setTitle] = useState('Inspection')
  const [address, setAddress] = useState('')
  const [hasLockbox, setHasLockbox] = useState(false)
  const [requestedDate, setRequestedDate] = useState('')
  const [timePreference, setTimePreference] = useState('')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !address.trim()) {
      setError('Job type and address are required.')
      return
    }

    startTransition(async () => {
      try {
        await createJob({
          title: title.trim(),
          address: address.trim(),
          city: '',
          state: '',
          zip_code: '',
          has_lockbox: hasLockbox,
          requested_date: requestedDate || undefined,
          requested_time_preference: timePreference || undefined,
          estimated_duration_minutes: parseInt(duration) || 60,
          notes: notes.trim() || undefined,
        })
        router.push('/admin/jobs')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create job')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-2 border-black rounded-lg p-6 space-y-5 neo-shadow">
      {/* Job Type */}
      <div className="space-y-1.5">
        <Label>Job Type *</Label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="jobType"
              checked={title === 'Inspection'}
              onChange={() => setTitle('Inspection')}
              className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm text-slate-700">Inspection</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="jobType"
              checked={title === 'Work'}
              onChange={() => setTitle('Work')}
              className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm text-slate-700">Work</span>
          </label>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Street Name *</Label>
        <Input id="address" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      {/* Property Access */}
      <div className="space-y-1.5">
        <Label>Property Access</Label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="lockbox"
              checked={!hasLockbox}
              onChange={() => setHasLockbox(false)}
              className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm text-slate-700">No Lockbox</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="lockbox"
              checked={hasLockbox}
              onChange={() => setHasLockbox(true)}
              className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm text-slate-700">Lockbox</span>
          </label>
        </div>
      </div>

      {/* Scheduling preferences */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="requested_date">Requested Date</Label>
          <Input id="requested_date" type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time_pref">Time Preference</Label>
          <select
            id="time_pref"
            value={timePreference}
            onChange={(e) => setTimePreference(e.target.value)}
            className="w-full h-9 rounded-md border-2 border-black bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No preference</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="anytime">Anytime</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input id="duration" type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Any additional details about this job..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border-2 border-black bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border-2 border-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#FDE047] text-black border-2 border-black font-bold"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Job'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/jobs')}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
