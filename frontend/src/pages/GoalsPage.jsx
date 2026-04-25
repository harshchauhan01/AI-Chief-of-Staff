import { useEffect, useState } from 'react'
import api from '../api/client'

function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [busyGoalId, setBusyGoalId] = useState(null)
  const [openMenuGoalId, setOpenMenuGoalId] = useState(null)
  const [error, setError] = useState('')

  const loadGoals = async () => {
    try {
      setIsLoading(true)
      const { data } = await api.get('/goals/')
      setGoals(Array.isArray(data) ? data : [])
    } catch {
      setGoals([])
      setError('Unable to load goals right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadGoals()
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const actionsRoot = event.target.closest('[data-goal-actions]')
      if (!actionsRoot) {
        setOpenMenuGoalId(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const createGoal = async (event) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      return
    }
    try {
      await api.post('/goals/', { title: title.trim(), priority: 3, status: 'active' })
      setTitle('')
      await loadGoals()
    } catch {
      setError('Unable to add your goal right now.')
    }
  }

  const changePriority = async (goal, delta) => {
    const nextPriority = Math.min(5, Math.max(1, goal.priority + delta))
    if (nextPriority === goal.priority) {
      return
    }

    setError('')
    setBusyGoalId(goal.id)
    try {
      await api.patch(`/goals/${goal.id}/`, { priority: nextPriority })
      setGoals((current) =>
        current
          .map((item) => (item.id === goal.id ? { ...item, priority: nextPriority } : item))
          .sort((a, b) => b.priority - a.priority)
      )
      setOpenMenuGoalId(null)
    } catch {
      setError('Unable to update goal priority right now.')
    } finally {
      setBusyGoalId(null)
    }
  }

  const removeGoal = async (goal) => {
    const isConfirmed = window.confirm(`Remove goal "${goal.title}"?`)
    if (!isConfirmed) {
      return
    }

    setError('')
    setBusyGoalId(goal.id)
    try {
      await api.delete(`/goals/${goal.id}/`)
      setGoals((current) => current.filter((item) => item.id !== goal.id))
      setOpenMenuGoalId(null)
    } catch {
      setError('Unable to remove this goal right now.')
    } finally {
      setBusyGoalId(null)
    }
  }

  return (
    <section className="panel">
      <h2>Goals</h2>
      <div className="info-card">
        <h3>What This Page Does</h3>
        <p>
          Goals are your strategic outcomes. Tasks can be linked to goals so the system can prioritize
          day-to-day work based on long-term direction.
        </p>
        <p>
          Priority uses a 1 to 5 scale (5 = highest focus). Use the : action button on each goal to
          increase, decrease, or remove it.
        </p>
      </div>
      <form className="inline-form" onSubmit={createGoal}>
        <input
          placeholder="Add a strategic goal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <ul className="item-list">
        {isLoading && <li>Loading goals...</li>}
        {!isLoading && goals.length === 0 && <li>No goals yet. Add your first strategic objective.</li>}
        {goals.map((goal) => (
          <li key={goal.id} className="goal-row">
            <div className="goal-main">
              <strong>{goal.title}</strong>
              <span>Priority: {goal.priority}</span>
            </div>
            <div className="goal-actions" data-goal-actions>
              <button
                type="button"
                className="secondary-btn goal-menu-trigger"
                aria-label={`Open actions for ${goal.title}`}
                aria-expanded={openMenuGoalId === goal.id}
                onClick={() => setOpenMenuGoalId((current) => (current === goal.id ? null : goal.id))}
                disabled={busyGoalId === goal.id}
              >
                :
              </button>
              {openMenuGoalId === goal.id && (
                <div className="goal-actions-popover" role="menu" aria-label={`Actions for ${goal.title}`}>
                  <button type="button" className="secondary-btn" onClick={() => changePriority(goal, -1)} disabled={busyGoalId === goal.id || goal.priority <= 1}>
                    Priority -
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => changePriority(goal, 1)} disabled={busyGoalId === goal.id || goal.priority >= 5}>
                    Priority +
                  </button>
                  <button type="button" className="secondary-btn danger-btn" onClick={() => removeGoal(goal)} disabled={busyGoalId === goal.id}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default GoalsPage
