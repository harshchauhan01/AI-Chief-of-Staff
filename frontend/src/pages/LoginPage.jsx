import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import {
  getGuestProfile,
  isAuthenticatedSession,
  startGuestSession,
  startUserSession,
} from '../services/guestSession'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [guestName, setGuestName] = useState(() => getGuestProfile().name)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticatedSession()) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const { data } = await api.post('/auth/token/', { username, password })
      startUserSession({ access: data.access, refresh: data.refresh })
      navigate(redirectTo, { replace: true })
    } catch {
      setError('Invalid credentials. Check your username and password.')
    }
  }

  const handleGuestAccess = () => {
    setError('')
    const name = guestName.trim()
    if (!name) {
      setError('Please enter your name to continue as a guest.')
      return
    }

    startGuestSession(name)
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="center-card">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>Sign in</h2>
        <p>Use your Django user credentials.</p>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit">Login</button>
        <div className="guest-access-block">
          <p>Or continue without login</p>
          <div className="guest-access-row">
            <input
              id="guest_name"
              placeholder="Your name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
            <button type="button" className="secondary-btn" onClick={handleGuestAccess}>
              Use as guest
            </button>
          </div>
        </div>
        <p className="auth-switch-row">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
