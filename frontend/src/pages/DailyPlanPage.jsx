import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const scoreForDisplay = (task) => {
  if (typeof task.priority_score === 'number') {
    return task.priority_score
  }
  const minutes = Math.max(Number(task.estimated_minutes) || 30, 1)
  const effortFactor = 1 / minutes
  return Number(((task.urgency_score * 0.45) + (task.impact_score * 0.45) + (effortFactor * 300 * 0.1)).toFixed(2))
}

const defaultBrief = {
  day: '',
  summary: '',
  top_priorities: [],
  meetings: [],
  risks: [],
  capacity: {
    planned_minutes: 0,
    focus_capacity_minutes: 420,
    load_percent: 0,
    load_tone: 'light',
  },
}

const defaultReviewPayload = {
  day: '',
  done_candidates: [],
  slipped_candidates: [],
  review: {
    day: '',
    wins: '',
    energy: 3,
    items: [],
    updated_at: null,
  },
}

const quickReasons = [
  'Underestimated effort',
  'Unexpected interruptions',
  'Dependency delay',
  'Priority changed',
  'Need clearer scope',
]

const formatReadableDate = (isoDate) => {
  if (!isoDate) {
    return 'Today'
  }
  const parsed = new Date(`${isoDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: '2-digit' }).format(parsed)
}

function DailyPlanPage() {
  const [activeMode, setActiveMode] = useState('morning')
  const [brief, setBrief] = useState(defaultBrief)
  const [reviewPayload, setReviewPayload] = useState(defaultReviewPayload)
  const [reviewForm, setReviewForm] = useState({ wins: '', energy: 3, items: {} })
  const [loadingBrief, setLoadingBrief] = useState(true)
  const [loadingReview, setLoadingReview] = useState(true)
  const [savingReview, setSavingReview] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  const hydrateReviewForm = (payload) => {
    const itemsMap = (payload.review?.items || []).reduce((acc, item) => {
      acc[item.task] = { outcome: item.outcome, reason: item.reason || '' }
      return acc
    }, {})

    setReviewForm({
      wins: payload.review?.wins || '',
      energy: payload.review?.energy || 3,
      items: itemsMap,
    })
  }

  useEffect(() => {
    let mounted = true

    const loadMorningBrief = async () => {
      try {
        setLoadingBrief(true)
        const { data } = await api.get('/planning/daily-brief/')
        if (mounted) {
          setBrief({ ...defaultBrief, ...data })
        }
      } catch {
        if (mounted) {
          setBrief({ ...defaultBrief, summary: 'No morning brief available yet.' })
          setError('Unable to load Daily Brief right now.')
        }
      } finally {
        if (mounted) {
          setLoadingBrief(false)
        }
      }
    }

    const loadNightReview = async () => {
      try {
        setLoadingReview(true)
        const { data } = await api.get('/planning/night-review/')
        if (mounted) {
          const merged = { ...defaultReviewPayload, ...data }
          setReviewPayload(merged)
          hydrateReviewForm(merged)
        }
      } catch {
        if (mounted) {
          setReviewPayload(defaultReviewPayload)
          setError('Unable to load Night Review right now.')
        }
      } finally {
        if (mounted) {
          setLoadingReview(false)
        }
      }
    }

    void Promise.all([loadMorningBrief(), loadNightReview()])

    return () => {
      mounted = false
    }
  }, [])

  const selectedReviewItems = useMemo(() => {
    return Object.entries(reviewForm.items)
      .filter(([, item]) => item?.outcome)
      .map(([taskId, item]) => ({
        task: Number(taskId),
        outcome: item.outcome,
        reason: item.reason || '',
      }))
  }, [reviewForm.items])

  const setItemOutcome = (taskId, outcome) => {
    setSavedMessage('')
    setReviewForm((current) => {
      const existing = current.items[taskId]
      const isSame = existing?.outcome === outcome
      const nextItems = { ...current.items }

      if (isSame) {
        delete nextItems[taskId]
      } else {
        nextItems[taskId] = {
          outcome,
          reason: existing?.reason || '',
        }
      }

      return { ...current, items: nextItems }
    })
  }

  const setItemReason = (taskId, reason) => {
    setSavedMessage('')
    setReviewForm((current) => ({
      ...current,
      items: {
        ...current.items,
        [taskId]: {
          outcome: current.items[taskId]?.outcome || 'slipped',
          reason,
        },
      },
    }))
  }

  const submitNightReview = async () => {
    try {
      setSavingReview(true)
      setError('')
      setSavedMessage('')
      const { data } = await api.post('/planning/night-review/', {
        day: reviewPayload.day,
        wins: reviewForm.wins,
        energy: reviewForm.energy,
        items: selectedReviewItems,
      })
      const merged = {
        ...reviewPayload,
        review: data.review,
      }
      setReviewPayload(merged)
      hydrateReviewForm(merged)
      setSavedMessage('Night review saved. Great consistency.')
    } catch {
      setError('Unable to save your Night Review right now.')
    } finally {
      setSavingReview(false)
    }
  }

  const loadToneLabel =
    brief.capacity.load_tone === 'heavy'
      ? 'High load'
      : brief.capacity.load_tone === 'balanced'
        ? 'Balanced load'
        : 'Light load'

  return (
    <section className="panel daily-brief-shell">
      <div className="brief-hero">
        <div>
          <h2>Daily Brief + Night Review</h2>
          <p>Run your day like a mission: clear priorities in the morning, honest learning at night.</p>
        </div>
        <div className="brief-hero-meta">
          <span>{formatReadableDate(brief.day || reviewPayload.day)}</span>
          <span>Retention mode: ON</span>
        </div>
      </div>

      <div className="brief-mode-toggle" role="tablist" aria-label="Daily planning mode">
        <button
          type="button"
          className={activeMode === 'morning' ? 'pill-btn active' : 'pill-btn'}
          onClick={() => setActiveMode('morning')}
        >
          Morning Brief
        </button>
        <button
          type="button"
          className={activeMode === 'night' ? 'pill-btn active' : 'pill-btn'}
          onClick={() => setActiveMode('night')}
        >
          Night Review
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {savedMessage && <p className="success-text">{savedMessage}</p>}

      {activeMode === 'morning' && (
        <div className="brief-grid">
          <article className="brief-card mission-card">
            <h3>Top 3 Priorities</h3>
            <p className="muted-text">{loadingBrief ? 'Preparing mission order...' : brief.summary}</p>
            <ul className="item-list compact-list">
              {!loadingBrief && brief.top_priorities.length === 0 && <li>No priority tasks yet.</li>}
              {brief.top_priorities.map((task, index) => (
                <li key={task.id}>
                  <div>
                    <strong>
                      {index + 1}. {task.title}
                    </strong>
                    <span>
                      Score {scoreForDisplay(task)} | ETA {task.estimated_minutes || 45} min
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="brief-card meetings-card">
            <h3>Meetings Radar</h3>
            <ul className="item-list compact-list">
              {!loadingBrief && brief.meetings.length === 0 && <li>No meetings detected for today.</li>}
              {brief.meetings.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.due_date || brief.day}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="brief-card risks-card">
            <h3>Risk Signals</h3>
            <div className="load-meter-shell">
              <div className="load-meter-label">
                <span>{loadToneLabel}</span>
                <strong>{brief.capacity.load_percent}%</strong>
              </div>
              <div className="load-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={brief.capacity.load_percent}>
                <div className="load-meter-fill" style={{ width: `${brief.capacity.load_percent}%` }} />
              </div>
              <small>
                Planned {brief.capacity.planned_minutes} / {brief.capacity.focus_capacity_minutes} focus minutes
              </small>
            </div>
            <ul className="brief-risk-list">
              {brief.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </article>
        </div>
      )}

      {activeMode === 'night' && (
        <div className="review-grid">
          <article className="brief-card review-summary-card">
            <h3>What Got Done / What Slipped</h3>
            <p className="muted-text">Capture fast feedback. This is your daily learning loop.</p>
            <label className="review-label" htmlFor="wins-input">
              Biggest win today
            </label>
            <textarea
              id="wins-input"
              value={reviewForm.wins}
              onChange={(event) => {
                setSavedMessage('')
                setReviewForm((current) => ({ ...current, wins: event.target.value }))
              }}
              rows={3}
              placeholder="Example: Closed two blockers before noon."
            />

            <p className="review-label">Energy score</p>
            <div className="energy-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={reviewForm.energy === value ? 'pill-btn active' : 'pill-btn'}
                  onClick={() => {
                    setSavedMessage('')
                    setReviewForm((current) => ({ ...current, energy: value }))
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </article>

          <article className="brief-card outcomes-card">
            <h3>Done Today</h3>
            <ul className="item-list compact-list">
              {!loadingReview && reviewPayload.done_candidates.length === 0 && <li>No completed tasks detected for this day.</li>}
              {reviewPayload.done_candidates.map((task) => {
                const isRoutine = task.source === 'routine'
                const isSelected = reviewForm.items[task.id]?.outcome === 'done'
                return (
                  <li key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{isRoutine ? 'Status: done (routine)' : 'Status: done'}</span>
                    </div>
                    {isRoutine ? (
                      <span className="muted-text">Synced from Routine Tracker</span>
                    ) : (
                      <button
                        type="button"
                        className={isSelected ? 'pill-btn active' : 'pill-btn'}
                        onClick={() => setItemOutcome(task.id, 'done')}
                      >
                        {isSelected ? 'Selected' : 'Mark done'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </article>

          <article className="brief-card outcomes-card">
            <h3>Slipped Tasks + Why</h3>
            <ul className="item-list compact-list">
              {!loadingReview && reviewPayload.slipped_candidates.length === 0 && <li>No slipped tasks for this day.</li>}
              {reviewPayload.slipped_candidates.map((task) => {
                const state = reviewForm.items[task.id]
                const isSelected = state?.outcome === 'slipped'

                return (
                  <li key={task.id} className="slipped-row">
                    <div>
                      <strong>{task.title}</strong>
                      <span>{task.due_date ? `Due ${task.due_date}` : 'No due date'}</span>
                    </div>
                    <button
                      type="button"
                      className={isSelected ? 'pill-btn active' : 'pill-btn'}
                      onClick={() => setItemOutcome(task.id, 'slipped')}
                    >
                      {isSelected ? 'Selected' : 'Mark slipped'}
                    </button>
                    {isSelected && (
                      <select value={state?.reason || ''} onChange={(event) => setItemReason(task.id, event.target.value)}>
                        <option value="">Select reason</option>
                        {quickReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="review-save-row">
              <small>{selectedReviewItems.length} review items selected</small>
              <button type="button" onClick={submitNightReview} disabled={savingReview}>
                {savingReview ? 'Saving...' : 'Save Night Review'}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  )
}

export default DailyPlanPage
