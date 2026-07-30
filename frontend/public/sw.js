const CACHE_NAME = 'orion-shell-v2'
const APP_SHELL = ['/', '/manifest.webmanifest', '/orion-app-icon.svg', '/orion-wordmark.svg']

// Mirrored in src/services/quickAddNotification.js.
const QUICK_ADD_TAG = 'orion-quick-add'
const QUICK_ADD_STATE_CACHE = 'orion-quick-add-state:v1'
const QUICK_ADD_STATE_KEY = '/__orion-quick-add-enabled'

const isQuickAddEnabled = async () => {
  const cache = await caches.open(QUICK_ADD_STATE_CACHE)
  const match = await cache.match(QUICK_ADD_STATE_KEY)
  return Boolean(match)
}

const showQuickAddNotification = () =>
  self.registration.showNotification('Orion — Quick Add', {
    body: 'Tap to log an expense.',
    icon: '/orion-app-icon.svg?v=2',
    badge: '/orion-app-icon.svg?v=2',
    tag: QUICK_ADD_TAG,
    requireInteraction: true,
    silent: true,
    data: { url: '/quick-add' },
    actions: [{ action: 'quick-add', title: 'Add expense' }],
  })

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/')),
    )
    return
  }

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          }

          return networkResponse
        })
        .catch(() => caches.match('/'))
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl)
            } catch {
              // Ignore navigation errors (e.g. cross-origin) and just focus the window.
            }
          }
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})

// Keep the Quick Add notification pinned: if the user swipes it away (or it
// closes for any other reason) while still enabled, re-post it immediately.
// The only way to actually clear it is the in-app Disable action, which
// removes the QUICK_ADD_STATE_CACHE marker before closing the notification.
self.addEventListener('notificationclose', (event) => {
  if (event.notification.tag !== QUICK_ADD_TAG) {
    return
  }

  event.waitUntil(
    isQuickAddEnabled().then((enabled) => {
      if (enabled) {
        return showQuickAddNotification()
      }
      return undefined
    }),
  )
})