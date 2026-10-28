import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '5rem', margin: 0 }}>404</h1>
      <p style={{ color: 'var(--text)', marginBottom: '1.5rem' }}>Page not found</p>
      <Link to="/" style={{ color: 'var(--accent)' }}>← Back to Home</Link>
    </div>
  )
}

