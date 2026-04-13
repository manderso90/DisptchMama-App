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
import { deactivateEmployee, deleteEmployee } from '@/lib/actions/employee-actions'
import { Loader2 } from 'lucide-react'
import type { TeamMember } from '@/types/database'

interface DeleteEmployeeDialogProps {
  employee: TeamMember
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: DeleteEmployeeDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDeactivate = () => {
    startTransition(async () => {
      try {
        await deactivateEmployee(employee.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to deactivate team member')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEmployee(employee.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete team member')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Team Member</DialogTitle>
          <DialogDescription>
            Choose how to handle <strong>{employee.full_name || employee.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border-2 border-black p-3 hover:bg-[#FDE047]/10 transition-colors">
            <p className="text-sm font-medium text-slate-800">Deactivate</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Revokes access but keeps their profile and job history. This is the safe option.
            </p>
          </div>
          <div className="rounded-lg border-2 border-red-400 p-3 hover:bg-red-50 transition-colors">
            <p className="text-sm font-medium text-red-700">Delete permanently</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Removes the profile entirely. Use only if the team member was added by mistake.
            </p>
          </div>

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
          <Button
            onClick={handleDeactivate}
            disabled={isPending}
            className="bg-[#FDE047] text-black border-2 border-black font-bold"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
