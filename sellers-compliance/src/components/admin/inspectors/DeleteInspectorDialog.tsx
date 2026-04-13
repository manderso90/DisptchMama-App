'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteInspector } from '@/lib/actions/inspector-actions'
import { Button } from '@/components/ui/button'
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
import { Trash2, AlertTriangle } from 'lucide-react'

interface DeleteInspectorDialogProps {
  inspectorId: string
  inspectorName: string
  assignedJobCount: number
}

export function DeleteInspectorDialog({
  inspectorId,
  inspectorName,
  assignedJobCount,
}: DeleteInspectorDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const hasJobs = assignedJobCount > 0

  function handleDelete() {
    setError('')
    startTransition(async () => {
      try {
        await deleteInspector(inspectorId)
        setOpen(false)
        router.push('/admin/inspectors')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete inspector')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Inspector</DialogTitle>
          <DialogDescription>
            {hasJobs ? (
              <>
                <strong>{inspectorName}</strong> cannot be deleted because they
                have {assignedJobCount} assigned job
                {assignedJobCount > 1 ? 's' : ''}. Please reassign or clear
                those jobs before deleting this inspector.
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong>{inspectorName}</strong>? This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {hasJobs && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Go to each assigned job and reassign or unassign the inspector,
              then return here to delete.
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-300">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            {hasJobs ? 'Close' : 'Cancel'}
          </DialogClose>
          {!hasJobs && (
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 text-white border-2 border-red-800 font-bold hover:bg-red-700"
            >
              {isPending ? 'Deleting...' : 'Delete Inspector'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
