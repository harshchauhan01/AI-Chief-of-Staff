import { useOutletContext } from 'react-router-dom'
import { formatReminderDueAt, getPendingReminders } from '../services/reminderService'

function SettingsPage() {
  const {
    isOffline,
    reminderPermission,
    handleEnableNotifications,
    installMessage,
    handleInstallApp,
    reminders,
    reminderForm,
    handleReminderFieldChange,
    handleCreateReminder,
    reminderMessage,
    deleteReminder,
  } = useOutletContext()

  const pendingReminders = getPendingReminders(reminders)

  return (
    <section className="panel settings-shell">
      <div className="money-header">
        <div>
          <h2>Settings</h2>
          <p>Connection status, notifications, the mobile app, and reminders all live here.</p>
        </div>
      </div>

      <div className="settings-status-row">
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
      </div>

      <article className="sidebar-install-card">
        <div>
          <h2>Mobile app</h2>
          <p>Keep Orion on your home screen for quick access.</p>
        </div>
        <button type="button" className="sidebar-install-btn" onClick={handleInstallApp}>
          Install app
        </button>
        {installMessage && <p className="sidebar-install-note">{installMessage}</p>}
      </article>

      <article className="sidebar-reminder-card">
        <div className="sidebar-reminder-header">
          <div>
            <h2>Reminders</h2>
            <p>Schedule a reminder for a specific time or after a delay.</p>
          </div>
          <button type="button" className="sidebar-reminder-permission-btn" onClick={handleEnableNotifications}>
            Enable notifications
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
          <select value={reminderForm.mode} onChange={(event) => handleReminderFieldChange('mode', event.target.value)}>
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
          {pendingReminders.length === 0 && <p className="sidebar-reminder-empty">No reminders yet.</p>}
          {pendingReminders.map((reminder) => (
            <article key={reminder.id} className="sidebar-reminder-item">
              <div>
                <strong>{reminder.title}</strong>
                <p>{formatReminderDueAt(reminder.dueAt)}</p>
              </div>
              <button type="button" className="sidebar-reminder-delete-btn" onClick={() => deleteReminder(reminder.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      </article>
    </section>
  )
}

export default SettingsPage
