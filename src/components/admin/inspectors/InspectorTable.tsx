'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { InspectorFormDialog } from './InspectorFormDialog'
import { DeleteInspectorDialog } from './DeleteInspectorDialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Inspector } from '@/types/database'

interface InspectorTableProps {
  inspectors: Inspector[]
}

export function InspectorTable({ inspectors }: InspectorTableProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null)

  const handleEdit = (inspector: Inspector) => {
    setSelectedInspector(inspector)
    setEditOpen(true)
  }

  const handleDelete = (inspector: Inspector) => {
    setSelectedInspector(inspector)
    setDeleteOpen(true)
  }

  return (
    <>
      <div className="bg-white border-2 border-black rounded-lg overflow-hidden neo-shadow">
        <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Inspectors</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your inspection team roster.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-[#FDE047] text-black border-2 border-black font-bold text-sm"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Inspector
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black bg-[#FFFDF5]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Region
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                Added
              </th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inspectors.map((inspector) => (
              <tr key={inspector.id}>
                <td className="px-5 py-3 font-medium text-slate-800">
                  {inspector.full_name}
                </td>
                <td className="px-5 py-3 text-slate-600 text-sm">
                  {inspector.region || 'Valley'}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium ${
                      inspector.is_active
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {inspector.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400 hidden lg:table-cell">
                  {format(new Date(inspector.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEdit(inspector)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inspector)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inspectors.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No inspectors yet. Click &quot;Add Inspector&quot; to add your first inspector.
          </div>
        )}
      </div>

      <InspectorFormDialog mode="add" open={addOpen} onOpenChange={setAddOpen} />

      {selectedInspector && (
        <>
          <InspectorFormDialog
            mode="edit"
            inspector={selectedInspector}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteInspectorDialog
            inspector={selectedInspector}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  )
}
