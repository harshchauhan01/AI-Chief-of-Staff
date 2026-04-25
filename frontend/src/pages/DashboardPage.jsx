import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const emptyPlan = { summary: '', top_tasks: [] }
const emptyProgress = {
  start: '',
  end: '',
  overall_rate: 0,
  best_day: null,
  daily: [],
  tasks: [],
}

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
  const [progress, setProgress] = useState(emptyProgress)
  const [progressRange, setProgressRange] = useState(30)
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProgress = async (rangeDays) => {
    setProgressLoading(true)

    try {
      const { data } = await api.get('/tasks/routines/progress/', { params: { days: rangeDays } })
      setProgress(data)
    } catch {
      setProgress(emptyProgress)
    } finally {
      setProgressLoading(false)
    }
  }

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
    void loadProgress(progressRange)

    return () => {
      mounted = false
    }
  }, [progressRange])

  const stats = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'done').length
    const doneTasks = tasks.filter((task) => task.status === 'done').length
    const activeGoals = goals.filter((goal) => goal.status === 'active').length
    const completionRate = tasks.length === 0 ? 0 : Math.round((doneTasks / tasks.length) * 100)

    return { openTasks, activeGoals, completionRate }
  }, [goals, tasks])

  const progressTrendPoints = useMemo(() => {
    if (!progress.daily.length) {
      return ''
    }

    const width = 720
    const height = 210
    const step = progress.daily.length > 1 ? width / (progress.daily.length - 1) : width

    return progress.daily
      .map((item, index) => {
        const x = index * step
        const y = height - (item.rate / 100) * height
        return `${x},${y}`
      })
      .join(' ')
  }, [progress.daily])

  const formatShortDate = (isoDay) => {
    const date = new Date(`${isoDay}T00:00:00`)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date)
  }

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

      <section className="dashboard-card dashboard-progress-card">
        <div className="routine-progress-head dashboard-progress-head">
          <div>
            <h3>Routine Progress</h3>
            <p>Charts are shown directly on the dashboard below today at a glance.</p>
          </div>
          <div className="pill-group">
            {[14, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                className={progressRange === days ? 'pill-btn active' : 'pill-btn'}
                onClick={() => setProgressRange(days)}
              >
                Last {days} days
              </button>
            ))}
          </div>
        </div>

        <div className="routine-progress-stats dashboard-progress-stats">
          <article className="stat-card">
            <h3>Overall Completion</h3>
            <p>{progressLoading ? '--' : `${Math.round(progress.overall_rate)}%`}</p>
          </article>
          <article className="stat-card">
            <h3>Best Day</h3>
            <p>{progressLoading || !progress.best_day ? '--' : `${formatShortDate(progress.best_day.day)} (${Math.round(progress.best_day.rate)}%)`}</p>
          </article>
          <article className="stat-card">
            <h3>Tracking Range</h3>
            <p>{progressLoading ? '--' : `${progress.start} to ${progress.end}`}</p>
          </article>
        </div>

        <div className="routine-progress-grid dashboard-progress-grid">
          <article className="progress-card">
            <h3>Daily Completion Trend</h3>
            {progressLoading && <p>Loading chart...</p>}
            {!progressLoading && progress.daily.length === 0 && <p>No routine data yet.</p>}
            {!progressLoading && progress.daily.length > 0 && (
              <div className="trend-chart">
                <svg viewBox="0 0 720 210" role="img" aria-label="Daily completion trend line chart">
                  <line x1="0" y1="210" x2="720" y2="210" stroke="#d7d1c4" strokeWidth="1" />
                  <line x1="0" y1="105" x2="720" y2="105" stroke="#e5dfd4" strokeDasharray="5 5" strokeWidth="1" />
                  <line x1="0" y1="0" x2="720" y2="0" stroke="#e5dfd4" strokeDasharray="5 5" strokeWidth="1" />
                  <polyline points={progressTrendPoints} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="trend-labels">
                  <span>{formatShortDate(progress.daily[0].day)}</span>
                  <span>{formatShortDate(progress.daily[progress.daily.length - 1].day)}</span>
                </div>
              </div>
            )}
          </article>

          <article className="progress-card">
            <h3>Task Completion Rates</h3>
            {progressLoading && <p>Loading chart...</p>}
            {!progressLoading && progress.tasks.length === 0 && <p>Add routine tasks to see insights.</p>}
            {!progressLoading && progress.tasks.length > 0 && (
              <ul className="task-progress-bars">
                {progress.tasks.map((task) => (
                  <li key={task.id}>
                    <div className="task-progress-head">
                      <strong>{task.title}</strong>
                      <span>{Math.round(task.completion_rate)}%</span>
                    </div>
                    <div className="task-progress-track">
                      <div className="task-progress-fill" style={{ width: `${task.completion_rate}%` }} />
                    </div>
                    <small>
                      {task.done_days}/{task.total_days} days complete | streak {task.current_streak}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </section>
  )
}

export default DashboardPage
