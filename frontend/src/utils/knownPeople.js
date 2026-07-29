// A small shared "who do I usually split with" directory — fed by both the
// Bill Calculator and the Money Tracker's split-expense field, so a name typed
// in one shows up as a suggestion in the other.
const KNOWN_PEOPLE_KEY = 'orion-known-people:v1'
const isBrowser = typeof window !== 'undefined'

export const loadKnownPeople = () => {
  if (!isBrowser) {
    return []
  }

  try {
    const raw = localStorage.getItem(KNOWN_PEOPLE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((name) => typeof name === 'string' && name.trim()) : []
  } catch {
    return []
  }
}

export const rememberKnownPerson = (name) => {
  if (!isBrowser) {
    return
  }

  const trimmed = String(name || '').trim()
  if (!trimmed || trimmed.toLowerCase() === 'you') {
    return
  }

  const current = loadKnownPeople()
  if (current.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
    return
  }

  localStorage.setItem(KNOWN_PEOPLE_KEY, JSON.stringify([...current, trimmed]))
}
