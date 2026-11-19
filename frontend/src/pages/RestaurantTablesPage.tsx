import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, CheckCircle2, Clock } from 'lucide-react'
import { api } from '../api/client'
import { money } from '../lib/money'
import { ErrorBanner, extractErrorMessage } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'

interface ActiveOrder {
  id: string
  total: string | number
  status: string
  createdAt: string
}

interface RestaurantTable {
  id: string
  label: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED'
  activeOrder: ActiveOrder | null
}

interface FormState {
  label: string
  capacity: string
}

const EMPTY_FORM: FormState = { label: '', capacity: '4' }

export function RestaurantTablesPage () {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RestaurantTable | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadTables = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ data: RestaurantTable[] }>(
        '/restaurant/tables'
      )
      setTables(res.data.data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load tables'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTables()
  }, [loadTables])

  function openCreate () {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit (table: RestaurantTable) {
    setEditing(table)
    setForm({ label: table.label, capacity: String(table.capacity) })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave () {
    if (!form.label.trim()) {
      setFormError('Table label is required')
      return
    }
    const capacity = Number(form.capacity)
    if (!form.capacity || Number.isNaN(capacity) || capacity < 1) {
      setFormError('Capacity must be at least 1')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const payload = { label: form.label.trim(), capacity }
      if (editing) {
        await api.put(`/restaurant/tables/${editing.id}`, payload)
      } else {
        await api.post('/restaurant/tables', payload)
      }
      setModalOpen(false)
      await loadTables()
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save table'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete (table: RestaurantTable) {
    if (!window.confirm(`Delete table "${table.label}"?`)) return
    try {
      await api.delete(`/restaurant/tables/${table.id}`)
      await loadTables()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete table'))
    }
  }

  const available = tables.filter(t => t.status === 'AVAILABLE').length

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Tables</h1>
          <p className='mt-1 text-sm text-gray-500'>
            {tables.length === 0
              ? 'Register your seating tables. Optional — skip this if you only do takeaway.'
              : `${available} of ${tables.length} tables available`}
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700'
        >
          <Plus size={18} />
          Add Table
        </button>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500'>
          Loading tables...
        </div>
      ) : tables.length === 0 ? (
        <div className='flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-12 text-center'>
          <div className='rounded-full bg-emerald-50 p-4 text-emerald-600'>
            <Users size={28} />
          </div>
          <p className='font-semibold text-gray-900'>No tables registered</p>
          <p className='max-w-sm text-sm text-gray-500'>
            If your restaurant has seating, add your tables here to track which
            are occupied. Takeaway-only businesses don't need tables.
          </p>
          <button
            type='button'
            onClick={openCreate}
            className='mt-2 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700'
          >
            <Plus size={18} />
            Add Table
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {tables.map(table => {
            const occupied = table.status === 'OCCUPIED'
            return (
              <article
                key={table.id}
                className={`rounded-2xl border p-5 ${
                  occupied
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <h3 className='font-bold text-gray-900'>{table.label}</h3>
                    <p className='mt-1 text-xs text-gray-500'>
                      {table.capacity} seats
                    </p>
                  </div>
                  {occupied ? (
                    <Clock size={20} className='text-orange-600' />
                  ) : (
                    <CheckCircle2 size={20} className='text-emerald-600' />
                  )}
                </div>

                <p
                  className={`mt-3 text-sm font-semibold ${
                    occupied ? 'text-orange-700' : 'text-emerald-700'
                  }`}
                >
                  {occupied ? 'Occupied' : 'Available'}
                </p>

                {occupied && table.activeOrder && (
                  <p className='mt-1 text-xs text-gray-500'>
                    Order {money(table.activeOrder.total)} ·{' '}
                    {table.activeOrder.status}
                  </p>
                )}

                <div className='mt-4 flex gap-2 border-t border-black/5 pt-3'>
                  <button
                    type='button'
                    onClick={() => openEdit(table)}
                    className='flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50'
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDelete(table)}
                    className='flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? `Edit "${editing.label}"` : 'Add table'}
          onClose={() => setModalOpen(false)}
        >
          <div className='space-y-4'>
            <ErrorBanner message={formError} />

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Label *
              </label>
              <input
                type='text'
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder='e.g. Table 1 or Corner booth'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Seats *
              </label>
              <input
                type='number'
                min='1'
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
            </div>

            <div className='flex justify-end gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setModalOpen(false)}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSave}
                disabled={saving}
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add table'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default RestaurantTablesPage
