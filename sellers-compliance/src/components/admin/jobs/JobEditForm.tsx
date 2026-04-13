'use client'

import { useState, useTransition } from 'react'
import { updateJob } from '@/lib/actions/job-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Job } from '@/types/database'
import { Loader2, Pencil, X } from 'lucide-react'

interface JobEditFormProps {
  job: Job
}

export function JobEditForm({ job }: JobEditFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [title, setTitle] = useState(job.title)
  const [clientName, setClientName] = useState(job.client_name)
  const [clientPhone, setClientPhone] = useState(job.client_phone ?? '')
  const [clientEmail, setClientEmail] = useState(job.client_email ?? '')
  const [address, setAddress] = useState(job.address)
  const [city, setCity] = useState(job.city)
  const [state, setState] = useState(job.state)
  const [zipCode, setZipCode] = useState(job.zip_code)
  const [hasLockbox, setHasLockbox] = useState(job.has_lockbox)
  const [requestedDate, setRequestedDate] = useState(job.requested_date ?? '')
  const [timePreference, setTimePreference] = useState(job.requested_time_preference ?? '')
  const [scheduledDate, setScheduledDate] = useState(job.scheduled_date ?? '')
  const [scheduledTime, setScheduledTime] = useState(job.scheduled_time?.slice(0, 5) ?? '')
  const [duration, setDuration] = useState(String(job.estimated_duration_minutes))
  const [notes, setNotes] = useState(job.notes ?? '')

  function resetForm() {
    setTitle(job.title)
    setClientName(job.client_name)
    setClientPhone(job.client_phone ?? '')
    setClientEmail(job.client_email ?? '')
    setAddress(job.address)
    setCity(job.city)
    setState(job.state)
    setZipCode(job.zip_code)
    setHasLockbox(job.has_lockbox)
    setRequestedDate(job.requested_date ?? '')
    setTimePreference(job.requested_time_preference ?? '')
    setScheduledDate(job.scheduled_date ?? '')
    setScheduledTime(job.scheduled_time?.slice(0, 5) ?? '')
    setDuration(String(job.estimated_duration_minutes))
    setNotes(job.notes ?? '')
    setError('')
  }

  function handleCancel() {
    resetForm()
    setIsEditing(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !address.trim()) {
      setError('Job type and address are required.')
      return
    }

    startTransition(async () => {
      try {
        await updateJob(job.id, {
          title: title.trim(),
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          client_email: clientEmail.trim(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zip_code: zipCode.trim(),
          has_lockbox: hasLockbox,
          requested_date: requestedDate || undefined,
          requested_time_preference: timePreference || undefined,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          estimated_duration_minutes: parseInt(duration) || 60,
          notes: notes.trim(),
        })
        setIsEditing(false)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update job')
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Job Details</h3>
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="text-xs"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-slate-500">Type</span>
            <p className="font-medium text-slate-800">{job.title || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Lockbox</span>
            <p className="font-medium text-slate-800">{job.has_lockbox ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-slate-500">Client</span>
            <p className="font-medium text-slate-800">{job.client_name || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Phone</span>
            <p className="font-medium text-slate-800">{job.client_phone || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Email</span>
            <p className="font-medium text-slate-800">{job.client_email || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Duration</span>
            <p className="font-medium text-slate-800">{job.estimated_duration_minutes} min</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">Address</span>
            <p className="font-medium text-slate-800">
              {job.address}{job.city ? `, ${job.city}` : ''}{job.state ? `, ${job.state}` : ''} {job.zip_code}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Scheduled Date</span>
            <p className="font-medium text-slate-800">{job.scheduled_date || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Scheduled Time</span>
            <p className="font-medium text-slate-800">{job.scheduled_time?.slice(0, 5) || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Client Requested Date</span>
            <p className="font-medium text-slate-800">{job.requested_date || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Client Time Preference</span>
            <p className="font-medium text-slate-800 capitalize">{job.requested_time_preference || '—'}</p>
          </div>
          {job.notes && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">Notes</span>
              <p className="font-medium text-slate-800 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Edit Job</h3>
        <Button type="button" variant="ghost" onClick={handleCancel} className="text-xs">
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
      </div>

      {/* Job Type */}
      <div className="space-y-1.5">
        <Label>Job Type *</Label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="jobType" checked={title === 'Inspection'} onChange={() => setTitle('Inspection')} className="h-4 w-4" />
            <span className="text-sm text-slate-700">Inspection</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="jobType" checked={title === 'Work'} onChange={() => setTitle('Work')} className="h-4 w-4" />
            <span className="text-sm text-slate-700">Work</span>
          </label>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="client_name">Client Name</Label>
          <Input id="client_name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client_phone">Client Phone</Label>
          <Input id="client_phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="client_email">Client Email</Label>
          <Input id="client_email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="edit_address">Street Address *</Label>
        <Input id="edit_address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit_city">City</Label>
          <Input id="edit_city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_state">State</Label>
          <Input id="edit_state" value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_zip">Zip</Label>
          <Input id="edit_zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
        </div>
      </div>

      {/* Lockbox */}
      <div className="space-y-1.5">
        <Label>Property Access</Label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="lockbox" checked={!hasLockbox} onChange={() => setHasLockbox(false)} className="h-4 w-4" />
            <span className="text-sm text-slate-700">No Lockbox</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="lockbox" checked={hasLockbox} onChange={() => setHasLockbox(true)} className="h-4 w-4" />
            <span className="text-sm text-slate-700">Lockbox</span>
          </label>
        </div>
      </div>

      {/* Dispatch schedule */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit_sched_date">Scheduled Date</Label>
          <Input id="edit_sched_date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_sched_time">Scheduled Time</Label>
          <Input id="edit_sched_time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_duration">Duration (min)</Label>
          <Input id="edit_duration" type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </div>

      {/* Client preferences */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit_date">Client Requested Date</Label>
          <Input id="edit_date" type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit_time_pref">Client Time Preference</Label>
          <select
            id="edit_time_pref"
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
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="edit_notes">Notes</Label>
        <textarea
          id="edit_notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border-2 border-black bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border-2 border-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="bg-[#FDE047] text-black border-2 border-black font-bold">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
