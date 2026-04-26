const REMINDERS_STORAGE_KEY = 'orion-reminders:v1'

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
    icon: '/app-icon.svg',
    badge: '/app-icon.svg',
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