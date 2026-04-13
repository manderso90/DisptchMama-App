'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteJob } from '@/lib/actions/job-actions'
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
import { Trash2 } from 'lucide-react'

interface DeleteJobDialogProps {
  jobId: string
  jobTitle: string
}

export function DeleteJobDialog({ jobId, jobTitle }: DeleteJobDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  function handleDelete() {
    setError('')
    startTransition(async () => {
      try {
        await deleteJob(jobId)
        setOpen(false)
        router.push('/admin/jobs')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete job')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400">
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{jobTitle}&rdquo;? This action cannot be undone. All status history will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-300">{error}</p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 text-white border-2 border-red-800 font-bold hover:bg-red-700"
          >
            {isPending ? 'Deleting...' : 'Delete Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
