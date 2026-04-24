import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const { data } = await api.post('/auth/token/', { username, password })
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      navigate(redirectTo, { replace: true })
    } catch {
      setError('Invalid credentials. Check your username and password.')
    }
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
      </form>
    </div>
  )
}

export default LoginPage
