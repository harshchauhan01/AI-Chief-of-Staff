import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import {
  DEFAULT_ROUTINE_ALERT_TIMES,
  loadRoutineAlertTimes,
  saveRoutineAlertTimes,
} from '../services/reminderService'

const WINDOW_DAYS = 8

const getYesterday = (seed = new Date()) => {
  const date = new Date(seed)
  date.setDate(date.getDate() - 1)
  date.setHours(0, 0, 0, 0)
  return date
}

const toIsoDate = (value) => {
  const date = new Date(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatDayHeader = (isoDay) => {
  const date = new Date(`${isoDay}T00:00:00`)
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    date: new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(date),
  }
}

const formatRoutineTime = (timeValue) => {
  if (!timeValue) {
    return ''
  }

  const [hourPart, minutePart] = timeValue.split(':')
  const hour = Number(hourPart)
  const minute = minutePart?.slice(0, 2) || '00'
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = ((hour + 11) % 12) + 1
  return `${String(displayHour).padStart(2, '0')}:${minute} ${suffix}`
}

function RoutineTrackerPage() {
  const [matrix, setMatrix] = useState({ days: [], tasks: [], start: '', end: '' })
  const [startDate, setStartDate] = useState(toIsoDate(getYesterday()))
  const [liveNow, setLiveNow] = useState(new Date())
  const [routineAlertTimes, setRoutineAlertTimes] = useState(() => loadRoutineAlertTimes())
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [routineTime, setRoutineTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [taskPendingDelete, setTaskPendingDelete] = useState(null)
  const [alertMessage, setAlertMessage] = useState('')
  const [error, setError] = useState('')

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/tasks/routines/matrix/', {
        params: {
          start: startDate,
          days: WINDOW_DAYS,
        },
      })
      setMatrix(data)
      setError('')
    } catch {
      setMatrix({ days: [], tasks: [], start: '', end: '' })
      setError('Unable to load routine tracker right now.')
    } finally {
      setLoading(false)
    }
  }, [startDate])

  useEffect(() => {
    void fetchMatrix()
  }, [fetchMatrix])

  useEffect(() => {
    const id = window.setInterval(() => setLiveNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const liveStartDate = toIsoDate(getYesterday(liveNow))
    if (liveStartDate !== startDate) {
      setStartDate(liveStartDate)
    }
  }, [liveNow, startDate])

  const addRoutineTask = async (event) => {
    event.preventDefault()
    if (!taskTitle.trim()) {
      return
    }

    try {
      setSaving(true)
      await api.post('/tasks/routines/', {
        title: taskTitle.trim(),
        routine_time: routineTime || null,
        is_active: true,
      })
      setTaskTitle('')
      setRoutineTime('')
      await fetchMatrix()
    } catch {
      setError('Unable to add routine task right now.')
    } finally {
      setSaving(false)
    }
  }

  const deleteRoutineTask = async (taskId) => {
    try {
      setDeleting(true)
      await api.delete(`/tasks/routines/${taskId}/`)
      setMatrix((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskId),
      }))
      setTaskPendingDelete(null)
    } catch {
      setError('Unable to delete routine task.')
    } finally {
      setDeleting(false)
    }
  }

  const requestDeleteRoutineTask = (task) => {
    setTaskPendingDelete(task)
  }

  const cancelDeleteRoutineTask = () => {
    if (deleting) {
      return
    }
    setTaskPendingDelete(null)
  }

  const moveRoutineTask = async (taskId, direction) => {
    try {
      await api.post(`/tasks/routines/${taskId}/move/`, { direction })
      await fetchMatrix()
    } catch {
      setError('Unable to change task order right now.')
    }
  }

  const updateRoutineAlertTime = (index, value) => {
    setRoutineAlertTimes((current) => current.map((time, currentIndex) => (currentIndex === index ? value : time)))
    setAlertMessage('')
  }

  const saveRoutineAlertSchedule = (event) => {
    event.preventDefault()
    const normalizedTimes = saveRoutineAlertTimes(routineAlertTimes)
    setRoutineAlertTimes(normalizedTimes)
    setAlertMessage(`Missed-task alerts saved for ${normalizedTimes.join(', ')}.`)
  }

  const resetRoutineAlertSchedule = () => {
    const defaultTimes = saveRoutineAlertTimes(DEFAULT_ROUTINE_ALERT_TIMES)
    setRoutineAlertTimes(defaultTimes)
    setAlertMessage('Missed-task alerts reset to 8:00 PM, 10:00 PM, and 11:00 PM.')
  }

  const toggleAlertSettings = () => {
    setIsAlertSettingsOpen((current) => !current)
  }

  const toggleCheck = async (taskId, day, currentDone) => {
    const todayIso = toIsoDate(new Date())
    if (day !== todayIso) {
      return
    }

    setMatrix((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }
        return {
          ...task,
          checks: {
            ...task.checks,
            [day]: !currentDone,
          },
        }
      }),
    }))

    try {
      await api.post(`/tasks/routines/${taskId}/check/`, {
        day,
        done: !currentDone,
      })
    } catch {
      setError('Unable to update checklist status.')
      await fetchMatrix()
    }
  }

  const todayIso = toIsoDate(liveNow)

  return (
    <section className="panel routine-shell">
      <div className="routine-toolbar">
        <div>
          <h2>Routine Tracker</h2>
          <p>Track habits by live day/date checklist from yesterday through next week only.</p>
          <small className="routine-live-now">Now: {liveNow.toLocaleString()} ,</small>
          <small className="routine-live-now"> Only today can be marked. Past and future dates are read-only.</small>
        </div>
        <div className="window-controls">
          <span className="routine-window-badge">Start: {startDate}</span>
          <span className="routine-window-badge">Range: 8 days (yesterday + next 7)</span>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="routine-layout">
        <aside className="routine-tasks-panel">
          <h3>Routine Tasks</h3>
          <section className="routine-alert-card">
            <div className="routine-alert-header">
              <div>
                <h4>Missed-task alerts</h4>
                <p>Send a browser notification for any unchecked routine task at the times below.</p>
              </div>
              <button
                type="button"
                className="routine-alert-toggle"
                onClick={toggleAlertSettings}
                aria-expanded={isAlertSettingsOpen}
                aria-label={isAlertSettingsOpen ? 'Hide missed-task alert settings' : 'Show missed-task alert settings'}
              >
                ⚙
              </button>
            </div>
            <p className="routine-alert-summary">Current schedule: {routineAlertTimes.map((time) => formatRoutineTime(time)).join(', ')}</p>
            {isAlertSettingsOpen && (
              <form className="routine-alert-form" onSubmit={saveRoutineAlertSchedule}>
                <div className="routine-alert-grid">
                  {routineAlertTimes.map((time, index) => (
                    <label key={`routine-alert-time-${index}`} className="routine-alert-field">
                      <span>{index === 0 ? 'First alert' : index === 1 ? 'Second alert' : 'Final alert'}</span>
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => updateRoutineAlertTime(index, event.target.value)}
                        required
                      />
                    </label>
                  ))}
                </div>
                <div className="routine-alert-actions">
                  <button type="submit" className="secondary-btn">
                    Save timings
                  </button>
                  <button type="button" className="secondary-btn" onClick={resetRoutineAlertSchedule}>
                    Use defaults
                  </button>
                </div>
              </form>
            )}
            <p className="routine-alert-note">Defaults are 8:00 PM, 10:00 PM, and 11:00 PM. These alerts share the app's notification permission.</p>
            {alertMessage && <p className="routine-alert-message">{alertMessage}</p>}
          </section>
          <form className="routine-add-form" onSubmit={addRoutineTask}>
            <input
              placeholder="Add a routine task"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              maxLength={160}
              required
            />
            <input
              type="time"
              value={routineTime}
              onChange={(event) => setRoutineTime(event.target.value)}
              aria-label="Routine time"
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add'}
            </button>
          </form>

          <ul className="routine-task-list">
            {loading && <li>Loading tasks...</li>}
            {!loading && matrix.tasks.length === 0 && <li>No routine tasks yet.</li>}
            {matrix.tasks.map((task) => (
              <li key={task.id}>
                <div className="routine-task-order-controls">
                  <button type="button" className="order-btn" onClick={() => moveRoutineTask(task.id, 'up')} aria-label={`Move ${task.title} up`}>
                    ↑
                  </button>
                  <button type="button" className="order-btn" onClick={() => moveRoutineTask(task.id, 'down')} aria-label={`Move ${task.title} down`}>
                    ↓
                  </button>
                </div>
                <div>
                  <strong>{task.title}</strong>
                  {task.routine_time && <span>{formatRoutineTime(task.routine_time)}</span>}
                </div>
                <button type="button" className="secondary-btn danger-btn" onClick={() => requestDeleteRoutineTask(task)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="routine-grid-wrap">
          <div className="routine-grid-scroll">
            <table className="routine-grid" aria-label="Routine checklist by day">
              <thead>
                <tr>
                  <th>Task</th>
                  {matrix.days.map((day) => {
                    const header = formatDayHeader(day)
                    return (
                      <th key={day} className={day === todayIso ? 'today-col' : ''}>
                        <span>{header.weekday}</span>
                        <small>{header.date}</small>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {matrix.tasks.map((task) => (
                  <tr key={task.id}>
                    <th>
                      <span>{task.title}</span>
                      {task.routine_time && <small>{formatRoutineTime(task.routine_time)}</small>}
                    </th>
                    {matrix.days.map((day) => {
                      const done = Boolean(task.checks?.[day])
                      const isFutureDay = day > todayIso
                      const isToday = day === todayIso
                      const label = done ? '✓' : isFutureDay ? 'Locked' : '✗'
                      const toneClass = isFutureDay ? 'future-lock' : done ? 'past-done' : 'past-miss'
                      return (
                        <td key={`${task.id}-${day}`} className={day === todayIso ? 'today-col' : ''}>
                          {isToday ? (
                            <button
                              type="button"
                              className={done ? 'check-toggle checked' : 'check-toggle'}
                              onClick={() => toggleCheck(task.id, day, done)}
                              aria-label={`${done ? 'Mark not done' : 'Mark done'} for ${task.title} on ${day}`}
                            >
                              {done ? 'Done' : 'Mark'}
                            </button>
                          ) : (
                            <span className={`check-readonly ${toneClass}`} aria-label={`Status ${label} for ${task.title} on ${day}`}>
                              {label}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {!loading && matrix.tasks.length === 0 && (
                  <tr>
                    <td colSpan={matrix.days.length}>Add routine tasks to start tracking day-wise completion.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {taskPendingDelete && (
        <div className="confirm-modal-backdrop" role="presentation" onClick={cancelDeleteRoutineTask}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="routine-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="routine-delete-title">Delete routine task?</h3>
            <p>
              Remove <strong>{taskPendingDelete.title}</strong> from your routine tracker?
            </p>
            <div className="confirm-modal-actions">
              <button type="button" className="secondary-btn" onClick={cancelDeleteRoutineTask} disabled={deleting}>
                Cancel
              </button>
              <button
                type="button"
                className="secondary-btn danger-btn"
                onClick={() => deleteRoutineTask(taskPendingDelete.id)}
                disabled={deleting}
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RoutineTrackerPage