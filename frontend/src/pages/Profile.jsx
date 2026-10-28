import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (!user) return null

  const verificationStatus = user.student_verification_status || 'unverified'
  const isVerified = verificationStatus === 'verified'

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '720px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>
            Student Profile
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text)', fontSize: '0.95rem' }}>
            Manage your campus marketplace identity and account settings
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '0.55rem 1.15rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Sign Out
        </button>
      </div>

      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              border: '2px solid var(--accent-border)',
            }}
          >
            👤
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-h)' }}>
                {user.full_name || user.name}
              </h2>
              {isVerified && (
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                  }}
                >
                  ✓ Verified Student
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text)', fontSize: '0.9rem' }}>
              {user.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Student ID / User #
            </span>
            <strong style={{ color: 'var(--text-h)', fontSize: '1rem' }}>
              #{user.id}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verification Status
            </span>
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.2rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: isVerified ? '#15803d' : '#b45309',
                background: isVerified ? '#f0fdf4' : '#fef3c7',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Created
            </span>
            <strong style={{ color: 'var(--text-h)', fontSize: '0.95rem' }}>
              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Campus Member'}
            </strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link
          to="/auctions/create"
          className="btn-hero-primary"
          style={{ textDecoration: 'none' }}
        >
          ➕ List an Item for Auction
        </Link>
        <Link
          to="/watchlist"
          className="btn-hero-secondary"
          style={{ textDecoration: 'none', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-h)' }}
        >
          ❤️ View Watchlist
        </Link>
      </div>
    </div>
  )
}
