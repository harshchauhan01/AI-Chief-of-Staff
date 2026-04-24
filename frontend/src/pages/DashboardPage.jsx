import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const emptyPlan = { summary: '', top_tasks: [] }

const displayScore = (task) => {
  if (typeof task.priority_score === 'number') {
    return task.priority_score
  }
  const minutes = Math.max(Number(task.estimated_minutes) || 30, 1)
  const effortFactor = 1 / minutes
  return Number(((task.urgency_score * 0.45) + (task.impact_score * 0.45) + (effortFactor * 300 * 0.1)).toFixed(2))
}

function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [plan, setPlan] = useState(emptyPlan)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const [tasksRes, goalsRes, planRes] = await Promise.allSettled([
          api.get('/tasks/'),
          api.get('/goals/'),
          api.get('/planning/daily/'),
        ])

        if (!mounted) {
          return
        }

        const nextTasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : []
        const nextGoals = goalsRes.status === 'fulfilled' ? goalsRes.value.data : []
        const nextPlan = planRes.status === 'fulfilled' ? planRes.value.data : emptyPlan

        setTasks(Array.isArray(nextTasks) ? nextTasks : [])
        setGoals(Array.isArray(nextGoals) ? nextGoals : [])
        setPlan(nextPlan && typeof nextPlan === 'object' ? nextPlan : emptyPlan)

        if (
          tasksRes.status === 'rejected' &&
          goalsRes.status === 'rejected' &&
          planRes.status === 'rejected'
        ) {
          setError('Sign in to view your dashboard data.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'done').length
    const doneTasks = tasks.filter((task) => task.status === 'done').length
    const activeGoals = goals.filter((goal) => goal.status === 'active').length
    const completionRate = tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100)

    return { openTasks, activeGoals, completionRate }
  }, [goals, tasks])

  return (
    <section className="panel">
      <h2>Today at a Glance</h2>
      <p>Live snapshot of your workload, strategy, and what to focus on next.</p>

      {error && <p className="error-text">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <h3>Open Tasks</h3>
          <p>{loading ? '--' : stats.openTasks}</p>
        </div>
        <div className="stat-card">
          <h3>Active Goals</h3>
          <p>{loading ? '--' : stats.activeGoals}</p>
        </div>
        <div className="stat-card">
          <h3>Completion Rate</h3>
          <p>{loading ? '--' : `${stats.completionRate}%`}</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Top Priorities</h3>
          <ul className="item-list compact-list">
            {loading && <li>Loading priorities...</li>}
            {!loading && plan.top_tasks?.length === 0 && <li>No priority tasks yet.</li>}
            {!loading &&
              plan.top_tasks?.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <span>Score: {displayScore(task)}</span>
                </li>
              ))}
          </ul>
        </article>

        <article className="dashboard-card">
          <h3>Daily Brief</h3>
          <p className="muted-text">
            {loading
              ? 'Preparing your plan...'
              : plan.summary || 'Add goals and tasks to generate your daily plan.'}
          </p>
          <h4>Recent Tasks</h4>
          <ul className="item-list compact-list">
            {!loading && tasks.length === 0 && <li>No tasks yet. Add one from Tasks.</li>}
            {tasks.slice(0, 4).map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.status}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

export default DashboardPage
