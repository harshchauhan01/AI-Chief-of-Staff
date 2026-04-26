import axios from 'axios'
import { getGuestProfile, isGuestMode } from '../services/guestSession'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
})

const API_CACHE_PREFIX = 'orion-api-cache:v1:'
const GUEST_DATA_PREFIX = 'orion-guest-data:v1:'

let refreshPromise = null

const isBrowser = typeof window !== 'undefined'

const scoreTask = (task) => {
  const minutes = Math.max(Number(task.estimated_minutes) || 30, 1)
  const effortFactor = 1 / minutes
  return Number(((Number(task.urgency_score) * 0.45) + (Number(task.impact_score) * 0.45) + (effortFactor * 300 * 0.1)).toFixed(2))
}

const todayIso = () => {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const isoDateShift = (seedIso, offsetDays) => {
  const date = new Date(`${seedIso}T00:00:00`)
  date.setDate(date.getDate() + offsetDays)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const isMeetingTitle = (title) => {
  const value = String(title || '').toLowerCase()
  return ['meeting', 'call', 'sync', 'standup', '1:1', 'demo'].some((keyword) => value.includes(keyword))
}

const normalizeDeadline = (daysUntilDeadline) => {
  if (daysUntilDeadline <= 0) {
    return 5
  }
  if (daysUntilDeadline === 1) {
    return 4
  }
  if (daysUntilDeadline <= 3) {
    return 3
  }
  if (daysUntilDeadline <= 7) {
    return 2
  }
  return 1
}

const normalizeEnergyFit = (currentEnergy, requiredEnergy) => {
  const difference = Math.abs(currentEnergy - requiredEnergy)
  return Math.max(1, 5 - difference)
}

const defaultGuestStore = () => ({
  goals: [],
  tasks: [],
  routineTasks: [],
  routineChecks: [],
  nightReviews: {},
  counters: {
    goal: 1,
    task: 1,
    routineTask: 1,
    check: 1,
  },
})

const getGuestDataKey = () => {
  const profile = getGuestProfile()
  if (!profile.id) {
    return ''
  }
  return `${GUEST_DATA_PREFIX}${profile.id}`
}

const readGuestStore = () => {
  if (!isBrowser) {
    return defaultGuestStore()
  }

  const storageKey = getGuestDataKey()
  if (!storageKey) {
    return defaultGuestStore()
  }

  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return defaultGuestStore()
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      ...defaultGuestStore(),
      ...parsed,
      counters: {
        ...defaultGuestStore().counters,
        ...(parsed.counters || {}),
      },
    }
  } catch {
    return defaultGuestStore()
  }
}

const writeGuestStore = (payload) => {
  if (!isBrowser) {
    return
  }

  const storageKey = getGuestDataKey()
  if (!storageKey) {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify(payload))
}

const nextId = (store, counterName) => {
  const next = Number(store.counters[counterName] || 1)
  store.counters[counterName] = next + 1
  return next
}

const nowIso = () => new Date().toISOString()

const serializeTask = (task) => ({
  ...task,
  priority_score: scoreTask(task),
})

const currentRoutineStreak = (store, taskId) => {
  const days = store.routineChecks
    .filter((item) => item.routine_task === taskId && item.done)
    .map((item) => item.day)
    .sort((a, b) => b.localeCompare(a))

  if (days.length === 0) {
    return 0
  }

  let streak = 0
  let cursor = days[0]

  for (const day of days) {
    if (day === cursor) {
      streak += 1
      cursor = isoDateShift(cursor, -1)
      continue
    }

    if (day < cursor) {
      break
    }
  }

  return streak
}

const buildRoutineMatrix = (store, params) => {
  const today = todayIso()
  const start = params?.start || isoDateShift(today, -1)
  const requestedDays = Number.parseInt(String(params?.days || 14), 10)
  const daysCount = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 7), 31) : 14

  const days = Array.from({ length: daysCount }, (_, index) => isoDateShift(start, index))
  const end = days[days.length - 1]

  const tasks = [...store.routineTasks]
    .filter((task) => task.is_active)
    .sort((a, b) => a.order - b.order)

  const taskRows = tasks.map((task) => {
    const checks = {}
    for (const day of days) {
      const check = store.routineChecks.find((item) => item.routine_task === task.id && item.day === day)
      checks[day] = Boolean(check?.done)
    }

    return {
      id: task.id,
      title: task.title,
      routine_time: task.routine_time,
      order: task.order,
      current_streak: currentRoutineStreak(store, task.id),
      checks,
    }
  })

  return {
    start,
    end,
    days,
    tasks: taskRows,
  }
}

const buildRoutineProgress = (store, params) => {
  const requestedDays = Number.parseInt(String(params?.days || 30), 10)
  const daysCount = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 7), 180) : 30
  const end = todayIso()
  const start = isoDateShift(end, -(daysCount - 1))
  const days = Array.from({ length: daysCount }, (_, index) => isoDateShift(start, index))
  const tasks = [...store.routineTasks]
    .filter((task) => task.is_active)
    .sort((a, b) => a.order - b.order)

  const totalTasks = tasks.length
  const daily = days.map((day) => {
    const doneCount = tasks.filter((task) =>
      store.routineChecks.some((item) => item.routine_task === task.id && item.day === day && item.done),
    ).length

    const rate = totalTasks > 0 ? Number(((doneCount / totalTasks) * 100).toFixed(2)) : 0
    return { day, done: doneCount, total: totalTasks, rate }
  })

  const taskStats = tasks.map((task) => {
    const doneDays = days.filter((day) =>
      store.routineChecks.some((item) => item.routine_task === task.id && item.day === day && item.done),
    ).length

    return {
      id: task.id,
      title: task.title,
      done_days: doneDays,
      total_days: daysCount,
      completion_rate: Number(((doneDays / daysCount) * 100).toFixed(2)),
      current_streak: currentRoutineStreak(store, task.id),
    }
  })

  const overallRate = daysCount > 0
    ? Number((daily.reduce((sum, item) => sum + item.rate, 0) / daysCount).toFixed(2))
    : 0

  const bestDay = daily.length > 0
    ? [...daily].sort((a, b) => b.rate - a.rate)[0]
    : null

  return {
    start,
    end,
    days: daysCount,
    overall_rate: overallRate,
    best_day: bestDay,
    daily,
    tasks: taskStats.sort((a, b) => b.completion_rate - a.completion_rate),
  }
}

const buildMorningBrief = (store) => {
  const today = todayIso()
  const pendingTasks = store.tasks.filter((task) => task.status !== 'done')
  const topTaskPriorities = [...pendingTasks]
    .map((task) => serializeTask(task))
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3)

  const meetings = store.tasks
    .filter((task) => task.due_date === today && isMeetingTitle(task.title))
    .map((task) => serializeTask(task))
    .slice(0, 5)

  const plannedMinutes = topTaskPriorities.reduce((sum, task) => sum + (task.estimated_minutes || 45), 0)
  const overdueCount = pendingTasks.filter((task) => task.due_date && task.due_date < today).length
  const dueTodayCount = pendingTasks.filter((task) => task.due_date === today).length

  const risks = []
  if (plannedMinutes > 360) {
    risks.push('Too much planned today. Your top priorities exceed 6 hours.')
  }
  if (overdueCount >= 3) {
    risks.push('Backlog risk is high. You have 3 or more overdue tasks.')
  }
  if (dueTodayCount >= 6) {
    risks.push('Calendar pressure is building. Consider reducing scope for today.')
  }
  if (risks.length === 0) {
    risks.push('Plan looks balanced. Protect focus blocks and execute in order.')
  }

  const loadPercent = plannedMinutes ? Math.min(100, Math.round((plannedMinutes / 420) * 100)) : 0
  const loadTone = loadPercent < 45 ? 'light' : loadPercent < 75 ? 'balanced' : 'heavy'

  return {
    day: today,
    summary: 'Start with the highest priority task, then clear key routines before context switches.',
    top_priorities: topTaskPriorities,
    meetings,
    risks,
    capacity: {
      planned_minutes: plannedMinutes,
      focus_capacity_minutes: 420,
      load_percent: loadPercent,
      load_tone: loadTone,
    },
  }
}

const createGuestResponse = (config, data, status = 200) => ({
  data,
  status,
  statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
  headers: {},
  config,
  request: null,
})

const createGuestError = (config, status, detail) => {
  const error = new Error(detail)
  error.config = config
  error.response = {
    status,
    data: { detail },
    config,
    headers: {},
    statusText: 'Error',
  }
  return error
}

const normalizePath = (url) => {
  const trimmed = String(url || '').trim()
  if (!trimmed) {
    return '/'
  }

  let pathname = trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    pathname = new URL(trimmed).pathname
  }

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`
  }

  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(4)
  }

  if (pathname === '/api') {
    return '/'
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }

  return pathname
}

const parseRequestUrl = (config) => {
  const directPath = normalizePath(config.url)
  if (directPath !== '/') {
    return directPath
  }

  const base = normalizePath(api.defaults.baseURL || '')
  return base === '/' ? '/' : base
}

const handleGuestRequest = (config) => {
  const method = (config.method || 'get').toLowerCase()
  const path = parseRequestUrl(config)
  const params = config.params || {}
  const payload = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {})
  const store = readGuestStore()
  const now = nowIso()

  if (method === 'get' && path === '/goals') {
    return createGuestResponse(config, [...store.goals].sort((a, b) => b.priority - a.priority))
  }

  if (method === 'post' && path === '/goals') {
    const goal = {
      id: nextId(store, 'goal'),
      title: String(payload.title || '').trim(),
      description: payload.description || '',
      target_date: payload.target_date || null,
      priority: Number(payload.priority || 3),
      status: payload.status || 'active',
      created_at: now,
      updated_at: now,
    }
    store.goals.push(goal)
    writeGuestStore(store)
    return createGuestResponse(config, goal, 201)
  }

  const goalIdMatch = path.match(/^\/goals\/(\d+)$/)
  if (goalIdMatch) {
    const goalId = Number(goalIdMatch[1])
    const goalIndex = store.goals.findIndex((goal) => goal.id === goalId)

    if (goalIndex < 0) {
      throw createGuestError(config, 404, 'Goal not found.')
    }

    if (method === 'patch') {
      store.goals[goalIndex] = {
        ...store.goals[goalIndex],
        ...payload,
        updated_at: now,
      }
      writeGuestStore(store)
      return createGuestResponse(config, store.goals[goalIndex])
    }

    if (method === 'delete') {
      store.goals = store.goals.filter((goal) => goal.id !== goalId)
      store.tasks = store.tasks.map((task) => (task.goal === goalId ? { ...task, goal: null, updated_at: now } : task))
      writeGuestStore(store)
      return createGuestResponse(config, null, 204)
    }
  }

  if (method === 'get' && path === '/tasks') {
    return createGuestResponse(config, store.tasks.map((task) => serializeTask(task)))
  }

  if (method === 'post' && path === '/tasks') {
    const task = {
      id: nextId(store, 'task'),
      goal: payload.goal || null,
      title: String(payload.title || '').trim(),
      description: payload.description || '',
      due_date: payload.due_date || null,
      estimated_minutes: payload.estimated_minutes || null,
      impact_score: Number(payload.impact_score || 3),
      urgency_score: Number(payload.urgency_score || 3),
      status: payload.status || 'todo',
      created_at: now,
      updated_at: now,
    }
    store.tasks.unshift(task)
    writeGuestStore(store)
    return createGuestResponse(config, serializeTask(task), 201)
  }

  const taskIdMatch = path.match(/^\/tasks\/(\d+)$/)
  if (taskIdMatch) {
    const taskId = Number(taskIdMatch[1])
    const taskIndex = store.tasks.findIndex((task) => task.id === taskId)

    if (taskIndex < 0) {
      throw createGuestError(config, 404, 'Task not found.')
    }

    if (method === 'patch') {
      store.tasks[taskIndex] = {
        ...store.tasks[taskIndex],
        ...payload,
        updated_at: now,
      }
      writeGuestStore(store)
      return createGuestResponse(config, serializeTask(store.tasks[taskIndex]))
    }

    if (method === 'delete') {
      store.tasks = store.tasks.filter((task) => task.id !== taskId)
      writeGuestStore(store)
      return createGuestResponse(config, null, 204)
    }
  }

  if (method === 'get' && path === '/tasks/routines/matrix') {
    return createGuestResponse(config, buildRoutineMatrix(store, params))
  }

  if (method === 'get' && path === '/tasks/routines/progress') {
    return createGuestResponse(config, buildRoutineProgress(store, params))
  }

  if (method === 'post' && path === '/tasks/routines') {
    const maxOrder = store.routineTasks.reduce((max, task) => Math.max(max, Number(task.order || 0)), 0)
    const routineTask = {
      id: nextId(store, 'routineTask'),
      title: String(payload.title || '').trim(),
      routine_time: payload.routine_time || null,
      order: maxOrder + 1,
      is_active: payload.is_active !== false,
      created_at: now,
      updated_at: now,
    }
    store.routineTasks.push(routineTask)
    writeGuestStore(store)

    return createGuestResponse(config, {
      ...routineTask,
      current_streak: currentRoutineStreak(store, routineTask.id),
    }, 201)
  }

  const routineMoveMatch = path.match(/^\/tasks\/routines\/(\d+)\/move$/)
  if (routineMoveMatch && method === 'post') {
    const taskId = Number(routineMoveMatch[1])
    const direction = payload.direction
    const ordered = [...store.routineTasks].sort((a, b) => a.order - b.order)
    const currentIndex = ordered.findIndex((task) => task.id === taskId)

    if (currentIndex < 0) {
      throw createGuestError(config, 404, 'Routine task not found.')
    }

    const neighborIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (neighborIndex >= 0 && neighborIndex < ordered.length) {
      const currentTask = ordered[currentIndex]
      const neighborTask = ordered[neighborIndex]
      const tempOrder = currentTask.order
      currentTask.order = neighborTask.order
      neighborTask.order = tempOrder
      currentTask.updated_at = now
      neighborTask.updated_at = now
    }

    store.routineTasks = ordered
    writeGuestStore(store)

    const saved = store.routineTasks.find((task) => task.id === taskId)
    return createGuestResponse(config, {
      ...saved,
      current_streak: currentRoutineStreak(store, taskId),
    })
  }

  const routineCheckMatch = path.match(/^\/tasks\/routines\/(\d+)\/check$/)
  if (routineCheckMatch && method === 'post') {
    const taskId = Number(routineCheckMatch[1])
    const targetDay = String(payload.day || '').trim()

    if (!targetDay) {
      throw createGuestError(config, 400, 'day is required.')
    }

    const taskExists = store.routineTasks.some((task) => task.id === taskId)
    if (!taskExists) {
      throw createGuestError(config, 404, 'Routine task not found.')
    }

    const checkIndex = store.routineChecks.findIndex(
      (item) => item.routine_task === taskId && item.day === targetDay,
    )

    if (checkIndex < 0) {
      const created = {
        id: nextId(store, 'check'),
        routine_task: taskId,
        day: targetDay,
        done: Boolean(payload.done),
        created_at: now,
        updated_at: now,
      }
      store.routineChecks.push(created)
      writeGuestStore(store)
      return createGuestResponse(config, created)
    }

    const nextDone = typeof payload.done === 'boolean'
      ? payload.done
      : !store.routineChecks[checkIndex].done

    store.routineChecks[checkIndex] = {
      ...store.routineChecks[checkIndex],
      done: nextDone,
      updated_at: now,
    }

    writeGuestStore(store)
    return createGuestResponse(config, store.routineChecks[checkIndex])
  }

  const routineTaskMatch = path.match(/^\/tasks\/routines\/(\d+)$/)
  if (routineTaskMatch && method === 'delete') {
    const taskId = Number(routineTaskMatch[1])
    store.routineTasks = store.routineTasks.filter((task) => task.id !== taskId)
    store.routineChecks = store.routineChecks.filter((check) => check.routine_task !== taskId)
    writeGuestStore(store)
    return createGuestResponse(config, null, 204)
  }

  if (method === 'get' && path === '/planning/daily') {
    const brief = buildMorningBrief(store)
    return createGuestResponse(config, {
      summary: brief.summary,
      top_tasks: brief.top_priorities,
    })
  }

  if (method === 'get' && path === '/planning/daily-brief') {
    const brief = buildMorningBrief(store)
    return createGuestResponse(config, brief)
  }

  if (method === 'get' && path === '/planning/night-review') {
    const day = String(params?.day || todayIso())
    const review = store.nightReviews[day] || {
      day,
      wins: '',
      energy: 3,
      items: [],
      updated_at: null,
    }

    const doneTasks = store.tasks
      .filter((task) => task.status === 'done' && String(task.updated_at || '').startsWith(day))
      .map((task) => ({ ...serializeTask(task), source: 'task' }))
      .slice(0, 10)

    const doneRoutine = store.routineChecks
      .filter((check) => check.day === day && check.done)
      .map((check) => {
        const routineTask = store.routineTasks.find((task) => task.id === check.routine_task)
        return {
          id: `routine-${check.routine_task}`,
          title: routineTask?.title || 'Routine task',
          status: 'done',
          source: 'routine',
          day,
        }
      })
      .slice(0, 10)

    const slippedCandidates = store.tasks
      .filter((task) => task.status !== 'done' && task.due_date && task.due_date <= day)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .map((task) => serializeTask(task))
      .slice(0, 10)

    return createGuestResponse(config, {
      day,
      done_candidates: [...doneTasks, ...doneRoutine],
      slipped_candidates: slippedCandidates,
      review,
    })
  }

  if (method === 'post' && path === '/planning/night-review') {
    const day = String(payload.day || todayIso())
    const energy = Number(payload.energy || 3)
    const items = Array.isArray(payload.items) ? payload.items : []

    const reviewItems = items
      .map((item) => {
        const taskId = Number(item.task)
        const task = store.tasks.find((current) => current.id === taskId)

        if (!task || !item.outcome) {
          return null
        }

        return {
          task: taskId,
          task_title: task.title,
          outcome: item.outcome,
          reason: String(item.reason || '').slice(0, 280),
        }
      })
      .filter(Boolean)

    const savedReview = {
      day,
      wins: String(payload.wins || '').slice(0, 1500),
      energy: Number.isFinite(energy) ? Math.max(1, Math.min(5, energy)) : 3,
      items: reviewItems,
      updated_at: now,
    }

    store.nightReviews[day] = savedReview
    writeGuestStore(store)

    return createGuestResponse(config, {
      saved: true,
      review: savedReview,
    })
  }

  if (method === 'post' && path === '/assistant/quick-decision') {
    const currentEnergy = Number(payload.current_energy || 3)
    const options = Array.isArray(payload.options) ? payload.options : []

    if (options.length < 2 || options.length > 3) {
      throw createGuestError(config, 400, 'options must include 2 or 3 choices.')
    }

    const scoredOptions = options.map((option, index) => {
      const label = String(option.label || '').trim()
      if (!label) {
        throw createGuestError(config, 400, `option at index ${index} requires a non-empty label.`)
      }

      const importance = Number(option.importance)
      const daysUntilDeadline = Number(option.days_until_deadline)
      const requiredEnergy = Number(option.required_energy)

      const deadlineScore = normalizeDeadline(daysUntilDeadline)
      const energyFitScore = normalizeEnergyFit(currentEnergy, requiredEnergy)
      const weightedScore = Number(((deadlineScore * 0.4) + (importance * 0.4) + (energyFitScore * 0.2)).toFixed(2))

      return {
        label,
        days_until_deadline: daysUntilDeadline,
        importance,
        required_energy: requiredEnergy,
        score_breakdown: {
          deadline: deadlineScore,
          importance,
          energy_fit: energyFitScore,
        },
        weighted_score: weightedScore,
      }
    })

    const rankedOptions = [...scoredOptions].sort((a, b) => b.weighted_score - a.weighted_score)

    return createGuestResponse(config, {
      best_choice: rankedOptions[0],
      ranked_options: rankedOptions,
      weights: {
        deadline: 0.4,
        importance: 0.4,
        energy_fit: 0.2,
      },
    })
  }

  throw createGuestError(config, 404, 'This action is not available in guest mode yet.')
}

const guestAdapter = async (config) => handleGuestRequest(config)

const isAuthEndpoint = (url) => {
  const path = normalizePath(url)
  return path.includes('/auth/token')
}

const getCacheKey = (config) => {
  if (!isBrowser) {
    return ''
  }

  const method = (config.method || 'get').toUpperCase()
  return `${API_CACHE_PREFIX}${method}:${api.getUri(config)}`
}

const readCachedResponse = (config) => {
  if (!isBrowser || (config.method || 'get').toLowerCase() !== 'get') {
    return null
  }

  const cacheKey = getCacheKey(config)
  const rawResponse = localStorage.getItem(cacheKey)

  if (!rawResponse) {
    return null
  }

  try {
    const cachedPayload = JSON.parse(rawResponse)
    return {
      data: cachedPayload.data,
      status: cachedPayload.status,
      statusText: cachedPayload.statusText,
      headers: cachedPayload.headers || {},
      config,
      request: null,
    }
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

const writeCachedResponse = (response) => {
  if (!isBrowser) {
    return
  }

  const method = (response.config?.method || 'get').toLowerCase()
  if (method !== 'get') {
    return
  }

  const cacheKey = getCacheKey(response.config)
  if (!cacheKey) {
    return
  }

  const payload = {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem(cacheKey, JSON.stringify(payload))
}

const clearAuthTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise
  }

  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  refreshPromise = axios
    .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh: refreshToken })
    .then(({ data }) => {
      localStorage.setItem('accessToken', data.access)
      return data.access
    })
    .catch((error) => {
      clearAuthTokens()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

api.interceptors.request.use((config) => {
  if (isGuestMode() && !isAuthEndpoint(config.url)) {
    config.adapter = guestAdapter
    delete config.headers.Authorization
    return config
  }

  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use((response) => {
  writeCachedResponse(response)
  return response
}, async (error) => {
  const originalRequest = error.config
  const statusCode = error.response?.status

  if (originalRequest && (!error.response || !navigator.onLine)) {
    const cachedResponse = readCachedResponse(originalRequest)
    if (cachedResponse) {
      return Promise.resolve(cachedResponse)
    }
  }

  if (!originalRequest || statusCode !== 401 || originalRequest._retry) {
    return Promise.reject(error)
  }

  if (
    originalRequest.url?.includes('/auth/token/') ||
    originalRequest.url?.includes('/auth/token/refresh/')
  ) {
    clearAuthTokens()
    return Promise.reject(error)
  }

  try {
    originalRequest._retry = true
    const newAccessToken = await refreshAccessToken()
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newAccessToken}`,
    }
    return api(originalRequest)
  } catch (refreshError) {
    return Promise.reject(refreshError)
  }
})

export default api
