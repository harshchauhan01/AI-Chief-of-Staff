import { useEffect, useMemo, useState } from 'react'
import CategoryBreakdownChart from '../components/CategoryBreakdownChart'
import SplitExpenseFields from '../components/SplitExpenseFields'
import { CATEGORIES, CATEGORY_MAP } from '../constants/moneyCategories'
import { SHARE_DRAFT_STORAGE_KEY } from '../constants/shareTarget'
import { parseSharedExpenseText } from '../utils/parseSharedExpense'
import { asCurrency, currentMonthIso, formatMonthLabel, todayIso, toNumber } from '../utils/money'
import { loadMoneyState, saveMoneyState } from '../utils/moneyStore'
import { computeShareAmount, computeSpendAmount } from '../utils/splitShare'
import {
  disableQuickAddNotification,
  enableQuickAddNotification,
  getQuickAddNotificationStatus,
  startQuickAddNotificationWatch,
} from '../services/quickAddNotification'

const csvField = (value) => {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function MoneyTrackerPage() {
  const initial = useMemo(() => loadMoneyState(), [])

  const [budgets, setBudgets] = useState(initial.budgets)
  const [expenses, setExpenses] = useState(initial.expenses)
  const [nextId, setNextId] = useState(initial.nextId)

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthIso())
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetMessage, setBudgetMessage] = useState('')

  const [form, setForm] = useState(() => ({
    date: todayIso(),
    category: CATEGORIES[0].value,
    place: '',
    note: '',
    amount: '',
    isSplit: false,
    splitWith: [],
  }))
  const [formError, setFormError] = useState('')
  const [shareBanner, setShareBanner] = useState('')
  const [notifStatus, setNotifStatus] = useState(() => getQuickAddNotificationStatus())
  const [notifMessage, setNotifMessage] = useState('')

  useEffect(() => {
    saveMoneyState({ budgets, expenses, nextId })
  }, [budgets, expenses, nextId])

  useEffect(() => {
    const stopWatching = startQuickAddNotificationWatch()
    return stopWatching
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(SHARE_DRAFT_STORAGE_KEY)
    if (!raw) {
      return
    }
    localStorage.removeItem(SHARE_DRAFT_STORAGE_KEY)

    try {
      const draft = JSON.parse(raw)
      const combinedText = [draft.text, draft.title].filter(Boolean).join(' ')
      if (!combinedText) {
        return
      }

      const { amount, place } = parseSharedExpenseText(combinedText)
      setForm((current) => ({
        ...current,
        amount: amount || current.amount,
        place: place || current.place,
      }))
      setShareBanner(combinedText)
    } catch {
      // Ignore a malformed draft — the Add Expense form just stays blank.
    }
  }, [])

  useEffect(() => {
    setBudgetInput(budgets[selectedMonth] !== undefined ? String(budgets[selectedMonth]) : '')
  }, [selectedMonth, budgets])

  const monthOptions = useMemo(() => {
    const months = new Set([currentMonthIso(), ...Object.keys(budgets), ...expenses.map((expense) => expense.month)])
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [budgets, expenses])

  const monthExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.month === selectedMonth)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [expenses, selectedMonth],
  )

  const totalMoney = toNumber(budgets[selectedMonth])
  const totalSpent = useMemo(
    () => monthExpenses.reduce((sum, expense) => sum + computeSpendAmount(expense), 0),
    [monthExpenses],
  )
  const remaining = totalMoney - totalSpent

  const categoryBreakdown = useMemo(() => {
    const totals = new Map()
    for (const expense of monthExpenses) {
      const amount = computeSpendAmount(expense)
      if (amount <= 0) {
        continue
      }
      totals.set(expense.category, (totals.get(expense.category) || 0) + amount)
    }

    return Array.from(totals.entries())
      .map(([value, amount]) => {
        const meta = CATEGORY_MAP[value] || CATEGORY_MAP.other
        return { category: value, label: meta.label, color: meta.color, amount }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [monthExpenses])

  const isCurrentMonth = selectedMonth === currentMonthIso()
  const daysInSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }, [selectedMonth])

  // Projection is noisy on day 1-2 (one expense can swing it wildly), so hold
  // off showing a pace read until there's at least a few days of signal.
  const spendPace = useMemo(() => {
    const dayOfMonth = new Date().getDate()
    if (!isCurrentMonth || totalMoney <= 0 || dayOfMonth < 3) {
      return null
    }

    const projected = (totalSpent / dayOfMonth) * daysInSelectedMonth
    const percentOfBudget = (projected / totalMoney) * 100
    return { projected, percentOfBudget, dayOfMonth }
  }, [isCurrentMonth, totalMoney, totalSpent, daysInSelectedMonth])

  const saveBudget = (event) => {
    event.preventDefault()
    const amount = toNumber(budgetInput)
    setBudgets((current) => ({ ...current, [selectedMonth]: amount }))
    setBudgetMessage('Saved.')
    window.setTimeout(() => setBudgetMessage(''), 1500)
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const addExpense = (event) => {
    event.preventDefault()

    if (!form.date) {
      setFormError('Pick a date.')
      return
    }

    const amount = toNumber(form.amount)
    if (amount <= 0) {
      setFormError('Enter an amount greater than 0.')
      return
    }

    const expense = {
      id: nextId,
      date: form.date,
      month: form.date.slice(0, 7),
      category: form.category,
      place: form.place.trim(),
      note: form.note.trim(),
      amount,
      isSplit: form.isSplit,
      splitWith: form.isSplit ? form.splitWith : [],
      shareAmount: computeShareAmount(amount, form.isSplit, form.splitWith),
      settled: false,
    }

    setExpenses((current) => [expense, ...current])
    setNextId((current) => current + 1)
    setFormError('')
    setForm((current) => ({ ...current, place: '', note: '', amount: '', isSplit: false, splitWith: [] }))
    setSelectedMonth(expense.month)
  }

  const removeExpense = (id) => {
    setExpenses((current) => current.filter((expense) => expense.id !== id))
  }

  const toggleSettled = (id) => {
    setExpenses((current) =>
      current.map((expense) => (expense.id === id ? { ...expense, settled: !expense.settled } : expense)),
    )
  }

  const downloadCsv = () => {
    const header = ['Date', 'Category', 'Place', 'Note', 'Amount', 'Split With', 'Your Share', 'Settled']
    const rows = monthExpenses.map((expense) => [
      expense.date,
      CATEGORY_MAP[expense.category]?.label || expense.category,
      expense.place,
      expense.note,
      expense.amount,
      expense.isSplit ? expense.splitWith.join('; ') : '',
      expense.shareAmount ?? expense.amount,
      expense.isSplit ? (expense.settled ? 'Yes' : 'No') : '',
    ])

    const csv = [header, ...rows].map((row) => row.map(csvField).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orion-expenses-${selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const toggleQuickAddNotification = async () => {
    if (notifStatus.enabled) {
      await disableQuickAddNotification()
      setNotifStatus(getQuickAddNotificationStatus())
      setNotifMessage('Quick-add notification turned off.')
      return
    }

    const result = await enableQuickAddNotification()
    setNotifStatus(getQuickAddNotificationStatus())

    if (result.permission === 'denied') {
      setNotifMessage('Notifications are blocked — enable them in your browser/app settings.')
    } else if (result.permission === 'unsupported') {
      setNotifMessage('This browser does not support notifications.')
    } else if (result.enabled) {
      setNotifMessage('Enabled — check your notification shade for "Quick Add".')
    } else {
      setNotifMessage('Could not enable the notification. Try again.')
    }
  }

  return (
    <section className="panel money-shell">
      <div className="money-header">
        <div>
          <h2>Money Tracker</h2>
          <p>Add what you have, log every spend, and see the breakdown for any month.</p>
        </div>
        <div className="money-header-actions no-print">
          <label htmlFor="money_month_select">Month</label>
          <select id="money_month_select" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="money-quickadd-row no-print">
        <div>
          <strong>Quick-add notification</strong>
          <p>Keep a "Quick Add" notification in your shade — tap it anytime to log an expense in a small window.</p>
        </div>
        <button type="button" className="secondary-btn" onClick={toggleQuickAddNotification}>
          {notifStatus.enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {notifMessage && <p className="money-inline-message no-print">{notifMessage}</p>}

      <div className="money-stat-row">
        <article className="money-stat-tile">
          <span>Total money</span>
          <strong>{asCurrency(totalMoney)}</strong>
        </article>
        <article className="money-stat-tile">
          <span>Spent this month</span>
          <strong>{asCurrency(totalSpent)}</strong>
        </article>
        <article className={remaining < 0 ? 'money-stat-tile warning' : 'money-stat-tile'}>
          <span>Remaining</span>
          <strong>{asCurrency(remaining)}</strong>
        </article>
      </div>

      {spendPace && (
        <p
          className={
            spendPace.percentOfBudget > 110
              ? 'money-pace-note over'
              : spendPace.percentOfBudget > 90
                ? 'money-pace-note warn'
                : 'money-pace-note ok'
          }
        >
          At this pace (day {spendPace.dayOfMonth} of {daysInSelectedMonth}), you're on track to spend{' '}
          {asCurrency(spendPace.projected)} this month
          {spendPace.percentOfBudget > 100
            ? ` — ${asCurrency(spendPace.projected - totalMoney)} over your ${asCurrency(totalMoney)} budget.`
            : ` — within your ${asCurrency(totalMoney)} budget.`}
        </p>
      )}

      <article className="money-budget-card no-print">
        <form className="money-budget-form" onSubmit={saveBudget}>
          <label htmlFor="money_budget_input">Money you have for {formatMonthLabel(selectedMonth)}</label>
          <div className="money-budget-row">
            <input
              id="money_budget_input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
            />
            <button type="submit">Save</button>
          </div>
          {budgetMessage && <p className="money-inline-message">{budgetMessage}</p>}
        </form>
      </article>

      <article className="money-add-card no-print">
        <h3>Add an expense</h3>
        {shareBanner && (
          <p className="money-share-banner no-print">
            Filled in from what you shared: "{shareBanner}". Double-check the amount and place, then tap Add.
            <button type="button" className="money-share-dismiss" onClick={() => setShareBanner('')}>
              Dismiss
            </button>
          </p>
        )}
        <form className="money-add-form" onSubmit={addExpense}>
          <input
            type="date"
            value={form.date}
            onChange={(event) => updateForm('date', event.target.value)}
            required
          />
          <select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Place (e.g. groceries)"
            value={form.place}
            onChange={(event) => updateForm('place', event.target.value)}
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={form.note}
            onChange={(event) => updateForm('note', event.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) => updateForm('amount', event.target.value)}
          />
          <SplitExpenseFields
            amount={form.amount}
            isSplit={form.isSplit}
            onToggleSplit={(value) => updateForm('isSplit', value)}
            splitWith={form.splitWith}
            onChangeSplitWith={(value) => updateForm('splitWith', value)}
          />
          <button type="submit">Add</button>
        </form>
        {formError && <p className="money-form-error">{formError}</p>}
      </article>

      <article className="money-chart-card">
        <div className="money-chart-card-head">
          <h3>Spending by category</h3>
          <button
            type="button"
            className="secondary-btn no-print"
            onClick={downloadCsv}
            disabled={monthExpenses.length === 0}
          >
            Download CSV
          </button>
          <button type="button" className="secondary-btn no-print" onClick={() => window.print()}>
            Download PDF
          </button>
        </div>
        <CategoryBreakdownChart items={categoryBreakdown} total={totalSpent} />
      </article>

      <article className="money-table-card">
        <h3>Expenses — {formatMonthLabel(selectedMonth)}</h3>
        <div className="bill-table-wrap">
          <table className="bill-table" aria-label="Expense table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Place</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Your Share</th>
                <th>Settled</th>
                <th className="no-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {monthExpenses.length === 0 && (
                <tr>
                  <td colSpan={8}>No expenses logged for this month yet.</td>
                </tr>
              )}
              {monthExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{CATEGORY_MAP[expense.category]?.label || expense.category}</td>
                  <td>{expense.place || '-'}</td>
                  <td>{expense.note || '-'}</td>
                  <td>{asCurrency(expense.amount)}</td>
                  <td>
                    {asCurrency(expense.shareAmount ?? expense.amount)}
                    {expense.isSplit && expense.splitWith?.length > 0 && (
                      <span className="money-split-note">Split with {expense.splitWith.join(', ')}</span>
                    )}
                    {expense.isSplit && !expense.settled && (
                      <span className="money-split-note pending">
                        Counted as full {asCurrency(expense.amount)} until settled
                      </span>
                    )}
                  </td>
                  <td>
                    {expense.isSplit ? (
                      <>
                        <span className={expense.settled ? 'money-settled-badge settled' : 'money-settled-badge pending'}>
                          {expense.settled ? 'Settled' : 'Pending'}
                        </span>
                        <button
                          type="button"
                          className="secondary-btn no-print money-settle-toggle"
                          onClick={() => toggleSettled(expense.id)}
                        >
                          {expense.settled ? 'Mark unsettled' : 'Mark settled'}
                        </button>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="no-print">
                    <button
                      type="button"
                      className="secondary-btn danger-btn"
                      onClick={() => removeExpense(expense.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

export default MoneyTrackerPage
