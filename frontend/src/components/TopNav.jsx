import { Link, useLocation } from 'react-router-dom'
import { isAuthenticatedSession } from '../services/guestSession'

function TopNav({ showMenuToggle = false, isMenuOpen = false, onMenuToggle = () => {} }) {
  const location = useLocation()
  const isAuthed = isAuthenticatedSession()

  return (
    <header className="top-nav">
      <div className="brand-wrap">
        <img src="/orion-wordmark.svg" alt="Orion" className="brand-logo" />
      </div>
      {!isAuthed && (
        <nav className="top-actions">
          <Link to="/login" className={location.pathname === '/login' ? 'top-link active' : 'top-link'}>
            Login
          </Link>
          <Link to="/register" className={location.pathname === '/register' ? 'top-link active' : 'top-link'}>
            Register
          </Link>
        </nav>
      )}
      {showMenuToggle && (
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          onClick={onMenuToggle}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      )}
    </header>
  )
}

export default TopNav
