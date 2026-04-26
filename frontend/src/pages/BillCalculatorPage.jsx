import { useEffect, useMemo, useState } from 'react'

const BILL_STORAGE_KEY = 'orion-bill-calculator:v1'

const makeEntry = (id) => ({
  id,
  place: '',
  amount: '',
  paidBy: 'You',
  splitBetween: ['You'],
})

const asCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getInitialBillState = () => {
  const fallback = {
    totalAmount: '',
    users: ['You'],
    entries: [makeEntry(1)],
  }

  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = localStorage.getItem(BILL_STORAGE_KEY)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    const parsedUsers = Array.isArray(parsed.users)
      ? parsed.users.map((item) => String(item || '').trim()).filter(Boolean)
      : []

    const users = parsedUsers.length > 0 ? parsedUsers : ['You']

    const parsedEntries = Array.isArray(parsed.entries)
      ? parsed.entries.map((entry, index) => {
          const paidBy = users.includes(entry?.paidBy) ? entry.paidBy : users[0]
          const splitBetween = Array.isArray(entry?.splitBetween)
            ? entry.splitBetween.filter((name) => users.includes(name))
            : []

          return {
            id: Number.isFinite(Number(entry?.id)) ? Number(entry.id) : index + 1,
            place: String(entry?.place || ''),
            amount: String(entry?.amount || ''),
            paidBy,
            splitBetween: splitBetween.length > 0 ? splitBetween : [paidBy],
          }
        })
      : []

    return {
      totalAmount: String(parsed.totalAmount || ''),
      users,
      entries: parsedEntries.length > 0 ? parsedEntries : [makeEntry(1)],
    }
  } catch {
    return fallback
  }
}

function BillCalculatorPage() {
  const initialBillState = useMemo(() => getInitialBillState(), [])

  const [totalAmount, setTotalAmount] = useState(initialBillState.totalAmount)
  const [users, setUsers] = useState(initialBillState.users)
  const [newUser, setNewUser] = useState('')
  const [entries, setEntries] = useState(initialBillState.entries)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    localStorage.setItem(
      BILL_STORAGE_KEY,
      JSON.stringify({
        totalAmount,
        users,
        entries,
      }),
    )
  }, [entries, totalAmount, users])

  const spentTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    [entries],
  )

  const expectedTotal = toNumber(totalAmount)
  const difference = expectedTotal - spentTotal
  const isMatched = Math.abs(difference) < 0.005

  const reportRows = useMemo(
    () => entries.filter((entry) => entry.place.trim() || toNumber(entry.amount) > 0),
    [entries],
  )

  const userSummary = useMemo(() => {
    const initial = users.reduce((acc, user) => {
      acc[user] = { user, paid: 0, share: 0 }
      return acc
    }, {})

    for (const row of reportRows) {
      const amount = toNumber(row.amount)
      if (amount <= 0) {
        continue
      }

      const paidBy = users.includes(row.paidBy) ? row.paidBy : users[0]
      if (paidBy) {
        initial[paidBy].paid += amount
      }

      const splitUsers = row.splitBetween.filter((name) => users.includes(name))
      const effectiveSplit = splitUsers.length > 0 ? splitUsers : (paidBy ? [paidBy] : [])
      if (effectiveSplit.length === 0) {
        continue
      }

      const shareEach = amount / effectiveSplit.length
      for (const name of effectiveSplit) {
        initial[name].share += shareEach
      }
    }

    return users.map((user) => {
      const paid = initial[user].paid
      const share = initial[user].share
      return {
        user,
        paid,
        share,
        net: paid - share,
      }
    })
  }, [reportRows, users])

  const updateEntry = (id, field, value) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    )
  }

  const addEntry = () => {
    setEntries((current) => {
      const maxId = current.reduce((max, item) => Math.max(max, item.id), 0)
      return [
        ...current,
        {
          ...makeEntry(maxId + 1),
          paidBy: users[0] || 'You',
          splitBetween: users[0] ? [users[0]] : ['You'],
        },
      ]
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
    setUsers(['You'])
    setNewUser('')
    setEntries([makeEntry(1)])

    if (typeof window !== 'undefined') {
      localStorage.removeItem(BILL_STORAGE_KEY)
    }
  }

  const addUser = () => {
    const trimmed = newUser.trim()
    if (!trimmed) {
      return
    }

    const exists = users.some((item) => item.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setNewUser('')
      return
    }

    setUsers((current) => [...current, trimmed])
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        splitBetween: entry.splitBetween.length > 0 ? entry.splitBetween : [trimmed],
      })),
    )
    setNewUser('')
  }

  const removeUser = (name) => {
    if (users.length === 1) {
      return
    }

    const remaining = users.filter((item) => item !== name)
    setUsers(remaining)
    setEntries((current) =>
      current.map((entry) => {
        const nextSplit = entry.splitBetween.filter((item) => item !== name)
        return {
          ...entry,
          paidBy: entry.paidBy === name ? remaining[0] : entry.paidBy,
          splitBetween: nextSplit.length > 0 ? nextSplit : [remaining[0]],
        }
      }),
    )
  }

  const toggleSplitUser = (entryId, userName) => {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) {
          return entry
        }

        const alreadySelected = entry.splitBetween.includes(userName)
        if (alreadySelected && entry.splitBetween.length === 1) {
          return entry
        }

        return {
          ...entry,
          splitBetween: alreadySelected
            ? entry.splitBetween.filter((item) => item !== userName)
            : [...entry.splitBetween, userName],
        }
      }),
    )
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

      <article className="bill-people-card">
        <h3>People in This Bill</h3>
        <div className="bill-user-add no-print">
          <input
            type="text"
            placeholder="Add person name"
            value={newUser}
            onChange={(event) => setNewUser(event.target.value)}
          />
          <button type="button" className="secondary-btn" onClick={addUser}>
            Add Person
          </button>
        </div>
        <div className="bill-user-chips">
          {users.map((user) => (
            <div key={user} className="bill-user-chip">
              <span>{user}</span>
              <button
                type="button"
                className="secondary-btn no-print"
                onClick={() => removeUser(user)}
                disabled={users.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="bill-entry-card">
        <h3>Where You Spent and How to Split</h3>
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
              <select
                value={entry.paidBy}
                onChange={(event) => updateEntry(entry.id, 'paidBy', event.target.value)}
              >
                {users.map((user) => (
                  <option key={user} value={user}>
                    Paid by: {user}
                  </option>
                ))}
              </select>
              <div className="bill-split-group">
                {users.map((user) => (
                  <button
                    key={user}
                    type="button"
                    className={entry.splitBetween.includes(user) ? 'pill-btn active' : 'pill-btn'}
                    onClick={() => toggleSplitUser(entry.id, user)}
                  >
                    {user}
                  </button>
                ))}
              </div>
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
                <th>Paid By</th>
                <th>Split Between</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={5}>No spending records added yet.</td>
                </tr>
              )}
              {reportRows.map((entry, index) => (
                <tr key={entry.id}>
                  <td>{index + 1}</td>
                  <td>{entry.place.trim() || '-'}</td>
                  <td>{asCurrency(toNumber(entry.amount))}</td>
                  <td>{entry.paidBy || '-'}</td>
                  <td>{entry.splitBetween.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Entered Total Amount</td>
                <td>{asCurrency(expectedTotal)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Total from Spending Records</td>
                <td>{asCurrency(spentTotal)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Difference</td>
                <td>{asCurrency(difference)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bill-table-wrap bill-user-report">
          <h4>User Spend Summary</h4>
          <table className="bill-table" aria-label="User summary table">
            <thead>
              <tr>
                <th>User</th>
                <th>Total Paid</th>
                <th>Total Share</th>
                <th>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {userSummary.map((item) => (
                <tr key={item.user}>
                  <td>{item.user}</td>
                  <td>{asCurrency(item.paid)}</td>
                  <td>{asCurrency(item.share)}</td>
                  <td>{asCurrency(item.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

export default BillCalculatorPage
