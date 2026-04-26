import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import TopNav from '../components/TopNav'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/routine', label: 'Routine Tracker' },
  { to: '/daily-plan', label: 'Daily Plan' },
  { to: '/decision-helper', label: 'Decision Helper' },
]

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installMessage, setInstallMessage] = useState('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

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
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
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
            <h1>Command Hub</h1>
            <button type="button" className="sidebar-close" onClick={closeMobileNav} aria-label="Close sidebar">
              Close
            </button>
          </div>
          <p className="sidebar-copy">Plan decisively, execute consistently, and review progress daily.</p>
          <div className="sidebar-status-block">
            <div className={isOffline ? 'sidebar-status-pill offline' : 'sidebar-status-pill online'}>
              {isOffline ? 'Offline mode' : 'Online mode'}
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
          </div>
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
