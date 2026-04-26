import { useMemo, useState } from 'react'

const makeEntry = (id) => ({
  id,
  place: '',
  amount: '',
})

const asCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function BillCalculatorPage() {
  const [totalAmount, setTotalAmount] = useState('')
  const [entries, setEntries] = useState([makeEntry(1)])

  const spentTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    [entries],
  )

  const expectedTotal = toNumber(totalAmount)
  const difference = expectedTotal - spentTotal
  const isMatched = Math.abs(difference) < 0.005

  const reportRows = entries.filter((entry) => entry.place.trim() || toNumber(entry.amount) > 0)

  const updateEntry = (id, field, value) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    )
  }

  const addEntry = () => {
    setEntries((current) => {
      const maxId = current.reduce((max, item) => Math.max(max, item.id), 0)
      return [...current, makeEntry(maxId + 1)]
    })
  }

  const removeEntry = (id) => {
    setEntries((current) => {
      if (current.length === 1) {
        return [makeEntry(1)]
      }
      return current.filter((entry) => entry.id !== id)
    })
  }

  const resetAll = () => {
    setTotalAmount('')
    setEntries([makeEntry(1)])
  }

  return (
    <section className="panel bill-shell">
      <div className="bill-header">
        <div>
          <h2>Bill Calculator</h2>
          <p>Enter your total spend, add each spending record, and verify if everything matches.</p>
        </div>
        <div className="bill-header-actions no-print">
          <button type="button" className="secondary-btn" onClick={resetAll}>
            Reset
          </button>
          <button type="button" onClick={() => window.print()}>
            Print Report
          </button>
        </div>
      </div>

      <div className="bill-total-card">
        <label htmlFor="bill_total_amount">Total Amount Spent</label>
        <input
          id="bill_total_amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={totalAmount}
          onChange={(event) => setTotalAmount(event.target.value)}
        />
      </div>

      <article className="bill-entry-card">
        <h3>Where You Spent</h3>
        <div className="bill-entry-grid no-print">
          {entries.map((entry, index) => (
            <div key={entry.id} className="bill-entry-row">
              <input
                type="text"
                placeholder={`Expense ${index + 1} (e.g. groceries)`}
                value={entry.place}
                onChange={(event) => updateEntry(entry.id, 'place', event.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={entry.amount}
                onChange={(event) => updateEntry(entry.id, 'amount', event.target.value)}
              />
              <button
                type="button"
                className="secondary-btn danger-btn"
                onClick={() => removeEntry(entry.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="secondary-btn no-print" onClick={addEntry}>
          Add Row
        </button>
      </article>

      <article className="bill-report report-print-area">
        <div className="bill-report-head">
          <div>
            <h3>Bill Matching Report</h3>
            <p>Generated: {new Date().toLocaleString()}</p>
          </div>
          <div className={isMatched ? 'bill-match-pill matched' : 'bill-match-pill mismatch'}>
            {isMatched ? 'Matched' : 'Not Matched'}
          </div>
        </div>

        <div className="bill-table-wrap">
          <table className="bill-table" aria-label="Bill report table">
            <thead>
              <tr>
                <th>#</th>
                <th>Spent At</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={3}>No spending records added yet.</td>
                </tr>
              )}
              {reportRows.map((entry, index) => (
                <tr key={entry.id}>
                  <td>{index + 1}</td>
                  <td>{entry.place.trim() || '-'}</td>
                  <td>{asCurrency(toNumber(entry.amount))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Entered Total Amount</td>
                <td>{asCurrency(expectedTotal)}</td>
              </tr>
              <tr>
                <td colSpan={2}>Total from Spending Records</td>
                <td>{asCurrency(spentTotal)}</td>
              </tr>
              <tr>
                <td colSpan={2}>Difference</td>
                <td>{asCurrency(difference)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </section>
  )
}

export default BillCalculatorPage
