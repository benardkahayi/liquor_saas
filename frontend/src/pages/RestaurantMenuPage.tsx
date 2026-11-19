import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Search, UtensilsCrossed, Camera, X } from 'lucide-react'
import { api } from '../api/client'
import { money, toNum } from '../lib/money'
import { ErrorBanner, extractErrorMessage } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { menuImageUrl, resizePhoto } from '../lib/menuImage'

interface MenuItem {
  id: string
  name: string
  category: string
  description: string | null
  price: string | number
  isAvailable: boolean
  isActive: boolean
  imageUpdatedAt?: string | null
}

// Square photo, or a plate icon when the dish has no photo yet.
function DishThumb ({ src, size = 48 }: { src: string | null, size?: number }) {
  return src ? (
    <img
      src={src}
      alt=''
      loading='lazy'
      style={{ width: size, height: size }}
      className='shrink-0 rounded-xl object-cover bg-gray-100'
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className='flex shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-300'
    >
      <UtensilsCrossed size={Math.round(size * 0.42)} />
    </div>
  )
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// Suggested categories for Tanzanian restaurants — the field is free text,
// these are just one-click shortcuts in the form.
const SUGGESTED_CATEGORIES = [
  'Rice dishes',
  'Ugali dishes',
  'Chips',
  'Meat',
  'Fish',
  'Drinks',
  'Other'
]

interface FormState {
  name: string
  category: string
  description: string
  price: string
  isAvailable: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  description: '',
  price: '',
  isAvailable: true
}

export function RestaurantMenuPage () {
  const [items, setItems] = useState<MenuItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Photo in the form: a newly picked one (resized, as a data URL), or a
  // request to remove the current one.
  const [newPhoto, setNewPhoto] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{
        items: MenuItem[]
        pagination: PaginationInfo
      }>('/restaurant/menu', {
        params: {
          page,
          pageSize: 20,
          search: search || undefined,
          category: categoryFilter || undefined
        }
      })
      setItems(res.data.items)
      setPagination(res.data.pagination)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load menu items'))
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter])

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get<{ data: string[] }>(
        '/restaurant/menu/categories'
      )
      setCategories(res.data.data)
    } catch {
      // Categories are a convenience for the filter dropdown — ignore failures.
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  function openCreate () {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setNewPhoto(null)
    setRemovePhoto(false)
    setModalOpen(true)
  }

  function openEdit (item: MenuItem) {
    setEditing(item)
    setForm({
      name: item.name,
      category: item.category,
      description: item.description ?? '',
      price: String(toNum(item.price)),
      isAvailable: item.isAvailable
    })
    setFormError(null)
    setNewPhoto(null)
    setRemovePhoto(false)
    setModalOpen(true)
  }

  async function handlePhotoPicked (file: File | undefined) {
    if (!file) return
    setFormError(null)
    setPreparingPhoto(true)
    try {
      setNewPhoto(await resizePhoto(file))
      setRemovePhoto(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not use that photo')
    } finally {
      setPreparingPhoto(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function clearPhoto () {
    setNewPhoto(null)
    setRemovePhoto(true)
  }

  // What the form shows: the new photo, else the saved one (unless removed).
  const formPhoto =
    newPhoto ?? (editing && !removePhoto ? menuImageUrl(editing) : null)

  function validateForm (): string | null {
    if (!form.name.trim()) return 'Item name is required'
    if (!form.category.trim()) return 'Category is required'
    const price = Number(form.price)
    if (!form.price || Number.isNaN(price) || price <= 0) {
      return 'Price must be a number greater than zero'
    }
    return null
  }

  async function handleSave () {
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      isAvailable: form.isAvailable
    }

    try {
      let saved: MenuItem
      if (editing) {
        const res = await api.put<{ data: MenuItem }>(`/restaurant/menu/${editing.id}`, payload)
        saved = res.data.data
      } else {
        const res = await api.post<{ data: MenuItem }>('/restaurant/menu', payload)
        saved = res.data.data
      }

      try {
        if (newPhoto) {
          await api.put(`/restaurant/menu/${saved.id}/image`, { dataUrl: newPhoto })
        } else if (removePhoto && editing?.imageUpdatedAt) {
          await api.delete(`/restaurant/menu/${saved.id}/image`)
        }
      } catch (err) {
        // The dish itself is saved. Keep the form open on it (now in edit
        // mode) so pressing Save again only retries the photo.
        setEditing(saved)
        setFormError(
          extractErrorMessage(err, 'The dish was saved, but the photo did not upload. Press Save to try again.')
        )
        await loadItems()
        return
      }

      setModalOpen(false)
      await Promise.all([loadItems(), loadCategories()])
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Failed to save menu item'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate (item: MenuItem) {
    if (
      !window.confirm(
        `Remove "${item.name}" from the menu? Past orders will keep their records.`
      )
    ) {
      return
    }
    try {
      await api.delete(`/restaurant/menu/${item.id}`)
      await loadItems()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to remove menu item'))
    }
  }

  async function handleToggleAvailability (item: MenuItem) {
    try {
      await api.put(`/restaurant/menu/${item.id}`, {
        isAvailable: !item.isAvailable
      })
      await loadItems()
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update availability'))
    }
  }

  const filterCategories = Array.from(
    new Set([...categories, ...SUGGESTED_CATEGORIES])
  ).sort()

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Food Menu</h1>
          <p className='mt-1 text-sm text-gray-500'>
            Manage the dishes and drinks your restaurant sells.
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700'
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      <ErrorBanner message={error} />

      {/* Filters */}
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5'>
          <Search size={18} className='text-gray-400' />
          <input
            type='search'
            placeholder='Search menu items...'
            value={search}
            onChange={e => {
              setPage(1)
              setSearch(e.target.value)
            }}
            className='w-full border-0 bg-transparent text-sm outline-none'
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => {
            setPage(1)
            setCategoryFilter(e.target.value)
          }}
          className='rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none'
        >
          <option value=''>All categories</option>
          {filterCategories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Menu table */}
      <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white'>
        {loading ? (
          <div className='p-10 text-center text-sm text-gray-500'>
            Loading menu...
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center gap-3 p-12 text-center'>
            <div className='rounded-full bg-emerald-50 p-4 text-emerald-600'>
              <UtensilsCrossed size={28} />
            </div>
            <p className='font-semibold text-gray-900'>No menu items yet</p>
            <p className='max-w-sm text-sm text-gray-500'>
              Add your first dish or drink so you can start taking orders.
            </p>
            <button
              type='button'
              onClick={openCreate}
              className='mt-2 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700'
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[700px] text-left text-sm'>
              <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-5 py-4'>Item</th>
                  <th className='px-5 py-4'>Category</th>
                  <th className='px-5 py-4'>Price</th>
                  <th className='px-5 py-4'>Availability</th>
                  <th className='px-5 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {items.map(item => (
                  <tr key={item.id} className='hover:bg-gray-50'>
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-3'>
                        <DishThumb src={menuImageUrl(item)} />
                        <div className='min-w-0'>
                          <p className='font-semibold text-gray-900'>{item.name}</p>
                          {item.description && (
                            <p className='mt-0.5 max-w-xs truncate text-xs text-gray-400'>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-5 py-4'>
                      <span className='inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700'>
                        {item.category}
                      </span>
                    </td>
                    <td className='px-5 py-4 font-medium'>
                      {money(item.price)}
                    </td>
                    <td className='px-5 py-4'>
                      <button
                        type='button'
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title='Click to toggle'
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className='px-5 py-4'>
                      <div className='flex justify-end gap-2'>
                        <button
                          type='button'
                          onClick={() => openEdit(item)}
                          className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDeactivate(item)}
                          className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600'
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination pagination={pagination} onPageChange={setPage} />
      )}

      {/* Create / edit modal */}
      {modalOpen && (
        <Modal
          title={editing ? `Edit "${editing.name}"` : 'Add menu item'}
          onClose={() => setModalOpen(false)}
        >
          <div className='space-y-4'>
            <ErrorBanner message={formError} />

            <div>
              <span className='mb-1 block text-sm font-medium text-gray-700'>
                Photo
              </span>
              <div className='flex items-center gap-4'>
                <div className='relative'>
                  <DishThumb src={formPhoto} size={96} />
                  {formPhoto && (
                    <button
                      type='button'
                      onClick={clearPhoto}
                      className='absolute -right-2 -top-2 rounded-full border border-gray-200 bg-white p-1 text-gray-500 shadow-sm hover:text-red-600'
                      aria-label='Remove photo'
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className='space-y-1'>
                  <button
                    type='button'
                    onClick={() => fileInput.current?.click()}
                    disabled={preparingPhoto}
                    className='flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    <Camera size={16} />
                    {preparingPhoto
                      ? 'Preparing photo...'
                      : formPhoto
                        ? 'Change photo'
                        : 'Take or choose photo'}
                  </button>
                  <p className='text-xs text-gray-400'>
                    Optional. Shows on the menu and at the counter.
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={e => handlePhotoPicked(e.target.files?.[0])}
                />
              </div>
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Name *
              </label>
              <input
                type='text'
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder='e.g. Wali na nyama'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Category *
              </label>
              <input
                type='text'
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder='e.g. Rice dishes'
                list='menu-categories'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
              <datalist id='menu-categories'>
                {filterCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Price (TSh) *
              </label>
              <input
                type='number'
                min='0'
                step='100'
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder='e.g. 5000'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                placeholder='Optional — e.g. served with vegetables'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500'
              />
            </div>

            <label className='flex items-center gap-2 text-sm text-gray-700'>
              <input
                type='checkbox'
                checked={form.isAvailable}
                onChange={e =>
                  setForm({ ...form, isAvailable: e.target.checked })
                }
                className='h-4 w-4 rounded border-gray-300'
              />
              Available for ordering
            </label>

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
                disabled={saving || preparingPhoto}
                className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add item'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default RestaurantMenuPage
