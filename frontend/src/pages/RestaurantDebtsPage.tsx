import { useCallback, useEffect, useState } from 'react'
import { Search, Wallet, Phone, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import { money, toNum } from '../lib/money'
import { ErrorBanner, extractErrorMessage } from '../components/ErrorBanner'
import { Modal } from '../components/Modal'
import { useLanguage } from '../context/LanguageContext'

interface Debtor {
  customerId: string
  fullName: string
  phone: string | null
  orderCount: number
  balance: string
  oldestDebtAt: string
  lastDebtAt: string
}

interface DebtDetail {
  customer: { id: string; fullName: string; phone: string | null }
  balance: string
  orders: {
    id: string
    createdAt: string
    total: string
    paid: string
    balance: string
    items: { quantity: number; menuItem: { name: string } }[]
  }[]
  recentPayments: { id: string; amount: string; method: string; createdAt: string }[]
}

type Method = 'CASH' | 'MOBILE_MONEY' | 'CARD'

function daysAgo (iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days
}

function formatDate (iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function RestaurantDebtsPage () {
  const { t } = useLanguage()
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState('0')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ data: { debtors: Debtor[]; totalOutstanding: string } }>('/restaurant/debts', {
        params: { search: search || undefined }
      })
      setDebtors(res.data.data.debtors)
      setTotalOutstanding(res.data.data.totalOutstanding)
    } catch (err) {
      setError(extractErrorMessage(err, t('debts.error.load', 'Failed to load debts')))
    } finally {
      setLoading(false)
    }
  }, [search, t])

  useEffect(() => {
    const id = setTimeout(load, 250) // small debounce while typing
    return () => clearTimeout(id)
  }, [load])

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>{t('debts.title', 'Debts')}</h1>
        <p className='mt-1 text-sm text-gray-500'>
          {t('debts.subtitle', 'Customers who owe money. Payments clear their oldest debts first.')}
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5'>
          <p className='text-xs font-medium uppercase tracking-wide text-amber-700'>
            {t('debts.totalOwed', 'Total owed to you')}
          </p>
          <p className='mt-1 text-3xl font-bold text-amber-700'>{money(totalOutstanding)}</p>
        </div>
        <div className='rounded-2xl border border-gray-200 bg-white p-5'>
          <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
            {t('debts.customers', 'Customers with debt')}
          </p>
          <p className='mt-1 text-3xl font-bold text-gray-900'>{debtors.length}</p>
        </div>
      </div>

      <div className='flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5'>
        <Search size={18} className='text-gray-400' />
        <input
          type='search'
          placeholder={t('debts.search', 'Search by name or phone...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='w-full border-0 bg-transparent text-sm outline-none'
        />
      </div>

      <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white'>
        {loading ? (
          <div className='p-10 text-center text-sm text-gray-500'>{t('debts.loading', 'Loading...')}</div>
        ) : debtors.length === 0 ? (
          <div className='flex flex-col items-center gap-3 p-12 text-center'>
            <div className='rounded-full bg-emerald-50 p-4 text-emerald-600'>
              <CheckCircle2 size={28} />
            </div>
            <p className='font-semibold text-gray-900'>
              {search ? t('debts.noMatch', 'No customer matches your search') : t('debts.none', 'Nobody owes you money')}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[640px] text-left text-sm'>
              <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-5 py-4'>{t('debts.col.customer', 'Customer')}</th>
                  <th className='px-5 py-4'>{t('debts.col.meals', 'Unpaid meals')}</th>
                  <th className='px-5 py-4'>{t('debts.col.since', 'Owing since')}</th>
                  <th className='px-5 py-4 text-right'>{t('debts.col.amount', 'Amount owed')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {debtors.map(d => {
                  const age = daysAgo(d.oldestDebtAt)
                  return (
                    <tr
                      key={d.customerId}
                      onClick={() => setSelected(d.customerId)}
                      className='cursor-pointer hover:bg-gray-50'
                    >
                      <td className='px-5 py-4'>
                        <p className='font-semibold text-gray-900'>{d.fullName}</p>
                        {d.phone && <p className='text-xs text-gray-500'>{d.phone}</p>}
                      </td>
                      <td className='px-5 py-4 text-gray-700'>{d.orderCount}</td>
                      <td className='px-5 py-4'>
                        <span className={age >= 7 ? 'font-medium text-red-600' : 'text-gray-700'}>
                          {formatDate(d.oldestDebtAt)}
                        </span>
                        <span className='ml-2 text-xs text-gray-400'>
                          {age === 0 ? t('debts.today', 'today') : `${age} ${t('debts.daysAgo', 'days ago')}`}
                        </span>
                      </td>
                      <td className='px-5 py-4 text-right font-bold text-amber-700'>{money(d.balance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <DebtModal
          customerId={selected}
          onClose={() => setSelected(null)}
          onPaid={load}
        />
      )}
    </div>
  )
}

function DebtModal ({ customerId, onClose, onPaid }: { customerId: string; onClose: () => void; onPaid: () => void }) {
  const { t } = useLanguage()
  const [detail, setDetail] = useState<DebtDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<Method>('CASH')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<{ paid: string; change: string; remainingBalance: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: DebtDetail }>(`/restaurant/debts/${customerId}`)
      setDetail(res.data.data)
    } catch (err) {
      setError(extractErrorMessage(err, t('debts.error.detail', 'Failed to load this customer')))
    }
  }, [customerId, t])

  useEffect(() => {
    load()
  }, [load])

  const owed = toNum(detail?.balance)
  const amountNum = Number(amount || 0)
  const change = method === 'CASH' ? Math.max(amountNum - owed, 0) : 0

  async function receive () {
    setError(null)
    if (amountNum <= 0) {
      setError(t('debts.error.amount', 'Enter the amount received'))
      return
    }
    setSaving(true)
    try {
      const res = await api.post<{ data: { paid: string; change: string; remainingBalance: string } }>(
        `/restaurant/debts/${customerId}/payments`,
        { method, amountReceived: amountNum }
      )
      setReceipt(res.data.data)
      setAmount('')
      onPaid()
      load()
    } catch (err) {
      setError(extractErrorMessage(err, t('debts.error.pay', 'Failed to record payment')))
    } finally {
      setSaving(false)
    }
  }

  const methodLabels: Record<Method, string> = {
    CASH: t('counter.method.cash', 'Cash'),
    MOBILE_MONEY: t('counter.method.mobile', 'Mobile money'),
    CARD: t('counter.method.card', 'Card')
  }

  return (
    <Modal title={detail?.customer.fullName ?? t('debts.loading', 'Loading...')} onClose={onClose}>
      <div className='space-y-5'>
        <ErrorBanner message={error} />

        {detail && (
          <>
            <div className='flex items-center justify-between'>
              {detail.customer.phone ? (
                <a href={`tel:${detail.customer.phone}`} className='flex items-center gap-1.5 text-sm text-blue-600'>
                  <Phone size={14} /> {detail.customer.phone}
                </a>
              ) : <span />}
              <div className='text-right'>
                <p className='text-xs text-gray-500'>{t('debts.owes', 'Owes')}</p>
                <p className='text-2xl font-bold text-amber-700'>{money(detail.balance)}</p>
              </div>
            </div>

            {receipt && (
              <div className='rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800'>
                {t('debts.received', 'Received')} {money(receipt.paid)}
                {toNum(receipt.change) > 0 && <> · <b>{t('counter.giveChange', 'Give change')} {money(receipt.change)}</b></>}
                {' · '}{t('debts.remaining', 'Remaining')} {money(receipt.remainingBalance)}
              </div>
            )}

            {owed > 0 && (
              <div className='space-y-3 rounded-xl border border-gray-200 p-4'>
                <p className='text-sm font-semibold text-gray-900'>{t('debts.receivePayment', 'Receive payment')}</p>
                <div className='grid grid-cols-3 gap-2'>
                  {(Object.keys(methodLabels) as Method[]).map(m => (
                    <button
                      key={m}
                      type='button'
                      onClick={() => setMethod(m)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                        method === m ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {methodLabels[m]}
                    </button>
                  ))}
                </div>
                <div className='flex gap-2'>
                  <input
                    type='number'
                    min='0'
                    inputMode='numeric'
                    placeholder={t('counter.received', 'Amount received')}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className='input'
                  />
                  <button
                    type='button'
                    onClick={() => setAmount(String(owed))}
                    className='shrink-0 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                  >
                    {t('debts.payAll', 'Pay all')}
                  </button>
                </div>
                {change > 0 && (
                  <p className='text-sm font-semibold text-emerald-700'>
                    {t('counter.giveChange', 'Give change')}: {money(change)}
                  </p>
                )}
                <button
                  type='button'
                  onClick={receive}
                  disabled={saving}
                  className='w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
                >
                  {saving ? t('counter.saving', 'Saving...') : t('debts.record', 'Record payment')}
                </button>
              </div>
            )}

            {detail.orders.length > 0 && (
              <div>
                <p className='mb-2 text-sm font-semibold text-gray-900'>{t('debts.unpaidMeals', 'Unpaid meals')}</p>
                <ul className='divide-y divide-gray-100 rounded-xl border border-gray-200'>
                  {detail.orders.map(o => (
                    <li key={o.id} className='px-4 py-3 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>{formatDate(o.createdAt)}</span>
                        <span className='font-semibold text-amber-700'>{money(o.balance)}</span>
                      </div>
                      <p className='mt-0.5 text-gray-700'>
                        {o.items.map(i => `${i.menuItem.name} × ${i.quantity}`).join(', ')}
                      </p>
                      {toNum(o.paid) > 0 && (
                        <p className='text-xs text-gray-400'>
                          {t('debts.ofTotal', 'Total')} {money(o.total)} · {t('counter.paid', 'Paid')} {money(o.paid)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.recentPayments.length > 0 && (
              <div>
                <p className='mb-2 text-sm font-semibold text-gray-900'>{t('debts.history', 'Recent payments')}</p>
                <ul className='space-y-1 text-sm'>
                  {detail.recentPayments.map(p => (
                    <li key={p.id} className='flex justify-between text-gray-600'>
                      <span>{formatDate(p.createdAt)} · {p.method.replace('_', ' ').toLowerCase()}</span>
                      <span>{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!detail && !error && (
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <Wallet size={16} /> {t('debts.loading', 'Loading...')}
          </div>
        )}
      </div>
    </Modal>
  )
}
