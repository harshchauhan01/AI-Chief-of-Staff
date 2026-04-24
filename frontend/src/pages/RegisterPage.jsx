import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })
  const [error, setError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await api.post('/users/register/', form)
      navigate('/login')
    } catch (err) {
      const detail = err?.response?.data?.username?.[0] || err?.response?.data?.password?.[0]
      setError(detail || 'Registration failed. Check your details and try again.')
    }
  }

  return (
    <div className="center-card">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        <p>Sign up to get personalized planning recommendations.</p>
        <label htmlFor="first_name">First name</label>
        <input id="first_name" name="first_name" value={form.first_name} onChange={onChange} />
        <label htmlFor="last_name">Last name</label>
        <input id="last_name" name="last_name" value={form.last_name} onChange={onChange} />
        <label htmlFor="username">Username</label>
        <input id="username" name="username" value={form.username} onChange={onChange} required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={onChange} required />
        {error && <p className="error-text">{error}</p>}
        <button type="submit">Register</button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
