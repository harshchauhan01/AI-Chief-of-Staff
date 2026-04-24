import { useEffect, useState } from 'react'
import api from '../api/client'

function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(true)
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

  const createGoal = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/goals/', { title, priority: 3, status: 'active' })
      setTitle('')
      await loadGoals()
    } catch {
      setError('Unable to add your goal right now.')
    }
  }

  return (
    <section className="panel">
      <h2>Goals</h2>
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
          <li key={goal.id}>
            <strong>{goal.title}</strong>
            <span>Priority: {goal.priority}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default GoalsPage
