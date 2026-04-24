import { useEffect, useState } from 'react'
import api from '../api/client'

const scoreForDisplay = (task) => {
  if (typeof task.priority_score === 'number') {
    return task.priority_score
  }
  const minutes = Math.max(Number(task.estimated_minutes) || 30, 1)
  const effortFactor = 1 / minutes
  return Number(((task.urgency_score * 0.45) + (task.impact_score * 0.45) + (effortFactor * 300 * 0.1)).toFixed(2))
}

function DailyPlanPage() {
  const [plan, setPlan] = useState({ summary: '', top_tasks: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .get('/planning/daily/')
      .then(({ data }) => setPlan(data))
      .catch(() => setPlan({ summary: 'No plan available yet.', top_tasks: [] }))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <section className="panel">
      <h2>Daily Plan</h2>
      <p>{isLoading ? 'Preparing your plan...' : plan.summary}</p>
      <ul className="item-list">
        {!isLoading && plan.top_tasks.length === 0 && <li>No recommended tasks yet.</li>}
        {plan.top_tasks.map((task) => (
          <li key={task.id}>
            <strong>{task.title}</strong>
            <span>Priority score: {scoreForDisplay(task)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default DailyPlanPage
