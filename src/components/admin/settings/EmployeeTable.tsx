'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { EmployeeFormDialog } from './EmployeeFormDialog'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { TeamMember } from '@/types/database'

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  dispatcher: 'Dispatcher',
  field_tech: 'Field Tech',
}

interface EmployeeTableProps {
  employees: TeamMember[]
  currentUserId: string
}

export function EmployeeTable({ employees, currentUserId }: EmployeeTableProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null)

  const handleEdit = (employee: TeamMember) => {
    setSelectedEmployee(employee)
    setEditOpen(true)
  }

  const handleDelete = (employee: TeamMember) => {
    setSelectedEmployee(employee)
    setDeleteOpen(true)
  }

  return (
    <>
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden neo-shadow">
        <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Team Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your team&apos;s access and roles.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[#FDE047] text-black border-2 border-black font-bold text-sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Team Member
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-[#FFFDF5]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                Email
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                Joined
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-5 py-3 font-medium text-slate-800">
                  {emp.full_name || '\u2014'}
                </td>
                <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{emp.email}</td>
                <td className="px-5 py-3">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium capitalize">
                    {roleLabel[emp.role] || emp.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium ${
                      emp.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400 hidden lg:table-cell">
                  {format(new Date(emp.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(emp)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {emp.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(emp)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No team members yet. Click &quot;Add Team Member&quot; to invite your first team member.
          </div>
        )}
      </div>

      <EmployeeFormDialog mode="add" open={addOpen} onOpenChange={setAddOpen} />

      {selectedEmployee && (
        <>
          <EmployeeFormDialog
            mode="edit"
            employee={selectedEmployee}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteEmployeeDialog
            employee={selectedEmployee}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  )
}
