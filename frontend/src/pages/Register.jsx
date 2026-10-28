import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errors = {}
    const nameTrimmed = form.fullName.trim()
    const emailTrimmed = form.email.trim()

    if (!nameTrimmed) {
      errors.fullName = 'Full name is required.'
    } else if (nameTrimmed.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.'
    }

    if (!emailTrimmed) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!form.password) {
      errors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
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
      await register({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setSuccessMessage('Account created successfully! Redirecting to campus auctions...')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 500)
    } catch (err) {
      console.error('Registration error:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please make sure the backend and MySQL database are running.'
      setServerError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-pill-badge">
            <span>🎓 Join Campus Marketplace</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join fellow students to buy, sell, and bid on campus essentials</p>
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
            <label className="auth-label" htmlFor="register-name">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">👤</span>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Jordan Smith"
                className={`auth-input ${fieldErrors.fullName ? 'has-error' : ''}`}
                value={form.fullName}
                onChange={handleChange('fullName')}
                disabled={loading}
              />
            </div>
            {fieldErrors.fullName && <p className="field-error-text">{fieldErrors.fullName}</p>}
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉️</span>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="student@campus.edu"
                className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
                value={form.email}
                onChange={handleChange('email')}
                disabled={loading}
              />
            </div>
            {fieldErrors.email && <p className="field-error-text">{fieldErrors.email}</p>}
            <p className="field-hint-text">Use your student or university email address.</p>
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
                value={form.password}
                onChange={handleChange('password')}
                disabled={loading}
              />
            </div>
            {fieldErrors.password && <p className="field-error-text">{fieldErrors.password}</p>}
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="register-confirm-password">
              Confirm Password
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`auth-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                disabled={loading}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <p className="field-error-text">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Creating account…</span>
              </>
            ) : (
              <span>Create Student Account</span>
            )}
          </button>
        </form>

        <div className="auth-notice-box">
          🛡️ Zero platform fees. Encrypted credentials. Exclusive peer-to-peer campus marketplace.
        </div>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  )
}
