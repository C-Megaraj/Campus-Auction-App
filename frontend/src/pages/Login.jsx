import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Origin to redirect back to after successful login
  const from = location.state?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errors = {}
    const emailTrimmed = form.email.trim()

    if (!emailTrimmed) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!form.password) {
      errors.password = 'Password is required.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccessMessage('')

    if (!validate()) return

    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
      setSuccessMessage('Welcome back! Redirecting...')
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 400)
    } catch (err) {
      console.error('Login error:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to the login server. Please make sure the backend and database are running.'
      setServerError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-pill-badge">
            <span>🎓 Student Marketplace</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your campus student account to bid and list items</p>
        </div>

        {serverError && (
          <div className="auth-error-banner">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-success-banner">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-email">
              Campus Email
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉️</span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="student@campus.edu"
                className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value })
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                }}
                disabled={loading}
              />
            </div>
            {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                }}
                disabled={loading}
              />
            </div>
            {fieldErrors.password && <p className="field-error-text">{fieldErrors.password}</p>}
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In to Account</span>
            )}
          </button>
        </form>

        <div className="auth-notice-box">
          🔒 Secure authentication with encrypted passwords and HttpOnly session cookies.
        </div>

        <div className="auth-footer">
          Don't have a student account yet?{' '}
          <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  )
}
