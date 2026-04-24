import { Link, useLocation, useNavigate } from 'react-router-dom'

function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthed = Boolean(localStorage.getItem('accessToken'))

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  return (
    <header className="top-nav">
      <div className="brand-wrap">
        <div className="brand-dot" aria-hidden="true" />
        <div className="brand">Chief of Staff AI</div>
      </div>
      <nav className="top-actions">
        {isAuthed && (
          <Link to="/" className={location.pathname === '/' ? 'top-link active' : 'top-link'}>
            Overview
          </Link>
        )}
        {!isAuthed && <Link to="/login" className={location.pathname === '/login' ? 'top-link active' : 'top-link'}>Login</Link>}
        {!isAuthed && <Link to="/register" className={location.pathname === '/register' ? 'top-link active' : 'top-link'}>Register</Link>}
        {isAuthed && (
          <button type="button" className="top-link danger" onClick={logout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  )
}

export default TopNav
