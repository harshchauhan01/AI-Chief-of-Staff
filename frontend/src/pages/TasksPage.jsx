import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'

const initialForm = {
  title: '',
  goal: '',
  due_date: '',
  estimated_minutes: '',
  impact_score: 3,
  urgency_score: 3,
}

const statusFlow = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

const statusLabel = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const getPriorityScore = (task) => {
  if (typeof task.priority_score === 'number') {
    return task.priority_score
  }
  const minutes = Math.max(Number(task.estimated_minutes) || 30, 1)
  const effortFactor = 1 / minutes
  return Number(((task.urgency_score * 0.45) + (task.impact_score * 0.45) + (effortFactor * 300 * 0.1)).toFixed(2))
}

function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(initialForm)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortMode, setSortMode] = useState('priority')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTasks = async () => {
    const { data } = await api.get('/tasks/')
    setTasks(data)
  }

  const loadGoals = async () => {
    const { data } = await api.get('/goals/')
    setGoals(data)
  }

  const initializePage = useCallback(async () => {
    setError('')
    setIsLoading(true)
    const [tasksResult, goalsResult] = await Promise.allSettled([loadTasks(), loadGoals()])
    if (tasksResult.status === 'rejected') {
      setTasks([])
      setError('Unable to load tasks right now.')
    }
    if (goalsResult.status === 'rejected') {
      setGoals([])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void initializePage()
  }, [initializePage])

  const createTask = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/tasks/', {
        title: form.title,
        status: 'todo',
        goal: form.goal || null,
        due_date: form.due_date || null,
        estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
        impact_score: Number(form.impact_score),
        urgency_score: Number(form.urgency_score),
      })
      setForm(initialForm)
      await loadTasks()
    } catch {
      setError('Unable to create task. Check your inputs and try again.')
    }
  }

  const updateTaskStatus = async (task) => {
    setError('')
    try {
      const nextStatus = statusFlow[task.status] || 'todo'
      await api.patch(`/tasks/${task.id}/`, { status: nextStatus })
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item))
      )
    } catch {
      setError('Unable to update task status right now.')
    }
  }

  const deleteTask = async (taskId) => {
    setError('')
    try {
      await api.delete(`/tasks/${taskId}/`)
      setTasks((current) => current.filter((task) => task.id !== taskId))
    } catch {
      setError('Unable to delete task right now.')
    }
  }

  const visibleTasks = useMemo(() => {
    const filtered =
      statusFilter === 'all' ? tasks : tasks.filter((task) => task.status === statusFilter)

    return [...filtered].sort((a, b) => {
      if (sortMode === 'priority') {
        return getPriorityScore(b) - getPriorityScore(a)
      }
      if (sortMode === 'due') {
        if (!a.due_date && !b.due_date) {
          return 0
        }
        if (!a.due_date) {
          return 1
        }
        if (!b.due_date) {
          return -1
        }
        return a.due_date.localeCompare(b.due_date)
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [sortMode, statusFilter, tasks])

  const stats = useMemo(() => {
    const todo = tasks.filter((task) => task.status === 'todo').length
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length
    const done = tasks.filter((task) => task.status === 'done').length
    return { todo, inProgress, done }
  }, [tasks])

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="panel">
      <h2>Tasks</h2>

      <div className="stat-grid task-stats">
        <div className="stat-card">
          <h3>To Do</h3>
          <p>{stats.todo}</p>
        </div>
        <div className="stat-card">
          <h3>In Progress</h3>
          <p>{stats.inProgress}</p>
        </div>
        <div className="stat-card">
          <h3>Done</h3>
          <p>{stats.done}</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={createTask}>
        <input
          placeholder="Task title"
          value={form.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          required
        />
        <select value={form.goal} onChange={(e) => handleFieldChange('goal', e.target.value)}>
          <option value="">No goal</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.due_date}
          onChange={(e) => handleFieldChange('due_date', e.target.value)}
        />
        <input
          type="number"
          min="1"
          placeholder="Mins"
          value={form.estimated_minutes}
          onChange={(e) => handleFieldChange('estimated_minutes', e.target.value)}
        />
        <label className="score-input">
          Impact
          <input
            type="number"
            min="1"
            max="5"
            value={form.impact_score}
            onChange={(e) => handleFieldChange('impact_score', e.target.value)}
          />
        </label>
        <label className="score-input">
          Urgency
          <input
            type="number"
            min="1"
            max="5"
            value={form.urgency_score}
            onChange={(e) => handleFieldChange('urgency_score', e.target.value)}
          />
        </label>
        <button type="submit">Add</button>
      </form>

      <div className="toolbar-row">
        <div className="pill-group">
          <button
            type="button"
            className={statusFilter === 'all' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={statusFilter === 'todo' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setStatusFilter('todo')}
          >
            To Do
          </button>
          <button
            type="button"
            className={statusFilter === 'in_progress' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </button>
          <button
            type="button"
            className={statusFilter === 'done' ? 'pill-btn active' : 'pill-btn'}
            onClick={() => setStatusFilter('done')}
          >
            Done
          </button>
        </div>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
          <option value="priority">Sort: Priority</option>
          <option value="due">Sort: Due Date</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      <ul className="item-list">
        {isLoading && <li>Loading tasks...</li>}
        {visibleTasks.map((task) => (
          <li key={task.id} className={task.status === 'done' ? 'task-row done' : 'task-row'}>
            <div>
              <strong>{task.title}</strong>
              <span>
                {statusLabel[task.status] || task.status} | Score: {getPriorityScore(task)}
              </span>
              {task.due_date && <span>Due: {task.due_date}</span>}
            </div>
            <div className="task-actions">
              <button type="button" className="secondary-btn" onClick={() => updateTaskStatus(task)}>
                {task.status === 'todo' && 'Start'}
                {task.status === 'in_progress' && 'Complete'}
                {task.status === 'done' && 'Reopen'}
              </button>
              <button
                type="button"
                className="secondary-btn danger-btn"
                onClick={() => deleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!isLoading && visibleTasks.length === 0 && <li>No tasks for this view yet.</li>}
      </ul>
    </section>
  )
}

export default TasksPage
