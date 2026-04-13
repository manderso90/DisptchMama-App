'use client'

import { useState, useTransition } from 'react'
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
import { deleteInspector } from '@/lib/actions/inspector-actions'
import { Loader2 } from 'lucide-react'
import type { Inspector } from '@/types/database'

interface DeleteInspectorDialogProps {
  inspector: Inspector
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteInspectorDialog({
  inspector,
  open,
  onOpenChange,
}: DeleteInspectorDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteInspector(inspector.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete inspector')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Inspector</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{inspector.full_name}</strong> from the inspector roster?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-500">
            This will permanently delete this inspector. This action cannot be undone.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border-2 border-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 border-2 border-black"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
