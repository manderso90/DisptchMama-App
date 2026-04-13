'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInspector, updateInspector } from '@/lib/actions/inspector-actions'
import { Loader2 } from 'lucide-react'
import type { Inspector } from '@/types/database'

interface InspectorFormDialogProps {
  mode: 'add' | 'edit'
  inspector?: Inspector
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InspectorFormDialog({
  mode,
  inspector,
  open,
  onOpenChange,
}: InspectorFormDialogProps) {
  const [fullName, setFullName] = useState('')
  const [region, setRegion] = useState('Valley')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && inspector) {
        setFullName(inspector.full_name)
        setRegion(inspector.region || 'Valley')
        setNotes(inspector.notes || '')
        setIsActive(inspector.is_active)
      } else {
        setFullName('')
        setRegion('Valley')
        setNotes('')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, mode, inspector])

  const handleSubmit = () => {
    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'add') {
          await createInspector({
            full_name: fullName.trim(),
            region,
            notes: notes.trim() || undefined,
          })
        } else if (inspector) {
          await updateInspector(inspector.id, {
            full_name: fullName.trim(),
            region,
            is_active: isActive,
            notes: notes.trim() || undefined,
          })
        }
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Inspector' : 'Edit Inspector'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Add a new inspector to your team roster.'
              : 'Update this inspector\'s details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="insp-name">Full Name *</Label>
            <Input
              id="insp-name"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Region *</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="region"
                  checked={region === 'Valley'}
                  onChange={() => setRegion('Valley')}
                  className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-sm text-slate-700">Valley</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="region"
                  checked={region === 'Los Angeles'}
                  onChange={() => setRegion('Los Angeles')}
                  className="h-4 w-4 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="text-sm text-slate-700">Los Angeles</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="insp-notes">Notes</Label>
            <textarea
              id="insp-notes"
              rows={2}
              placeholder="Any notes about this inspector..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border-2 border-black bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border-2 border-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !fullName.trim()}
            className="bg-[#2563EB] border-2 border-black text-white font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'add' ? 'Adding...' : 'Saving...'}
              </>
            ) : mode === 'add' ? (
              'Add Inspector'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
