const REMINDERS_STORAGE_KEY = 'orion-reminders:v1'
const ROUTINE_ALERT_TIMES_STORAGE_KEY = 'orion-routine-alert-times:v1'
const ROUTINE_ALERT_HISTORY_STORAGE_KEY = 'orion-routine-alert-history:v1'
export const DEFAULT_ROUTINE_ALERT_TIMES = ['20:00', '22:00', '23:00']

const isBrowser = typeof window !== 'undefined'

const supportsNotifications = () => isBrowser && 'Notification' in window

const createReminderId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeReminder = (item) => {
  if (!item || typeof item !== 'object') {
    return null
  }

  if (!item.id || !item.title || !item.dueAt) {
    return null
  }

  const dueAt = new Date(item.dueAt)
  if (Number.isNaN(dueAt.getTime())) {
    return null
  }

  return {
    id: String(item.id),
    title: String(item.title).trim(),
    dueAt: dueAt.toISOString(),
    createdAt: item.createdAt || new Date().toISOString(),
    triggeredAt: item.triggeredAt || null,
    mode: item.mode === 'delay' ? 'delay' : 'exact',
    sourceValue: item.sourceValue || '',
  }
}

const normalizeRoutineAlertTime = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const normalizeRoutineAlertTimes = (times) => {
  const candidateTimes = Array.isArray(times) ? times : []
  const normalizedTimes = []

  for (const time of candidateTimes) {
    const normalizedTime = normalizeRoutineAlertTime(time)
    if (normalizedTime && !normalizedTimes.includes(normalizedTime)) {
      normalizedTimes.push(normalizedTime)
    }
  }

  for (const defaultTime of DEFAULT_ROUTINE_ALERT_TIMES) {
    if (normalizedTimes.length >= 3) {
      break
    }

    if (!normalizedTimes.includes(defaultTime)) {
      normalizedTimes.push(defaultTime)
    }
  }

  return normalizedTimes.slice(0, 3)
}

const normalizeRoutineAlertHistory = (history) => {
  if (!history || typeof history !== 'object') {
    return { sent: [] }
  }

  const sent = Array.isArray(history.sent) ? history.sent.map(String).filter(Boolean) : []
  return {
    sent: [...new Set(sent)],
  }
}

const timeValueToMinutes = (value) => {
  const normalizedTime = normalizeRoutineAlertTime(value)
  if (!normalizedTime) {
    return null
  }

  const [hourPart, minutePart] = normalizedTime.split(':')
  return Number(hourPart) * 60 + Number(minutePart)
}

const formatTimeLabel = (value) => {
  const normalizedTime = normalizeRoutineAlertTime(value)
  if (!normalizedTime) {
    return ''
  }

  const [hourPart, minutePart] = normalizedTime.split(':')
  const hour = Number(hourPart)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = ((hour + 11) % 12) + 1
  return `${displayHour}:${minutePart} ${suffix}`
}

const summarizeTaskTitles = (tasks) => {
  const titles = tasks.map((task) => String(task.title || '').trim()).filter(Boolean)

  if (titles.length <= 3) {
    return titles.join(', ')
  }

  return `${titles.slice(0, 3).join(', ')} and ${titles.length - 3} more`
}

const createRoutineAlertKey = (day, timeValue, taskId) => `${day}|${timeValue}|${taskId}`

export const loadReminders = () => {
  if (!isBrowser) {
    return []
  }

  try {
    const rawReminders = localStorage.getItem(REMINDERS_STORAGE_KEY)
    if (!rawReminders) {
      return []
    }

    const parsedReminders = JSON.parse(rawReminders)
    if (!Array.isArray(parsedReminders)) {
      return []
    }

    return parsedReminders.map(normalizeReminder).filter(Boolean)
  } catch {
    localStorage.removeItem(REMINDERS_STORAGE_KEY)
    return []
  }
}

export const saveReminders = (reminders) => {
  if (!isBrowser) {
    return
  }

  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders))
}

export const loadRoutineAlertTimes = () => {
  if (!isBrowser) {
    return [...DEFAULT_ROUTINE_ALERT_TIMES]
  }

  try {
    const rawTimes = localStorage.getItem(ROUTINE_ALERT_TIMES_STORAGE_KEY)
    if (!rawTimes) {
      return [...DEFAULT_ROUTINE_ALERT_TIMES]
    }

    return normalizeRoutineAlertTimes(JSON.parse(rawTimes))
  } catch {
    localStorage.removeItem(ROUTINE_ALERT_TIMES_STORAGE_KEY)
    return [...DEFAULT_ROUTINE_ALERT_TIMES]
  }
}

export const saveRoutineAlertTimes = (times) => {
  const normalizedTimes = normalizeRoutineAlertTimes(times)

  if (!isBrowser) {
    return normalizedTimes
  }

  localStorage.setItem(ROUTINE_ALERT_TIMES_STORAGE_KEY, JSON.stringify(normalizedTimes))
  return normalizedTimes
}

export const loadRoutineAlertHistory = () => {
  if (!isBrowser) {
    return { sent: [] }
  }

  try {
    const rawHistory = localStorage.getItem(ROUTINE_ALERT_HISTORY_STORAGE_KEY)
    if (!rawHistory) {
      return { sent: [] }
    }

    return normalizeRoutineAlertHistory(JSON.parse(rawHistory))
  } catch {
    localStorage.removeItem(ROUTINE_ALERT_HISTORY_STORAGE_KEY)
    return { sent: [] }
  }
}

export const saveRoutineAlertHistory = (history) => {
  const normalizedHistory = normalizeRoutineAlertHistory(history)

  if (!isBrowser) {
    return normalizedHistory
  }

  localStorage.setItem(ROUTINE_ALERT_HISTORY_STORAGE_KEY, JSON.stringify(normalizedHistory))
  return normalizedHistory
}

export const createReminder = ({ title, mode, reminderAt, minutesFromNow }) => {
  const createdAt = new Date().toISOString()
  const dueAt =
    mode === 'delay'
      ? new Date(Date.now() + Number(minutesFromNow) * 60 * 1000).toISOString()
      : new Date(reminderAt).toISOString()

  return {
    id: createReminderId(),
    title: title.trim(),
    dueAt,
    createdAt,
    triggeredAt: null,
    mode,
    sourceValue: mode === 'delay' ? String(minutesFromNow) : reminderAt,
  }
}

export const getPendingReminders = (reminders) => {
  return [...reminders]
    .filter((reminder) => !reminder.triggeredAt)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export const reminderDueAt = (reminder) => new Date(reminder.dueAt).getTime()

export const formatReminderDueAt = (isoValue) => {
  const date = new Date(isoValue)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const getNotificationPermission = () => {
  if (!supportsNotifications()) {
    return 'unsupported'
  }

  return Notification.permission
}

export const requestNotificationPermission = async () => {
  if (!supportsNotifications()) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  return Notification.requestPermission()
}

export const showReminderNotification = async (reminder) => {
  if (!supportsNotifications() || Notification.permission !== 'granted') {
    return false
  }

  const options = {
    body: `Reminder: ${reminder.title}`,
    icon: '/orion-app-icon.svg?v=2',
    badge: '/orion-app-icon.svg?v=2',
    tag: `orion-reminder-${reminder.id}`,
    renotify: true,
    data: {
      reminderId: reminder.id,
      url: '/',
    },
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Orion reminder', options)
      return true
    }

    new Notification('Orion reminder', options)
    return true
  } catch {
    return false
  }
}

export const getDueRoutineAlerts = ({ matrix, times, history, now = new Date() }) => {
  const normalizedTimes = normalizeRoutineAlertTimes(times)
  const normalizedHistory = normalizeRoutineAlertHistory(history)
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const tasks = Array.isArray(matrix?.tasks) ? matrix.tasks : []

  return normalizedTimes
    .map((timeValue) => {
      const dueMinutes = timeValueToMinutes(timeValue)
      if (dueMinutes === null || currentMinutes < dueMinutes) {
        return null
      }

      const slotKey = `${dayKey}|${timeValue}`
      const pendingTasks = tasks.filter((task) => {
        const taskKey = createRoutineAlertKey(dayKey, timeValue, task.id)
        return !task.checks?.[dayKey] && !normalizedHistory.sent.includes(taskKey)
      })

      if (pendingTasks.length === 0) {
        return null
      }

      return {
        day: dayKey,
        timeValue,
        timeLabel: formatTimeLabel(timeValue),
        slotKey,
        pendingTasks,
        historyKeys: pendingTasks.map((task) => createRoutineAlertKey(dayKey, timeValue, task.id)),
      }
    })
    .filter(Boolean)
}

export const markRoutineAlertsSent = (history, alerts) => {
  const normalizedHistory = normalizeRoutineAlertHistory(history)
  const sent = new Set(normalizedHistory.sent)

  for (const alert of alerts) {
    for (const historyKey of alert.historyKeys || []) {
      sent.add(historyKey)
    }
  }

  return {
    sent: Array.from(sent),
  }
}

export const showRoutineAlertNotification = async (alert) => {
  if (!supportsNotifications() || Notification.permission !== 'granted') {
    return false
  }

  const taskCount = alert.pendingTasks.length
  const taskSummary = summarizeTaskTitles(alert.pendingTasks)
  const body =
    taskCount === 1
      ? `${alert.timeLabel}: ${taskSummary} is still unchecked today.`
      : `${alert.timeLabel}: ${taskSummary} are still unchecked today.`

  const options = {
    body,
    icon: '/orion-app-icon.svg?v=2',
    badge: '/orion-app-icon.svg?v=2',
    tag: `orion-routine-alert-${alert.slotKey}`,
    renotify: true,
    data: {
      url: '/routine',
    },
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Routine tasks still open', options)
      return true
    }

    new Notification('Routine tasks still open', options)
    return true
  } catch {
    return false
  }
}