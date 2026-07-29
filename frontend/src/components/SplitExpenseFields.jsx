import { useMemo, useState } from 'react'
import { asCurrency } from '../utils/money'
import { loadKnownPeople, rememberKnownPerson } from '../utils/knownPeople'
import { computeShareAmount } from '../utils/splitShare'

// Shared by MoneyTrackerPage and QuickAddExpensePage — lets one expense be
// marked as split with others, computes "your share" the same way in both.
function SplitExpenseFields({ amount, isSplit, onToggleSplit, splitWith, onChangeSplitWith }) {
  const [newPerson, setNewPerson] = useState('')
  const knownPeople = useMemo(() => loadKnownPeople(), [])

  const totalPeople = splitWith.length + 1
  const shareAmount = computeShareAmount(amount, isSplit, splitWith)

  const addPerson = () => {
    const trimmed = newPerson.trim()
    if (!trimmed) {
      return
    }
    if (splitWith.some((person) => person.toLowerCase() === trimmed.toLowerCase())) {
      setNewPerson('')
      return
    }

    onChangeSplitWith([...splitWith, trimmed])
    rememberKnownPerson(trimmed)
    setNewPerson('')
  }

  const removePerson = (name) => {
    onChangeSplitWith(splitWith.filter((person) => person !== name))
  }

  return (
    <div className="split-fields">
      <label className="split-toggle">
        <input type="checkbox" checked={isSplit} onChange={(event) => onToggleSplit(event.target.checked)} />
        Split this expense with others
      </label>

      {isSplit && (
        <div className="split-people">
          <div className="split-people-add">
            <input
              list="known-people-list"
              type="text"
              placeholder="Add person (e.g. Rahul)"
              value={newPerson}
              onChange={(event) => setNewPerson(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addPerson()
                }
              }}
            />
            <button type="button" className="secondary-btn" onClick={addPerson}>
              Add
            </button>
          </div>
          <datalist id="known-people-list">
            {knownPeople.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          {splitWith.length > 0 && (
            <div className="split-people-chips">
              {splitWith.map((name) => (
                <span key={name} className="split-chip">
                  {name}
                  <button type="button" onClick={() => removePerson(name)} aria-label={`Remove ${name}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="split-share-preview">
            Split {totalPeople} ways — your share: {asCurrency(shareAmount)}
          </p>
        </div>
      )}
    </div>
  )
}

export default SplitExpenseFields
