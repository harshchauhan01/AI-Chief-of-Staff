import { getNotificationPermission, requestNotificationPermission } from './reminderService'

const QUICK_ADD_TAG = 'orion-quick-add'
const QUICK_ADD_ENABLED_KEY = 'orion-quick-add-notification:v1'
// Mirrored in public/sw.js — the service worker can't read localStorage, so it
// checks this Cache Storage marker to decide whether to re-post a dismissed
// Quick Add notification (pinning it until the user disables it in-app).
const QUICK_ADD_STATE_CACHE = 'orion-quick-add-state:v1'
const QUICK_ADD_STATE_KEY = '/__orion-quick-add-enabled'

const isBrowser = typeof window !== 'undefined'

const isEnabledFlag = () => isBrowser && localStorage.getItem(QUICK_ADD_ENABLED_KEY) === 'enabled'

const setPersistentEnabledFlag = async (enabled) => {
  if (!isBrowser || !('caches' in window)) {
    return
  }

  try {
    const cache = await caches.open(QUICK_ADD_STATE_CACHE)
    if (enabled) {
      await cache.put(QUICK_ADD_STATE_KEY, new Response('1'))
    } else {
      await cache.delete(QUICK_ADD_STATE_KEY)
    }
  } catch {
    // Best-effort — the pin behavior degrades gracefully if Cache Storage is unavailable.
  }
}

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
    await setPersistentEnabledFlag(true)
  }
  return { enabled: shown, permission }
}

export const disableQuickAddNotification = async () => {
  if (isBrowser) {
    localStorage.removeItem(QUICK_ADD_ENABLED_KEY)
  }

  // Clear the marker before closing the notification so the service worker's
  // notificationclose handler sees it's disabled and doesn't re-post it.
  await setPersistentEnabledFlag(false)

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

const WATCH_INTERVAL_MS = 15000

// The service worker's notificationclose handler re-posts instantly when it
// fires, but that event isn't guaranteed on every browser/OS. This is the
// backup layer: while the app is open, periodically (and on regaining focus)
// check whether the pinned notification is still showing and bring it back
// if it's gone. Call the returned function to stop watching (e.g. on unmount).
export const startQuickAddNotificationWatch = () => {
  if (!isBrowser || !('serviceWorker' in navigator)) {
    return () => {}
  }

  const ensurePosted = async () => {
    if (!isEnabledFlag() || getNotificationPermission() !== 'granted') {
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const notifications = await registration.getNotifications({ tag: QUICK_ADD_TAG })
      if (notifications.length === 0) {
        await postNotification()
      }
    } catch {
      // Best-effort — the next tick or visibility change will try again.
    }
  }

  void ensurePosted()
  const intervalId = window.setInterval(() => void ensurePosted(), WATCH_INTERVAL_MS)

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void ensurePosted()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
