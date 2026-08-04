import { useState } from 'react'
import { asCurrency } from '../utils/money'

const emptyDraft = { name: '', target: '' }

// Buckets are user-defined goals/projects (e.g. "Goa Trip") that persist
// across months — separate from the fixed, month-scoped categories.
function BucketsCard({ buckets, onAdd, onRemove, onUpdate }) {
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState(null)

  const submit = (event) => {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) {
      return
    }
    const target = draft.target ? Number(draft.target) : null
    const payload = { name, target: target > 0 ? target : null }

    if (editingId !== null) {
      onUpdate(editingId, payload)
      setEditingId(null)
    } else {
      onAdd(payload)
    }
    setDraft(emptyDraft)
  }

  const startEdit = (bucket) => {
    setDraft({ name: bucket.name, target: bucket.target ? String(bucket.target) : '' })
    setEditingId(bucket.id)
  }

  const cancelEdit = () => {
    setDraft(emptyDraft)
    setEditingId(null)
  }

  const removeBucket = (id) => {
    onRemove(id)
    if (id === editingId) {
      cancelEdit()
    }
  }

  return (
    <article className="money-buckets-card no-print">
      <h3>Buckets</h3>
      <p>Track spend toward a goal or project — "Goa Trip", "New Laptop" — across as many months as it takes.</p>

      {buckets.length > 0 && (
        <ul className="money-bucket-list">
          {buckets.map((bucket) => (
            <li key={bucket.id}>
              <div className="money-bucket-row">
                <span>{bucket.name}</span>
                <span className={bucket.overTarget ? 'money-bucket-amount over' : 'money-bucket-amount'}>
                  {bucket.target ? `${asCurrency(bucket.spent)} / ${asCurrency(bucket.target)}` : asCurrency(bucket.spent)}
                </span>
                <button type="button" className="secondary-btn" onClick={() => startEdit(bucket)}>
                  Edit
                </button>
                <button type="button" className="secondary-btn danger-btn" onClick={() => removeBucket(bucket.id)}>
                  Remove
                </button>
              </div>
              {bucket.percent !== null && (
                <div className="money-bucket-progress">
                  <div
                    className={bucket.overTarget ? 'money-bucket-progress-fill over' : 'money-bucket-progress-fill'}
                    style={{ width: `${bucket.percent}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="money-bucket-form" onSubmit={submit}>
        <input
          type="text"
          placeholder="Bucket name (e.g. Goa Trip)"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Target (optional)"
          value={draft.target}
          onChange={(event) => setDraft((current) => ({ ...current, target: event.target.value }))}
        />
        <div className="money-add-form-actions">
          <button type="submit">{editingId !== null ? 'Save changes' : 'Add bucket'}</button>
          {editingId !== null && (
            <button type="button" className="secondary-btn" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </article>
  )
}

export default BucketsCard
