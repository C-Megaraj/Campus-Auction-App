import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Create Account</h2>
        {error && <p className="error-msg">{error}</p>}
        <input type="text" placeholder="Full Name" required value={form.name} onChange={set('name')} />
        <input type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
        <input type="password" placeholder="Password (min 6 chars)" required value={form.password} onChange={set('password')} minLength={6} />
        <input type="text" placeholder="College / University" value={form.college} onChange={set('college')} />
        <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</button>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  )
}

