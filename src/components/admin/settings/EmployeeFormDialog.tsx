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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateEmployee } from '@/lib/actions/employee-actions'
import { Loader2 } from 'lucide-react'
import type { TeamMember } from '@/types/database'

interface EmployeeFormDialogProps {
  mode: 'add' | 'edit'
  employee?: TeamMember
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeFormDialog({
  mode,
  employee,
  open,
  onOpenChange,
}: EmployeeFormDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('field_tech')
  const [phone, setPhone] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && employee) {
        setFullName(employee.full_name || '')
        setEmail(employee.email)
        setRole(employee.role)
        setPhone(employee.phone || '')
        setIsActive(employee.is_active)
      } else {
        setFullName('')
        setEmail('')
        setRole('field_tech')
        setPhone('')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, mode, employee])

  const handleSubmit = () => {
    if (mode === 'add' && !email.trim()) {
      setError('Email is required')
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'add') {
          const res = await fetch('/api/employees/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              full_name: fullName.trim() || null,
              role,
              phone: phone.trim() || null,
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Failed to invite team member')
            return
          }
        } else if (employee) {
          await updateEmployee(employee.id, {
            full_name: fullName.trim() || undefined,
            role: role as TeamMember['role'],
            phone: phone.trim() || undefined,
            is_active: isActive,
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
          <DialogTitle>{mode === 'add' ? 'Add Team Member' : 'Edit Team Member'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Invite a new team member by email. They will receive an invite to set up their account.'
              : 'Update this team member\'s details.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === 'add' && (
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Full Name</Label>
            <Input
              id="emp-name"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(val) => { if (val) setRole(val) }}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                <SelectItem value="field_tech">Field Tech</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-phone">Phone</Label>
            <Input
              id="emp-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
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
            disabled={isPending || (mode === 'add' && !email.trim())}
            className="bg-[#2563EB] border-2 border-black text-white font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'add' ? 'Inviting...' : 'Saving...'}
              </>
            ) : mode === 'add' ? (
              'Send Invite'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
