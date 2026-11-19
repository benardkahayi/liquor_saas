import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { api } from '../api/client'
import { money, toNum } from '../lib/money'
import { ErrorBanner, extractErrorMessage } from '../components/ErrorBanner'
import { useLanguage } from '../context/LanguageContext'

interface MethodRow {
  method: 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'OTHER'
  forSales: string
  forDebts: string
  total: string
  changeGiven: string
}

interface Daybook {
  date: string
  orderCount: number
  totalSales: string
  moneyReceived: string
  byMethod: MethodRow[]
  debtsGiven: string
  debtsCollected: string
  newDebts: { orderId: string; fullName: string | null; phone: string | null; amount: string; createdAt: string }[]
  foods: { menuItemId: string; name: string; quantity: number; amount: string }[]
}

// The browser's own calendar date (the cashier's device is in Tanzania).
function todayLocal () {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
}

function shiftDate (date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function RestaurantDaybookPage () {
  const { t } = useLanguage()
  const [date, setDate] = useState(todayLocal())
  const [book, setBook] = useState<Daybook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .get<{ data: Daybook }>('/restaurant/daybook', { params: { date } })
      .then(res => setBook(res.data.data))
      .catch(err => setError(extractErrorMessage(err, t('daybook.error', 'Failed to load the daily book'))))
      .finally(() => setLoading(false))
  }, [date, t])

  const methodLabel: Record<MethodRow['method'], string> = {
    CASH: t('counter.method.cash', 'Cash'),
    MOBILE_MONEY: t('counter.method.mobile', 'Mobile money'),
    CARD: t('counter.method.card', 'Card'),
    OTHER: t('daybook.other', 'Other')
  }

  const isToday = date === todayLocal()
  const usedMethods = book?.byMethod.filter(m => toNum(m.total) > 0 || m.method === 'CASH') ?? []
  const prettyDate = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>{t('daybook.title', 'Daily Book')}</h1>
          <p className='mt-1 text-sm text-gray-500'>{prettyDate}</p>
        </div>
        <div className='flex items-center gap-2 print:hidden'>
          <button type='button' onClick={() => setDate(shiftDate(date, -1))} className='rounded-xl border border-gray-200 bg-white p-2.5 hover:bg-gray-50' aria-label='Previous day'>
            <ChevronLeft size={18} />
          </button>
          <input
            type='date'
            value={date}
            max={todayLocal()}
            onChange={e => e.target.value && setDate(e.target.value)}
            className='rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none'
          />
          <button
            type='button'
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={isToday}
            className='rounded-xl border border-gray-200 bg-white p-2.5 hover:bg-gray-50 disabled:opacity-40'
            aria-label='Next day'
          >
            <ChevronRight size={18} />
          </button>
          <button type='button' onClick={() => window.print()} className='flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium hover:bg-gray-50'>
            <Printer size={16} /> {t('daybook.print', 'Print')}
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading && !book ? (
        <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500'>
          {t('debts.loading', 'Loading...')}
        </div>
      ) : book && (
        <>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <Stat label={t('daybook.sales', 'Food sold')} value={money(book.totalSales)} hint={`${book.orderCount} ${t('daybook.orders', 'orders')}`} />
            <Stat label={t('daybook.received', 'Money received')} value={money(book.moneyReceived)} tone='emerald' />
            <Stat label={t('daybook.debtsGiven', 'New debts')} value={money(book.debtsGiven)} hint={`${book.newDebts.length} ${t('daybook.customers', 'customers')}`} tone='amber' />
            <Stat label={t('daybook.debtsCollected', 'Debts collected')} value={money(book.debtsCollected)} tone='blue' />
          </div>

          <div className='grid gap-6 xl:grid-cols-2'>
            <Card title={t('daybook.byMethod', 'Money by method')}>
              <table className='w-full text-sm'>
                <thead className='text-xs uppercase text-gray-500'>
                  <tr>
                    <th className='py-2 text-left'>{t('daybook.method', 'Method')}</th>
                    <th className='py-2 text-right'>{t('daybook.forFood', "Today's food")}</th>
                    <th className='py-2 text-right'>{t('daybook.forDebts', 'Old debts')}</th>
                    <th className='py-2 text-right'>{t('daybook.total', 'Total')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {usedMethods.map(m => (
                    <tr key={m.method}>
                      <td className='py-2.5 font-medium text-gray-900'>
                        {methodLabel[m.method]}
                        {toNum(m.changeGiven) > 0 && (
                          <span className='block text-xs font-normal text-gray-400'>
                            {t('daybook.changeGiven', 'Change given')} {money(m.changeGiven)}
                          </span>
                        )}
                      </td>
                      <td className='py-2.5 text-right'>{money(m.forSales)}</td>
                      <td className='py-2.5 text-right'>{money(m.forDebts)}</td>
                      <td className='py-2.5 text-right font-semibold'>{money(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className='mt-3 text-xs text-gray-400'>
                {t('daybook.cashNote', 'Cash amounts are what stayed in the drawer — change already given back is not included.')}
              </p>
            </Card>

            <Card title={t('daybook.newDebtsTitle', 'New debts today')}>
              {book.newDebts.length === 0 ? (
                <p className='py-4 text-center text-sm text-gray-400'>{t('daybook.noDebts', 'No new debts — everyone paid.')}</p>
              ) : (
                <ul className='divide-y divide-gray-100 text-sm'>
                  {book.newDebts.map(d => (
                    <li key={d.orderId} className='flex justify-between py-2.5'>
                      <span>
                        <span className='font-medium text-gray-900'>{d.fullName ?? '—'}</span>
                        {d.phone && <span className='ml-2 text-xs text-gray-400'>{d.phone}</span>}
                      </span>
                      <span className='font-semibold text-amber-700'>{money(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title={t('daybook.foods', 'Foods sold')}>
            {book.foods.length === 0 ? (
              <p className='py-4 text-center text-sm text-gray-400'>{t('daybook.noSales', 'Nothing sold on this day.')}</p>
            ) : (
              <table className='w-full text-sm'>
                <thead className='text-xs uppercase text-gray-500'>
                  <tr>
                    <th className='py-2 text-left'>{t('daybook.item', 'Item')}</th>
                    <th className='py-2 text-right'>{t('daybook.qty', 'Quantity')}</th>
                    <th className='py-2 text-right'>{t('daybook.amount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {book.foods.map(f => (
                    <tr key={f.menuItemId}>
                      <td className='py-2.5 font-medium text-gray-900'>{f.name}</td>
                      <td className='py-2.5 text-right'>{f.quantity}</td>
                      <td className='py-2.5 text-right font-semibold'>{money(f.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className='border-t border-gray-200 font-bold'>
                    <td className='py-2.5'>{t('daybook.total', 'Total')}</td>
                    <td className='py-2.5 text-right'>{book.foods.reduce((s, f) => s + f.quantity, 0)}</td>
                    <td className='py-2.5 text-right'>{money(book.totalSales)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function Stat ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'emerald' | 'amber' | 'blue' }) {
  const styles = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700'
  }
  return (
    <div className={`rounded-2xl border p-5 ${tone ? styles[tone] : 'border-gray-200 bg-white text-gray-900'}`}>
      <p className='text-xs font-medium uppercase tracking-wide opacity-80'>{label}</p>
      <p className='mt-1 text-2xl font-bold'>{value}</p>
      {hint && <p className='mt-1 text-xs opacity-70'>{hint}</p>}
    </div>
  )
}

function Card ({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-2xl border border-gray-200 bg-white p-5'>
      <h2 className='mb-3 font-semibold text-gray-900'>{title}</h2>
      {children}
    </div>
  )
}
