const AUTH_MODE_KEY = 'orion-auth-mode'
const GUEST_NAME_KEY = 'orion-guest-name'
const GUEST_ID_KEY = 'orion-guest-id'
const GUEST_ACCESS_TOKEN = 'guest-local-session'

const hasWindow = typeof window !== 'undefined'

const randomGuestId = () => {
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `guest-${Date.now()}-${randomPart}`
}

export const getAuthMode = () => {
  if (!hasWindow) {
    return 'user'
  }
  return localStorage.getItem(AUTH_MODE_KEY) || 'user'
}

export const isGuestMode = () => getAuthMode() === 'guest'

export const getGuestProfile = () => {
  if (!hasWindow) {
    return { id: '', name: '' }
  }

  return {
    id: localStorage.getItem(GUEST_ID_KEY) || '',
    name: localStorage.getItem(GUEST_NAME_KEY) || '',
  }
}

export const startGuestSession = (name) => {
  if (!hasWindow) {
    return
  }

  const nextName = String(name || '').trim()
  const existingId = localStorage.getItem(GUEST_ID_KEY)
  const guestId = existingId || randomGuestId()

  localStorage.setItem(AUTH_MODE_KEY, 'guest')
  localStorage.setItem(GUEST_ID_KEY, guestId)
  localStorage.setItem(GUEST_NAME_KEY, nextName || 'Guest')

  localStorage.setItem('accessToken', GUEST_ACCESS_TOKEN)
  localStorage.removeItem('refreshToken')
}

export const startUserSession = ({ access, refresh }) => {
  if (!hasWindow) {
    return
  }

  localStorage.setItem(AUTH_MODE_KEY, 'user')
  localStorage.removeItem(GUEST_ID_KEY)
  localStorage.removeItem(GUEST_NAME_KEY)

  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
}

export const clearSession = () => {
  if (!hasWindow) {
    return
  }

  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem(AUTH_MODE_KEY)
  localStorage.removeItem(GUEST_ID_KEY)
  localStorage.removeItem(GUEST_NAME_KEY)
}

export const isAuthenticatedSession = () => {
  if (!hasWindow) {
    return false
  }

  if (isGuestMode()) {
    return Boolean(localStorage.getItem(GUEST_ID_KEY))
  }

  return Boolean(localStorage.getItem('accessToken'))
}

export const guestSessionKeys = {
  AUTH_MODE_KEY,
  GUEST_NAME_KEY,
  GUEST_ID_KEY,
}
