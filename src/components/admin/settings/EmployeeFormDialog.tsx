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
import { updateEmployee } from '@/lib/actions/employee-actions'
import { Loader2 } from 'lucide-react'
import type { TeamMember, TeamMemberRole } from '@/types/database'

const ROLE_OPTIONS: { value: TeamMemberRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'worker', label: 'Worker' },
  { value: 'vendor', label: 'Vendor' },
]

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
  const [roles, setRoles] = useState<TeamMemberRole[]>([])
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
        setRoles(employee.roles ?? [])
        setPhone(employee.phone || '')
        setIsActive(employee.is_active)
      } else {
        setFullName('')
        setEmail('')
        setRoles([])
        setPhone('')
        setIsActive(true)
      }
      setError('')
    }
  }, [open, mode, employee])

  function toggleRole(role: TeamMemberRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const handleSubmit = () => {
    if (mode === 'add' && !email.trim()) {
      setError('Email is required')
      return
    }
    if (roles.length === 0) {
      setError('At least one role must be selected')
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
              roles,
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
            roles,
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

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md border-2 cursor-pointer transition-colors ${
                    roles.includes(opt.value)
                      ? 'border-[#2563EB] bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
                  />
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
            {roles.length === 0 && (
              <p className="text-xs text-slate-400">Select at least one role</p>
            )}
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
            disabled={isPending || (mode === 'add' && !email.trim()) || roles.length === 0}
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
