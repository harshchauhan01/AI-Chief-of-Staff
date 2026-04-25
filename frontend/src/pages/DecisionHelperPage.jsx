import { useMemo, useState } from 'react'
import api from '../api/client'

const buildOption = (id) => ({
  id,
  label: '',
  days_until_deadline: 3,
  importance: 3,
  required_energy: 3,
})

function DecisionHelperPage() {
  const [currentEnergy, setCurrentEnergy] = useState(3)
  const [options, setOptions] = useState([buildOption(1), buildOption(2)])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canAddOption = options.length < 3
  const canRemoveOption = options.length > 2

  const updateOption = (id, field, value) => {
    setError('')
    setResult(null)
    setOptions((current) =>
      current.map((option) => (option.id === id ? { ...option, [field]: value } : option)),
    )
  }

  const addOption = () => {
    if (!canAddOption) {
      return
    }
    const nextId = Math.max(...options.map((item) => item.id)) + 1
    setOptions((current) => [...current, buildOption(nextId)])
    setError('')
    setResult(null)
  }

  const removeOption = (id) => {
    if (!canRemoveOption) {
      return
    }
    setOptions((current) => current.filter((option) => option.id !== id))
    setError('')
    setResult(null)
  }

  const submitDecision = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    const normalizedOptions = options.map((option) => ({
      label: option.label.trim(),
      days_until_deadline: Number(option.days_until_deadline),
      importance: Number(option.importance),
      required_energy: Number(option.required_energy),
    }))

    if (normalizedOptions.some((option) => option.label.length === 0)) {
      setError('Each option needs a name.')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/assistant/quick-decision/', {
        current_energy: Number(currentEnergy),
        options: normalizedOptions,
      })
      setResult(data)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to evaluate options right now.')
    } finally {
      setLoading(false)
    }
  }

  const recommendationText = useMemo(() => {
    if (!result?.best_choice) {
      return ''
    }
    const best = result.best_choice
    return `${best.label} wins because it balances deadline (${best.score_breakdown.deadline}/5), importance (${best.score_breakdown.importance}/5), and energy fit (${best.score_breakdown.energy_fit}/5).`
  }, [result])

  return (
    <section className="panel decision-shell">
      <div className="decision-hero">
        <div>
          <h2>Quick Decision Helper</h2>
          <p>Enter 2 to 3 options. Get one best choice using weighted deadline, importance, and energy fit.</p>
        </div>
        <div className="decision-chip">Simple weighted logic</div>
      </div>

      <form className="decision-form" onSubmit={submitDecision}>
        <div className="decision-energy-row">
          <label htmlFor="current-energy">Current Energy (1-5)</label>
          <input
            id="current-energy"
            type="number"
            min="1"
            max="5"
            value={currentEnergy}
            onChange={(event) => {
              setError('')
              setResult(null)
              setCurrentEnergy(event.target.value)
            }}
            required
          />
        </div>

        <div className="decision-option-grid">
          {options.map((option, index) => (
            <article className="decision-option-card" key={option.id}>
              <div className="decision-option-head">
                <h3>Option {index + 1}</h3>
                {canRemoveOption && (
                  <button
                    type="button"
                    className="secondary-btn danger-btn"
                    onClick={() => removeOption(option.id)}
                  >
                    Remove
                  </button>
                )}
              </div>

              <label>
                Name
                <input
                  type="text"
                  value={option.label}
                  onChange={(event) => updateOption(option.id, 'label', event.target.value)}
                  placeholder="Example: Ship proposal"
                  required
                />
              </label>

              <label>
                Days Until Deadline
                <input
                  type="number"
                  value={option.days_until_deadline}
                  onChange={(event) => updateOption(option.id, 'days_until_deadline', event.target.value)}
                  required
                />
              </label>

              <label>
                Importance (1-5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={option.importance}
                  onChange={(event) => updateOption(option.id, 'importance', event.target.value)}
                  required
                />
              </label>

              <label>
                Energy Required (1-5)
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={option.required_energy}
                  onChange={(event) => updateOption(option.id, 'required_energy', event.target.value)}
                  required
                />
              </label>
            </article>
          ))}
        </div>

        <div className="decision-actions">
          <div className="decision-action-group">
            <button type="button" className="secondary-btn" onClick={addOption} disabled={!canAddOption}>
              Add Third Option
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Evaluating...' : 'Choose Best Option'}
            </button>
          </div>
          {error && <p className="error-text">{error}</p>}
        </div>
      </form>

      {result?.best_choice && (
        <section className="decision-result">
          <article className="decision-best-card">
            <h3>Best Choice</h3>
            <strong>{result.best_choice.label}</strong>
            <p>{recommendationText}</p>
            <p>
              Total score: <strong>{result.best_choice.weighted_score}</strong>
            </p>
          </article>

          <article className="decision-ranking-card">
            <h3>Ranked Options</h3>
            <ul className="item-list compact-list">
              {result.ranked_options.map((option) => (
                <li key={option.label}>
                  <div>
                    <strong>{option.label} | </strong>
                    <span>
                      Deadline: {option.score_breakdown.deadline}/5 | Importance: {option.score_breakdown.importance}/5 | Energy fit: {option.score_breakdown.energy_fit}/5
                    </span>
                  </div>
                  <span>Score: {option.weighted_score}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </section>
  )
}

export default DecisionHelperPage
