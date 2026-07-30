import { useState } from 'react'
import { Link } from 'react-router-dom'
import SplitExpenseFields from '../components/SplitExpenseFields'
import { CATEGORIES } from '../constants/moneyCategories'
import { asCurrency, todayIso, toNumber } from '../utils/money'
import { addExpenseToStore } from '../utils/moneyStore'
import { parseSharedExpenseText } from '../utils/parseSharedExpense'
import { computeShareAmount } from '../utils/splitShare'

const initialForm = () => ({
  date: todayIso(),
  category: CATEGORIES[0].value,
  place: '',
  note: '',
  amount: '',
  isSplit: false,
  splitWith: [],
})

// One question per screen, in this order — amount first so a fast tap from
// the notification asks the one thing you always know before anything else.
const STEPS = ['amount', 'category', 'place', 'split', 'note', 'date']

function QuickAddExpensePage() {
  const [form, setForm] = useState(initialForm)
  const [pasteText, setPasteText] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [stepError, setStepError] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const applyParsedText = (text) => {
    const { amount, place } = parseSharedExpenseText(text)
    if (!amount && !place) {
      setStatusMessage("Couldn't find an amount or place in that text — fill it in below instead.")
      return
    }

    setForm((current) => ({
      ...current,
      amount: amount || current.amount,
      place: place || current.place,
    }))
    setStatusMessage('Filled in from the text below — double-check before continuing.')
  }

  const captureFromClipboard = async () => {
    setStatusMessage('')

    if (!navigator.clipboard?.readText) {
      setStatusMessage('Clipboard access is not available here — paste the text into the box below instead.')
      return
    }

    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setStatusMessage('Clipboard is empty.')
        return
      }
      setPasteText(text)
      applyParsedText(text)
    } catch {
      setStatusMessage('Could not read the clipboard — paste the text into the box below instead.')
    }
  }

  const parseTypedText = () => {
    applyParsedText(pasteText)
  }

  const validateStep = (step) => {
    if (step === 'amount' && toNumber(form.amount) <= 0) {
      return 'Enter an amount greater than 0.'
    }
    if (step === 'date' && !form.date) {
      return 'Pick a date.'
    }
    return ''
  }

  const goNext = () => {
    const error = validateStep(currentStep)
    if (error) {
      setStepError(error)
      return
    }
    setStepError('')
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setStepError('')
    setStepIndex((index) => Math.max(index - 1, 0))
  }

  // Deliberately not a native form submit: the Next/Add-expense button swap
  // in-place (same tree position), and a browser evaluates a click's default
  // action against whatever `type` the DOM node ends up with after React's
  // synchronous re-render — so a plain type="submit" here would let a click
  // on "Next" fall through and submit early. Everything is driven by
  // explicit handlers instead, and the <form>'s onSubmit is just a backstop.
  const submitExpense = () => {
    const error = validateStep('date') || validateStep('amount')
    if (error) {
      setStepError(error)
      return
    }

    const amount = toNumber(form.amount)
    const saved = addExpenseToStore({
      date: form.date,
      month: form.date.slice(0, 7),
      category: form.category,
      place: form.place.trim(),
      note: form.note.trim(),
      amount,
      isSplit: form.isSplit,
      splitWith: form.isSplit ? form.splitWith : [],
      shareAmount: computeShareAmount(amount, form.isSplit, form.splitWith),
    })

    setLastSaved(saved)
    setStatusMessage('')
    setStepError('')
    setPasteText('')
    setForm((current) => ({ ...initialForm(), date: current.date, category: current.category }))
    setStepIndex(0)
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()
    if (isLastStep) {
      submitExpense()
    } else {
      goNext()
    }
  }

  const handleEnterKey = (event) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    if (isLastStep) {
      submitExpense()
    } else {
      goNext()
    }
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
              {lastSaved.place ? ` — ${lastSaved.place}` : ''}: {asCurrency(lastSaved.amount)}
            </p>
            {lastSaved.isSplit && lastSaved.splitWith?.length > 0 && (
              <p className="quick-add-split-note">
                Split with {lastSaved.splitWith.join(', ')} — your share: {asCurrency(lastSaved.shareAmount)}
              </p>
            )}
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
            <div className="quick-add-progress">
              Step {stepIndex + 1} of {STEPS.length}
              <div className="quick-add-progress-bar">
                <div
                  className="quick-add-progress-fill"
                  style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <form className="quick-add-form" onSubmit={handleFormSubmit}>
              {currentStep === 'amount' && (
                <div className="quick-add-step">
                  <h2>How much did you spend?</h2>
                  <input
                    id="quick_add_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    autoFocus
                    value={form.amount}
                    onChange={(event) => updateForm('amount', event.target.value)}
                    onKeyDown={handleEnterKey}
                  />

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
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={parseTypedText}
                      disabled={!pasteText.trim()}
                    >
                      Parse
                    </button>
                  </div>
                  {statusMessage && <p className="money-inline-message">{statusMessage}</p>}
                </div>
              )}

              {currentStep === 'category' && (
                <div className="quick-add-step">
                  <h2>Where did you spend it?</h2>
                  <select
                    id="quick_add_category"
                    autoFocus
                    value={form.category}
                    onChange={(event) => updateForm('category', event.target.value)}
                    onKeyDown={handleEnterKey}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentStep === 'place' && (
                <div className="quick-add-step">
                  <h2>Add the place</h2>
                  <input
                    id="quick_add_place"
                    type="text"
                    placeholder="Where did you spend? (optional)"
                    autoFocus
                    value={form.place}
                    onChange={(event) => updateForm('place', event.target.value)}
                    onKeyDown={handleEnterKey}
                  />
                </div>
              )}

              {currentStep === 'split' && (
                <div className="quick-add-step">
                  <h2>Split this expense?</h2>
                  <SplitExpenseFields
                    amount={form.amount}
                    isSplit={form.isSplit}
                    onToggleSplit={(value) => updateForm('isSplit', value)}
                    splitWith={form.splitWith}
                    onChangeSplitWith={(value) => updateForm('splitWith', value)}
                  />
                </div>
              )}

              {currentStep === 'note' && (
                <div className="quick-add-step">
                  <h2>Add a note</h2>
                  <input
                    id="quick_add_note"
                    type="text"
                    placeholder="Optional"
                    autoFocus
                    value={form.note}
                    onChange={(event) => updateForm('note', event.target.value)}
                    onKeyDown={handleEnterKey}
                  />
                </div>
              )}

              {currentStep === 'date' && (
                <div className="quick-add-step">
                  <h2>Which date?</h2>
                  <input
                    id="quick_add_date"
                    type="date"
                    autoFocus
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    onKeyDown={handleEnterKey}
                    required
                  />
                </div>
              )}

              {stepError && <p className="money-form-error">{stepError}</p>}

              <div className="quick-add-step-nav">
                {stepIndex > 0 && (
                  <button type="button" className="secondary-btn" onClick={goBack}>
                    Back
                  </button>
                )}
                {isLastStep ? (
                  <button type="button" onClick={submitExpense}>
                    Add expense
                  </button>
                ) : (
                  <button type="button" onClick={goNext}>
                    Next
                  </button>
                )}
              </div>
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
