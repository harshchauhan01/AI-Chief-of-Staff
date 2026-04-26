import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'
import {
  createReminder,
  formatReminderDueAt,
  getNotificationPermission,
  getPendingReminders,
  loadReminders,
  requestNotificationPermission,
  reminderDueAt,
  saveReminders,
  showReminderNotification,
} from '../services/reminderService'
import { clearSession, getGuestProfile, isGuestMode } from '../services/guestSession'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/routine', label: 'Routine Tracker' },
  { to: '/daily-plan', label: 'Daily Plan' },
  { to: '/decision-helper', label: 'Decision Helper' },
  { to: '/bill-calculator', label: 'Bill Calculator' },
]

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const guestName = isGuestMode() ? getGuestProfile().name : ''
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installMessage, setInstallMessage] = useState('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [reminders, setReminders] = useState(() => loadReminders())
  const [reminderPermission, setReminderPermission] = useState(getNotificationPermission())
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderForm, setReminderForm] = useState({
    title: '',
    mode: 'exact',
    reminderAt: '',
    minutesFromNow: '15',
  })

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    saveReminders(reminders)
  }, [reminders])

  useEffect(() => {
    const processDueReminders = async () => {
      const now = Date.now()
      const dueReminders = reminders.filter(
        (reminder) => !reminder.triggeredAt && reminderDueAt(reminder) <= now,
      )

      if (dueReminders.length === 0) {
        return
      }

      let notificationsShown = 0
      for (const reminder of dueReminders) {
        const showedNotification = await showReminderNotification(reminder)
        if (showedNotification) {
          notificationsShown += 1
        }
      }

      setReminders((current) =>
        current.map((reminder) =>
          dueReminders.some((dueReminder) => dueReminder.id === reminder.id)
            ? { ...reminder, triggeredAt: new Date().toISOString() }
            : reminder,
        ),
      )

      if (notificationsShown > 0) {
        setReminderMessage(
          notificationsShown === 1
            ? 'Reminder notification sent.'
            : `${notificationsShown} reminder notifications sent.`,
        )
      } else if (reminderPermission !== 'granted') {
        setReminderMessage('Reminder saved. Enable notifications to receive alerts.')
      }
    }

    const nextPendingReminder = getPendingReminders(reminders)[0]
    const delay = nextPendingReminder
      ? Math.max(reminderDueAt(nextPendingReminder) - Date.now(), 1000)
      : null

    void processDueReminders()

    const timeoutId = delay ? window.setTimeout(() => void processDueReminders(), delay) : null
    const intervalId = window.setInterval(() => void processDueReminders(), 30000)

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void processDueReminders()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [reminderPermission, reminders])

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setInstallMessage('')
    }

    const onAppInstalled = () => {
      setInstallPrompt(null)
      setInstallMessage('Installed on this device.')
    }

    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileNavOpen])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileNavOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const closeMobileNav = () => setIsMobileNavOpen(false)

  const reminderPreview = getPendingReminders(reminders).slice(0, 3)

  const handleReminderFieldChange = (field, value) => {
    setReminderForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission()
    setReminderPermission(permission)

    if (permission === 'granted') {
      setReminderMessage('Notifications enabled for reminders.')
    } else if (permission === 'denied') {
      setReminderMessage('Notifications are blocked. Enable them in browser settings.')
    } else if (permission === 'unsupported') {
      setReminderMessage('This browser does not support notifications.')
    }
  }

  const handleCreateReminder = async (event) => {
    event.preventDefault()

    const title = reminderForm.title.trim()
    if (!title) {
      setReminderMessage('Please enter a reminder title.')
      return
    }

    if (reminderForm.mode === 'exact' && !reminderForm.reminderAt) {
      setReminderMessage('Pick a date and time for the reminder.')
      return
    }

    if (reminderForm.mode === 'delay') {
      const minutesValue = Number(reminderForm.minutesFromNow)
      if (!Number.isFinite(minutesValue) || minutesValue <= 0) {
        setReminderMessage('Enter a valid number of minutes.')
        return
      }
    }

    const reminder = createReminder(reminderForm)
    if (reminderDueAt(reminder) <= Date.now()) {
      setReminderMessage('Reminder time must be in the future.')
      return
    }

    const permission =
      reminderPermission === 'granted' ? reminderPermission : await requestNotificationPermission()
    setReminderPermission(permission)

    setReminders((current) => [...current, reminder])
    setReminderForm((current) => ({
      ...current,
      title: '',
      reminderAt: '',
    }))

    if (permission === 'granted') {
      setReminderMessage('Reminder saved and notifications are enabled.')
    } else {
      setReminderMessage('Reminder saved. Enable notifications from the sidebar to receive alerts.')
    }
  }

  const deleteReminder = (reminderId) => {
    setReminders((current) => current.filter((reminder) => reminder.id !== reminderId))
    setReminderMessage('Reminder removed.')
  }

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const choice = await installPrompt.userChoice
      setInstallMessage(
        choice.outcome === 'accepted'
          ? 'Installing now.'
          : 'Install dismissed. Open the browser menu and choose Add to Home Screen.',
      )
      setInstallPrompt(null)
      return
    }

    setInstallMessage('Use your browser menu and choose Add to Home Screen or Install app.')
  }

  const logout = () => {
    clearSession()
    setIsMobileNavOpen(false)
    navigate('/login')
  }

  return (
    <>
      <TopNav
        showMenuToggle
        isMenuOpen={isMobileNavOpen}
        onMenuToggle={() => setIsMobileNavOpen((open) => !open)}
      />
      {isMobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="mobile-sidebar-backdrop"
          onClick={closeMobileNav}
        />
      )}
      <div className="app-shell">
        <aside className={isMobileNavOpen ? 'sidebar mobile-open' : 'sidebar'}>
          <div className="sidebar-mobile-head">
            <h1 className="sidebar-brand">
              <img src="/orion-app-icon.svg" alt="" aria-hidden="true" className="sidebar-brand-icon" />
              Orion
            </h1>
            <button type="button" className="sidebar-close" onClick={closeMobileNav} aria-label="Close sidebar">
              Close
            </button>
          </div>
          <p className="sidebar-copy">Plan decisively, execute consistently, and review progress daily.</p>
          {guestName && <p className="sidebar-guest-pill">Guest: {guestName}</p>}
          <div className="sidebar-nav-wrap">
            <nav>
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={location.pathname === item.to ? 'nav-link active' : 'nav-link'}
                  onClick={closeMobileNav}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="sidebar-status-block">
            <div className={isOffline ? 'sidebar-status-pill offline' : 'sidebar-status-pill online'}>
              {isOffline ? 'Offline mode' : 'Online mode'}
            </div>
            <div
              className={
                reminderPermission === 'granted'
                  ? 'sidebar-status-pill reminder granted'
                  : reminderPermission === 'denied'
                    ? 'sidebar-status-pill reminder blocked'
                    : 'sidebar-status-pill reminder prompt'
              }
            >
              {reminderPermission === 'granted'
                ? 'Notifications enabled'
                : reminderPermission === 'denied'
                  ? 'Notifications blocked'
                  : reminderPermission === 'unsupported'
                    ? 'Notifications unsupported'
                    : 'Notifications available'}
            </div>
            <div className="sidebar-install-card">
              <div>
                <h2>Mobile app</h2>
                <p>Keep Orion on your home screen for quick access.</p>
              </div>
              <button type="button" className="sidebar-install-btn" onClick={handleInstallApp}>
                Install app
              </button>
              {installMessage && <p className="sidebar-install-note">{installMessage}</p>}
            </div>
            <div className="sidebar-reminder-card">
              <div className="sidebar-reminder-header">
                <div>
                  <h2>Reminders</h2>
                  <p>Schedule a reminder for a specific time or after a delay.</p>
                </div>
                <button type="button" className="sidebar-reminder-permission-btn" onClick={handleEnableNotifications}>
                  Enable
                </button>
              </div>

              <form className="sidebar-reminder-form" onSubmit={handleCreateReminder}>
                <input
                  type="text"
                  placeholder="Reminder title"
                  value={reminderForm.title}
                  onChange={(event) => handleReminderFieldChange('title', event.target.value)}
                  required
                />
                <select
                  value={reminderForm.mode}
                  onChange={(event) => handleReminderFieldChange('mode', event.target.value)}
                >
                  <option value="exact">At a specific time</option>
                  <option value="delay">After a delay</option>
                </select>
                {reminderForm.mode === 'exact' ? (
                  <input
                    type="datetime-local"
                    value={reminderForm.reminderAt}
                    onChange={(event) => handleReminderFieldChange('reminderAt', event.target.value)}
                  />
                ) : (
                  <input
                    type="number"
                    min="1"
                    placeholder="Minutes from now"
                    value={reminderForm.minutesFromNow}
                    onChange={(event) => handleReminderFieldChange('minutesFromNow', event.target.value)}
                  />
                )}
                <button type="submit" className="sidebar-reminder-submit-btn">
                  Add reminder
                </button>
              </form>

              {reminderMessage && <p className="sidebar-reminder-note">{reminderMessage}</p>}

              <div className="sidebar-reminder-list">
                {reminderPreview.length === 0 && <p className="sidebar-reminder-empty">No reminders yet.</p>}
                {reminderPreview.map((reminder) => (
                  <article key={reminder.id} className="sidebar-reminder-item">
                    <div>
                      <strong>{reminder.title}</strong>
                      <p>{formatReminderDueAt(reminder.dueAt)}</p>
                    </div>
                    <button
                      type="button"
                      className="sidebar-reminder-delete-btn"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </div>
            <div className="sidebar-footer">
              <button type="button" className="sidebar-logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default AppLayout
