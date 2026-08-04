import { useState } from 'react'
import { CATEGORY_MAP } from '../constants/moneyCategories'
import { formatMonthLabel } from '../utils/money'

// Monthly gate for recurring expenses — nothing gets added to the ledger
// until the user hits "Add all", so a changed bill amount can be fixed here.
function RecurringConfirmPrompt({ due, month, onConfirm, onSkip }) {
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(due.map((recurring) => [recurring.id, String(recurring.amount)])),
  )

  if (due.length === 0) {
    return null
  }

  const setAmount = (id, value) => setAmounts((current) => ({ ...current, [id]: value }))

  return (
    <article className="money-recurring-prompt no-print">
      <p>
        Add your {due.length} recurring expense{due.length > 1 ? 's' : ''} for {formatMonthLabel(month)}?
      </p>
      <ul className="money-recurring-prompt-list">
        {due.map((recurring) => (
          <li key={recurring.id}>
            <span>
              {recurring.place} · {CATEGORY_MAP[recurring.category]?.label || recurring.category}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amounts[recurring.id]}
              onChange={(event) => setAmount(recurring.id, event.target.value)}
            />
          </li>
        ))}
      </ul>
      <div className="money-recurring-prompt-actions">
        <button
          type="button"
          onClick={() =>
            onConfirm(Object.fromEntries(Object.entries(amounts).map(([id, value]) => [Number(id), Number(value)])))
          }
        >
          Add all
        </button>
        <button type="button" className="secondary-btn" onClick={onSkip}>
          Skip this month
        </button>
      </div>
    </article>
  )
}

export default RecurringConfirmPrompt
