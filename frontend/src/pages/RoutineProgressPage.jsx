import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const ranges = [
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

const formatShortDate = (isoDay) => {
  const date = new Date(`${isoDay}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(date)
}

function RoutineProgressPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const [payload, setPayload] = useState({
    start: '',
    end: '',
    overall_rate: 0,
    best_day: null,
    daily: [],
    tasks: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadProgress = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/tasks/routines/progress/', { params: { days: rangeDays } })
        if (!mounted) {
          return
        }
        setPayload(data)
        setError('')
      } catch {
        if (!mounted) {
          return
        }
        setError('Unable to load routine progress right now.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadProgress()

    return () => {
      mounted = false
    }
  }, [rangeDays])

  const trendPoints = useMemo(() => {
    if (!payload.daily.length) {
      return ''
    }

    const width = 720
    const height = 210
    const step = payload.daily.length > 1 ? width / (payload.daily.length - 1) : width

    return payload.daily
      .map((item, index) => {
        const x = index * step
        const y = height - (item.rate / 100) * height
        return `${x},${y}`
      })
      .join(' ')
  }, [payload.daily])

  return (
    <section className="panel routine-progress-shell">
      <div className="routine-progress-head">
        <div>
          <h2>Routine Progress</h2>
          <p>Visualize completion trends, strongest days, and task-level consistency.</p>
        </div>
        <div className="pill-group">
          {ranges.map((option) => (
            <button
              key={option.value}
              type="button"
              className={rangeDays === option.value ? 'pill-btn active' : 'pill-btn'}
              onClick={() => setRangeDays(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="routine-progress-stats">
        <article className="stat-card">
          <h3>Overall Completion</h3>
          <p>{loading ? '--' : `${Math.round(payload.overall_rate)}%`}</p>
        </article>
        <article className="stat-card">
          <h3>Best Day</h3>
          <p>{loading || !payload.best_day ? '--' : `${formatShortDate(payload.best_day.day)} (${Math.round(payload.best_day.rate)}%)`}</p>
        </article>
        <article className="stat-card">
          <h3>Tracking Range</h3>
          <p>{loading ? '--' : `${payload.start} to ${payload.end}`}</p>
        </article>
      </div>

      <div className="routine-progress-grid">
        <article className="progress-card">
          <h3>Daily Completion Trend</h3>
          {loading && <p>Loading chart...</p>}
          {!loading && payload.daily.length === 0 && <p>No routine data yet.</p>}
          {!loading && payload.daily.length > 0 && (
            <div className="trend-chart">
              <svg viewBox="0 0 720 210" role="img" aria-label="Daily completion trend line chart">
                <line x1="0" y1="210" x2="720" y2="210" stroke="#d7d1c4" strokeWidth="1" />
                <line x1="0" y1="105" x2="720" y2="105" stroke="#e5dfd4" strokeDasharray="5 5" strokeWidth="1" />
                <line x1="0" y1="0" x2="720" y2="0" stroke="#e5dfd4" strokeDasharray="5 5" strokeWidth="1" />
                <polyline points={trendPoints} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="trend-labels">
                <span>{formatShortDate(payload.daily[0].day)}</span>
                <span>{formatShortDate(payload.daily[payload.daily.length - 1].day)}</span>
              </div>
            </div>
          )}
        </article>

        <article className="progress-card">
          <h3>Task Completion Rates</h3>
          {loading && <p>Loading chart...</p>}
          {!loading && payload.tasks.length === 0 && <p>Add routine tasks to see insights.</p>}
          {!loading && payload.tasks.length > 0 && (
            <ul className="task-progress-bars">
              {payload.tasks.map((task) => (
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
  )
}

export default RoutineProgressPage