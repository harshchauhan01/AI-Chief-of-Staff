import { useState } from 'react'
import { CATEGORIES, CATEGORY_MAP } from '../constants/moneyCategories'
import { asCurrency } from '../utils/money'

const emptyDraft = { place: '', category: CATEGORIES[0].value, amount: '', dayOfMonth: '1' }

// Definitions only — the actual monthly add-or-skip decision happens in
// RecurringConfirmPrompt so a variable bill's amount can be tweaked there.
function RecurringExpensesCard({ recurringExpenses, onAdd, onRemove }) {
  const [draft, setDraft] = useState(emptyDraft)

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const submit = (event) => {
    event.preventDefault()
    const amount = Number(draft.amount)
    if (!draft.place.trim() || !(amount > 0)) {
      return
    }
    onAdd({
      place: draft.place.trim(),
      category: draft.category,
      amount,
      dayOfMonth: Number(draft.dayOfMonth) || 1,
      isSplit: false,
      splitWith: [],
      lastConfirmedMonth: null,
    })
    setDraft(emptyDraft)
  }

  return (
    <article className="money-recurring-card no-print">
      <h3>Recurring expenses</h3>
      <p>Rent, subscriptions, EMIs — added once here, you'll be asked to confirm each new month.</p>

      {recurringExpenses.length > 0 && (
        <ul className="money-recurring-list">
          {recurringExpenses.map((recurring) => (
            <li key={recurring.id}>
              <span>
                {recurring.place} · {CATEGORY_MAP[recurring.category]?.label || recurring.category} ·{' '}
                {asCurrency(recurring.amount)} · day {recurring.dayOfMonth}
              </span>
              <button type="button" className="secondary-btn danger-btn" onClick={() => onRemove(recurring.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="money-recurring-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Place (e.g. Rent)"
          value={draft.place}
          onChange={(event) => updateDraft('place', event.target.value)}
        />
        <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)}>
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
          value={draft.amount}
          onChange={(event) => updateDraft('amount', event.target.value)}
        />
        <input
          type="number"
          min="1"
          max="28"
          placeholder="Day"
          value={draft.dayOfMonth}
          onChange={(event) => updateDraft('dayOfMonth', event.target.value)}
        />
        <button type="submit">Add recurring</button>
      </form>
    </article>
  )
}

export default RecurringExpensesCard
