import { getNotificationPermission, requestNotificationPermission } from './reminderService'

const QUICK_ADD_TAG = 'orion-quick-add'
const QUICK_ADD_ENABLED_KEY = 'orion-quick-add-notification:v1'

const isBrowser = typeof window !== 'undefined'

const isEnabledFlag = () => isBrowser && localStorage.getItem(QUICK_ADD_ENABLED_KEY) === 'enabled'

const postNotification = async () => {
  if (!isBrowser || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Orion — Quick Add', {
      body: 'Tap to log an expense.',
      icon: '/orion-app-icon.svg?v=2',
      badge: '/orion-app-icon.svg?v=2',
      tag: QUICK_ADD_TAG,
      requireInteraction: true,
      silent: true,
      data: { url: '/quick-add' },
      actions: [{ action: 'quick-add', title: 'Add expense' }],
    })
    return true
  } catch {
    return false
  }
}

export const getQuickAddNotificationStatus = () => ({
  enabled: isEnabledFlag(),
  permission: getNotificationPermission(),
})

export const enableQuickAddNotification = async () => {
  const permission =
    getNotificationPermission() === 'granted' ? 'granted' : await requestNotificationPermission()

  if (permission !== 'granted') {
    return { enabled: false, permission }
  }

  const shown = await postNotification()
  if (shown && isBrowser) {
    localStorage.setItem(QUICK_ADD_ENABLED_KEY, 'enabled')
  }
  return { enabled: shown, permission }
}

export const disableQuickAddNotification = async () => {
  if (isBrowser) {
    localStorage.removeItem(QUICK_ADD_ENABLED_KEY)
  }

  if (!isBrowser || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const notifications = await registration.getNotifications({ tag: QUICK_ADD_TAG })
    notifications.forEach((notification) => notification.close())
  } catch {
    // Best-effort — nothing else to do if the service worker isn't available.
  }
}

// Called opportunistically (e.g. on page mount) to re-post the notification if
// the user previously enabled it — cheap and idempotent thanks to the shared tag.
export const refreshQuickAddNotificationIfEnabled = async () => {
  if (!isEnabledFlag() || getNotificationPermission() !== 'granted') {
    return
  }
  await postNotification()
}
