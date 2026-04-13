'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInspector, updateInspector } from '@/lib/actions/inspector-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { Inspector } from '@/types/database'
import { Plus, Pencil, AlertTriangle } from 'lucide-react'

interface InspectorFormDialogProps {
  inspector?: Inspector
  /** Number of jobs assigned to this inspector — used for deactivation warning */
  assignedJobCount?: number
  trigger?: 'button' | 'icon'
}

export function InspectorFormDialog({
  inspector,
  assignedJobCount = 0,
  trigger = 'button',
}: InspectorFormDialogProps) {
  const isEdit = !!inspector
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  // Form state
  const [fullName, setFullName] = useState(inspector?.full_name ?? '')
  const [phone, setPhone] = useState(inspector?.phone ?? '')
  const [email, setEmail] = useState(inspector?.email ?? '')
  const [region, setRegion] = useState(inspector?.region ?? 'Valley')
  const [isActive, setIsActive] = useState(inspector?.is_active ?? true)
  const [notes, setNotes] = useState(inspector?.notes ?? '')

  // Show deactivation warning when toggling active inspector to inactive
  const showDeactivationWarning =
    isEdit && inspector?.is_active && !isActive && assignedJobCount > 0

  function resetForm() {
    setFullName(inspector?.full_name ?? '')
    setPhone(inspector?.phone ?? '')
    setEmail(inspector?.email ?? '')
    setRegion(inspector?.region ?? 'Valley')
    setIsActive(inspector?.is_active ?? true)
    setNotes(inspector?.notes ?? '')
    setError('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) resetForm()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateInspector(inspector.id, {
            full_name: fullName,
            phone,
            email,
            region,
            is_active: isActive,
            notes,
          })
        } else {
          await createInspector({
            full_name: fullName,
            phone,
            email,
            region,
            notes,
          })
        }
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const triggerElement =
    trigger === 'icon' ? (
      <Button variant="outline" size="sm">
        <Pencil className="w-4 h-4 mr-1.5" />
        Edit
      </Button>
    ) : (
      <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-[#FDE047] border-2 border-black rounded-md neo-shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all">
        <Plus className="w-4 h-4" />
        Add Inspector
      </button>
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Inspector' : 'Add Inspector'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update inspector details below.'
              : 'Enter details for the new inspector.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Region</Label>
            <div className="flex gap-4">
              {['Valley', 'Los Angeles'].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="region"
                    value={r}
                    checked={region === r}
                    onChange={(e) => setRegion(e.target.value)}
                    className="accent-slate-900"
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional notes..."
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-slate-900"
                />
                Active
              </label>

              {showDeactivationWarning && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    This inspector has {assignedJobCount} assigned job
                    {assignedJobCount > 1 ? 's' : ''}. Deactivating will remove
                    them from the dispatch timeline. Their assigned jobs will
                    remain but won&apos;t appear on the board until reassigned to
                    an active inspector.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-300">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={isPending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? 'Saving...'
                  : 'Adding...'
                : isEdit
                  ? 'Save Changes'
                  : 'Add Inspector'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
