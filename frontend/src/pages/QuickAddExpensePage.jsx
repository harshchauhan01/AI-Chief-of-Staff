import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../constants/moneyCategories'
import { todayIso, toNumber } from '../utils/money'
import { addExpenseToStore } from '../utils/moneyStore'
import { parseSharedExpenseText } from '../utils/parseSharedExpense'

const initialForm = () => ({
  date: todayIso(),
  category: CATEGORIES[0].value,
  place: '',
  note: '',
  amount: '',
})

function QuickAddExpensePage() {
  const [form, setForm] = useState(initialForm)
  const [pasteText, setPasteText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastSaved, setLastSaved] = useState(null)

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const applyParsedText = (text) => {
    const { amount, place } = parseSharedExpenseText(text)
    if (!amount && !place) {
      setStatusMessage("Couldn't find an amount or place in that text — fill the fields in below.")
      return
    }

    setForm((current) => ({
      ...current,
      amount: amount || current.amount,
      place: place || current.place,
    }))
    setStatusMessage('Filled in from the text below — double-check before adding.')
  }

  const captureFromClipboard = async () => {
    setStatusMessage('')
    setErrorMessage('')

    if (!navigator.clipboard?.readText) {
      setErrorMessage('Clipboard access is not available here — paste the text into the box below instead.')
      return
    }

    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setErrorMessage('Clipboard is empty.')
        return
      }
      setPasteText(text)
      applyParsedText(text)
    } catch {
      setErrorMessage('Could not read the clipboard — paste the text into the box below instead.')
    }
  }

  const parseTypedText = () => {
    setErrorMessage('')
    applyParsedText(pasteText)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!form.date) {
      setErrorMessage('Pick a date.')
      return
    }

    const amount = toNumber(form.amount)
    if (amount <= 0) {
      setErrorMessage('Enter an amount greater than 0.')
      return
    }

    const saved = addExpenseToStore({
      date: form.date,
      month: form.date.slice(0, 7),
      category: form.category,
      place: form.place.trim(),
      note: form.note.trim(),
      amount,
    })

    setLastSaved(saved)
    setStatusMessage('')
    setPasteText('')
    setForm((current) => ({ ...initialForm(), date: current.date, category: current.category }))
  }

  const addAnother = () => {
    setLastSaved(null)
  }

  return (
    <div className="center-card">
      <section className="panel quick-add-shell">
        {lastSaved ? (
          <div className="quick-add-success">
            <h2>Added ✓</h2>
            <p>
              {CATEGORIES.find((category) => category.value === lastSaved.category)?.label || 'Expense'}
              {lastSaved.place ? ` — ${lastSaved.place}` : ''}: ₹{lastSaved.amount}
            </p>
            <div className="quick-add-success-actions">
              <button type="button" onClick={addAnother}>
                Add another
              </button>
              <button type="button" className="secondary-btn" onClick={() => window.close()}>
                Close
              </button>
            </div>
            <Link to="/money-tracker" className="quick-add-link">
              Open full Money Tracker
            </Link>
          </div>
        ) : (
          <>
            <h2>Quick Add Expense</h2>
            <p>Paste a payment message to auto-fill, or just type it in below.</p>

            <div className="quick-add-capture">
              <button type="button" className="secondary-btn" onClick={captureFromClipboard}>
                Paste from clipboard &amp; fill
              </button>
              <textarea
                rows={2}
                placeholder="Or paste/type the payment message here, then tap Parse"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
              />
              <button type="button" className="secondary-btn" onClick={parseTypedText} disabled={!pasteText.trim()}>
                Parse
              </button>
            </div>

            {statusMessage && <p className="money-inline-message">{statusMessage}</p>}
            {errorMessage && <p className="money-form-error">{errorMessage}</p>}

            <form className="quick-add-form" onSubmit={handleSubmit}>
              <label htmlFor="quick_add_date">Date</label>
              <input
                id="quick_add_date"
                type="date"
                value={form.date}
                onChange={(event) => updateForm('date', event.target.value)}
                required
              />

              <label htmlFor="quick_add_category">Category</label>
              <select
                id="quick_add_category"
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              <label htmlFor="quick_add_place">Place</label>
              <input
                id="quick_add_place"
                type="text"
                placeholder="Where did you spend?"
                value={form.place}
                onChange={(event) => updateForm('place', event.target.value)}
              />

              <label htmlFor="quick_add_note">Note (optional)</label>
              <input
                id="quick_add_note"
                type="text"
                value={form.note}
                onChange={(event) => updateForm('note', event.target.value)}
              />

              <label htmlFor="quick_add_amount">Amount</label>
              <input
                id="quick_add_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) => updateForm('amount', event.target.value)}
              />

              <button type="submit">Add expense</button>
            </form>

            <Link to="/money-tracker" className="quick-add-link">
              Open full Money Tracker instead
            </Link>
          </>
        )}
      </section>
    </div>
  )
}

export default QuickAddExpensePage
