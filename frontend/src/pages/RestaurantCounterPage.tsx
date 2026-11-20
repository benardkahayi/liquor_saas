import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search, Trash2, CheckCircle2, ShoppingBag, UserRound, UtensilsCrossed } from 'lucide-react'
import { api } from '../api/client'
import { money, toNum } from '../lib/money'
import { ErrorBanner, extractErrorMessage } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'
import { useLanguage } from '../context/LanguageContext'
import { menuImageUrl } from '../lib/menuImage'

interface MenuItem {
  id: string
  name: string
  category: string
  price: string | number
  isAvailable: boolean
  imageUpdatedAt?: string | null
}

interface CartLine {
  item: MenuItem
  quantity: number
}

type Method = 'CASH' | 'MOBILE_MONEY' | 'CARD'

interface CheckoutResult {
  total: string
  paid: string
  change: string
  balance: string
  order: {
    id: string
    customer: { fullName: string; phone: string | null } | null
    items: { quantity: number; lineTotal: string; menuItem: { name: string } }[]
  }
}

// Round-number notes customers usually hand over, in Tsh.
const NOTES = [1000, 2000, 5000, 10000, 20000, 50000]

export function RestaurantCounterPage () {
  const { t } = useLanguage()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState<Method>('CASH')
  const [received, setReceived] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CheckoutResult | null>(null)

  useEffect(() => {
    // Load the whole active menu (the API pages at 100 per request).
    async function load () {
      try {
        const all: MenuItem[] = []
        let page = 1
        let totalPages = 1
        do {
          const res = await api.get<{ items: MenuItem[]; pagination: { totalPages: number } }>(
            '/restaurant/menu',
            { params: { page, pageSize: 100 } }
          )
          all.push(...res.data.items)
          totalPages = res.data.pagination.totalPages
          page++
        } while (page <= totalPages)
        setMenu(all.filter(m => m.isAvailable))
      } catch (err) {
        setError(extractErrorMessage(err, t('counter.error.menu', 'Failed to load the menu')))
      } finally {
        setLoadingMenu(false)
      }
    }
    load()
  }, [t])

  const categories = useMemo(
    () => Array.from(new Set(menu.map(m => m.category))).sort(),
    [menu]
  )

  // Once any dish has a photo, every tile gets a picture area (a plate icon
  // when it has no photo) so the grid stays even.
  const anyPhoto = menu.some(m => m.imageUpdatedAt)
  const visibleMenu = menu.filter(
    m =>
      (!category || m.category === category) &&
      (!search || m.name.toLowerCase().includes(search.toLowerCase()))
  )

  const total = cart.reduce((sum, l) => sum + toNum(l.item.price) * l.quantity, 0)
  const receivedNum = received === '' ? total : Number(received)
  const change = method === 'CASH' ? Math.max(receivedNum - total, 0) : 0
  const balance = Math.max(total - receivedNum, 0)
  const overpaidNonCash = method !== 'CASH' && receivedNum > total
  const needsCustomer = balance > 0

  // Suggest the next notes at or above the bill, e.g. bill 6,500 → 10,000, 20,000.
  const quickNotes = NOTES.filter(n => n > total).slice(0, 3)

  function addItem (item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(l => l.item.id === item.id)
      if (existing) {
        return prev.map(l => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  function changeQty (id: string, delta: number) {
    setCart(prev =>
      prev
        .map(l => (l.item.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0)
    )
  }

  function resetSale () {
    setCart([])
    setMethod('CASH')
    setReceived('')
    setCustomerName('')
    setCustomerPhone('')
    setError(null)
    setResult(null)
  }

  async function completeSale () {
    setError(null)
    if (cart.length === 0) return
    if (overpaidNonCash) {
      setError(t('counter.error.overpay', 'Only cash can be more than the bill. Enter the exact amount.'))
      return
    }
    if (needsCustomer && (!customerName.trim() || !customerPhone.trim())) {
      setError(t('counter.error.customer', 'Enter the customer name and phone to record the unpaid amount as a debt.'))
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<{ data: CheckoutResult }>('/restaurant/counter/checkout', {
        items: cart.map(l => ({ menuItemId: l.item.id, quantity: l.quantity })),
        method,
        amountReceived: receivedNum,
        ...(customerName.trim() && customerPhone.trim()
          ? { newCustomer: { fullName: customerName.trim(), phone: customerPhone.trim() } }
          : {})
      })
      setResult(res.data.data)
    } catch (err) {
      setError(extractErrorMessage(err, t('counter.error.save', 'Failed to complete the sale')))
    } finally {
      setSubmitting(false)
    }
  }

  const methodLabels: Record<Method, string> = {
    CASH: t('counter.method.cash', 'Cash'),
    MOBILE_MONEY: t('counter.method.mobile', 'Mobile money'),
    CARD: t('counter.method.card', 'Card')
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>{t('counter.title', 'Counter')}</h1>
        <p className='mt-1 text-sm text-gray-500'>
          {t('counter.subtitle', 'Tap the food sold, take the money, and the system works out the change or the debt.')}
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className={`grid gap-6 lg:grid-cols-[1fr_380px] ${cart.length > 0 ? 'pb-24 lg:pb-0' : ''}`}>
        {/* Menu */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5'>
            <Search size={18} className='text-gray-400' />
            <input
              type='search'
              placeholder={t('counter.searchMenu', 'Search food or drink...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full border-0 bg-transparent text-sm outline-none'
            />
          </div>

          <div className='flex flex-wrap gap-2'>
            <CategoryChip active={!category} onClick={() => setCategory('')}>
              {t('counter.all', 'All')}
            </CategoryChip>
            {categories.map(c => (
              <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </CategoryChip>
            ))}
          </div>

          {loadingMenu ? (
            <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500'>
              {t('counter.loadingMenu', 'Loading menu...')}
            </div>
          ) : visibleMenu.length === 0 ? (
            <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500'>
              {menu.length === 0
                ? t('counter.emptyMenu', 'No menu items yet. Add dishes in Food Menu first.')
                : t('counter.noMatch', 'Nothing matches your search.')}
            </div>
          ) : (
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
              {visibleMenu.map(item => {
                const inCart = cart.find(l => l.item.id === item.id)?.quantity ?? 0
                const photo = menuImageUrl(item)
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => addItem(item)}
                    className={`relative flex flex-col justify-start overflow-hidden rounded-2xl border text-left transition-colors ${anyPhoto ? '' : 'p-4'} ${
                      inCart
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    {inCart > 0 && (
                      <span className='absolute right-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white shadow'>
                        {inCart}
                      </span>
                    )}
                    {photo ? (
                      <img
                        src={photo}
                        alt=''
                        loading='lazy'
                        className='aspect-[4/3] w-full bg-gray-100 object-cover'
                      />
                    ) : anyPhoto ? (
                      <div className='flex aspect-[4/3] w-full items-center justify-center bg-emerald-50 text-emerald-200'>
                        <UtensilsCrossed size={32} />
                      </div>
                    ) : null}
                    <div className={anyPhoto ? 'p-3' : ''}>
                      <p className='pr-6 font-semibold text-gray-900'>{item.name}</p>
                      <p className='mt-0.5 text-xs text-gray-500'>{item.category}</p>
                      <p className='mt-2 text-sm font-bold text-emerald-700'>{money(item.price)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Phones: the bill is below the menu, so keep its total in view */}
        {cart.length > 0 && (
          <div className='fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur lg:hidden'>
            <button
              type='button'
              onClick={() => document.getElementById('counter-bill')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className='flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-white'
            >
              <span className='flex items-center gap-2 text-sm font-semibold'>
                <ShoppingBag size={18} />
                {t('counter.bill', 'Bill')} · {cart.reduce((n, l) => n + l.quantity, 0)}
              </span>
              <span className='text-lg font-bold'>{money(total)}</span>
            </button>
          </div>
        )}

        {/* Bill */}
        <div id='counter-bill' className='h-fit scroll-mt-20 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-20'>
          <div className='flex items-center gap-2'>
            <ShoppingBag size={18} className='text-emerald-600' />
            <h2 className='font-semibold text-gray-900'>{t('counter.bill', 'Bill')}</h2>
          </div>

          {cart.length === 0 ? (
            <p className='py-6 text-center text-sm text-gray-400'>
              {t('counter.emptyBill', 'Tap a dish to add it to the bill.')}
            </p>
          ) : (
            <ul className='divide-y divide-gray-100'>
              {cart.map(l => (
                <li key={l.item.id} className='flex items-center gap-2 py-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-gray-900'>{l.item.name}</p>
                    <p className='text-xs text-gray-500'>
                      {money(l.item.price)} × {l.quantity} = {money(toNum(l.item.price) * l.quantity)}
                    </p>
                  </div>
                  <button type='button' onClick={() => changeQty(l.item.id, -1)} className='rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50' aria-label='Less'>
                    {l.quantity === 1 ? <Trash2 size={14} className='text-red-500' /> : <Minus size={14} />}
                  </button>
                  <span className='w-6 text-center text-sm font-semibold'>{l.quantity}</span>
                  <button type='button' onClick={() => changeQty(l.item.id, 1)} className='rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50' aria-label='More'>
                    <Plus size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className='flex items-baseline justify-between border-t border-gray-200 pt-3'>
            <span className='text-sm text-gray-500'>{t('counter.total', 'Total')}</span>
            <span className='text-2xl font-bold text-gray-900'>{money(total)}</span>
          </div>

          {cart.length > 0 && (
            <>
              <div className='grid grid-cols-3 gap-2'>
                {(Object.keys(methodLabels) as Method[]).map(m => (
                  <button
                    key={m}
                    type='button'
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                      method === m
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {methodLabels[m]}
                  </button>
                ))}
              </div>

              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>
                  {t('counter.received', 'Amount received')}
                </label>
                <input
                  type='number'
                  min='0'
                  inputMode='numeric'
                  placeholder={String(total)}
                  value={received}
                  onChange={e => setReceived(e.target.value)}
                  className='input text-lg font-semibold'
                />
                <div className='mt-2 flex flex-wrap gap-2'>
                  <QuickButton onClick={() => setReceived(String(total))}>
                    {t('counter.exact', 'Exact')}
                  </QuickButton>
                  {method === 'CASH' &&
                    quickNotes.map(n => (
                      <QuickButton key={n} onClick={() => setReceived(String(n))}>
                        {n.toLocaleString()}
                      </QuickButton>
                    ))}
                  <QuickButton onClick={() => setReceived('0')} tone='amber'>
                    {t('counter.allCredit', 'All on credit')}
                  </QuickButton>
                </div>
              </div>

              {change > 0 && (
                <div className='rounded-xl bg-emerald-50 p-4 text-center'>
                  <p className='text-xs font-medium uppercase tracking-wide text-emerald-700'>
                    {t('counter.giveChange', 'Give change')}
                  </p>
                  <p className='text-3xl font-bold text-emerald-700'>{money(change)}</p>
                </div>
              )}

              {overpaidNonCash && (
                <p className='rounded-xl bg-red-50 p-3 text-sm text-red-700'>
                  {t('counter.overpayHint', 'Only cash can be more than the bill — there is no change for mobile money or card.')}
                </p>
              )}

              {needsCustomer && (
                <div className='space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4'>
                  <div>
                    <p className='text-xs font-medium uppercase tracking-wide text-amber-700'>
                      {t('counter.debt', 'Unpaid — will be recorded as debt')}
                    </p>
                    <p className='text-2xl font-bold text-amber-700'>{money(balance)}</p>
                  </div>
                  <div className='flex items-center gap-2 text-sm text-amber-800'>
                    <UserRound size={16} />
                    {t('counter.whoOwes', 'Who owes this?')}
                  </div>
                  <input
                    placeholder={t('counter.customerName', 'Customer name')}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className='input bg-white'
                  />
                  <input
                    placeholder={t('counter.customerPhone', 'Phone, e.g. 0712 345 678')}
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    inputMode='tel'
                    className='input bg-white'
                  />
                  <p className='text-xs text-amber-700'>
                    {t('counter.samePhone', 'If this phone is already saved, the debt is added to the same customer.')}
                  </p>
                </div>
              )}

              <button
                type='button'
                onClick={completeSale}
                disabled={submitting || overpaidNonCash}
                className='w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {submitting ? t('counter.saving', 'Saving...') : t('counter.complete', 'Complete sale')}
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <Modal title={t('counter.done', 'Sale recorded')} onClose={resetSale}>
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-emerald-700'>
              <CheckCircle2 size={22} />
              <span className='font-semibold'>{t('counter.saved', 'Saved')}</span>
            </div>
            <ul className='space-y-1 text-sm'>
              {result.order.items.map((i, idx) => (
                <li key={idx} className='flex justify-between'>
                  <span>{i.menuItem.name} × {i.quantity}</span>
                  <span>{money(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className='space-y-1 border-t border-gray-200 pt-3 text-sm'>
              <Row label={t('counter.total', 'Total')} value={money(result.total)} bold />
              <Row label={t('counter.paid', 'Paid')} value={money(result.paid)} />
              {toNum(result.change) > 0 && (
                <Row label={t('counter.change', 'Change')} value={money(result.change)} tone='emerald' bold />
              )}
              {toNum(result.balance) > 0 && (
                <Row
                  label={`${t('counter.debtFor', 'Debt')} — ${result.order.customer?.fullName ?? ''}`}
                  value={money(result.balance)}
                  tone='amber'
                  bold
                />
              )}
            </div>
            <button
              type='button'
              onClick={resetSale}
              className='w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700'
            >
              {t('counter.newSale', 'New sale')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CategoryChip ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-emerald-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function QuickButton ({ onClick, children, tone }: { onClick: () => void; children: React.ReactNode; tone?: 'amber' }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
        tone === 'amber'
          ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function Row ({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-gray-900'
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''} ${color}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
