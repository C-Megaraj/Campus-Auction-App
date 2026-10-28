import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMyListings, cancelListing } from '../services/api'
import './Home.css'

export default function MyListings() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const loadListings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyListings()
      if (data && data.success) {
        setListings(data.listings || [])
      } else {
        setError(data?.message || 'Failed to retrieve your listings.')
      }
    } catch (err) {
      console.error('Error fetching my listings:', err)
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load your listings. Please verify the backend and MySQL are running.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const handleCancel = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the auction for "${title}"? This will close the auction and record it as cancelled.`
    )
    if (!confirmed) return

    setCancellingId(id)
    setActionNotice(null)

    try {
      const res = await cancelListing(id)
      if (res && res.success) {
        setActionNotice(`Auction "${title}" has been cancelled successfully.`)
        loadListings()
      } else {
        alert(res?.message || 'Failed to cancel listing.')
      }
    } catch (err) {
      console.error('Error cancelling listing:', err)
      alert(
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel listing. Please check marketplace rules.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Active</span>
      case 'closing_soon':
        return <span style={{ background: '#ffedd5', color: '#c2410c', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Closing Soon</span>
      case 'ended':
        return <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Ended</span>
      case 'sold':
        return <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Sold</span>
      case 'cancelled':
        return <span style={{ background: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>Cancelled</span>
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 4rem', textAlign: 'left' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>
            My Campus Listings
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text)', fontSize: '0.95rem' }}>
            Manage your active auctions, edit item details, or review closed listings
          </p>
        </div>

        <Link
          to="/auctions/create"
          className="btn-hero-primary"
          style={{ textDecoration: 'none', padding: '0.75rem 1.4rem' }}
        >
          ➕ List New Item
        </Link>
      </div>

      {actionNotice && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* ERROR CARD */}
      {error && (
        <div className="api-error-card">
          <div className="api-error-header">
            <span className="error-icon">⚠️</span>
            <h3>Unable to Load Your Listings</h3>
          </div>
          <p className="error-description">{error}</p>
          <div className="error-actions">
            <button type="button" className="btn-retry-api" onClick={loadListings}>
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && !error && (
        <div className="api-loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your listings from database...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && listings.length === 0 && (
        <div className="empty-results-card" style={{ padding: '3.5rem 1.5rem' }}>
          <span className="empty-icon">📦</span>
          <h3>You haven't listed any items yet</h3>
          <p>
            Declutter your dorm room or sell your semester textbooks to campus peers! It takes less than 60 seconds to create an auction.
          </p>
          <div className="empty-actions">
            <Link to="/auctions/create" className="btn-hero-primary">
              + List an Item for Auction
            </Link>
          </div>
        </div>
      )}

      {/* LISTINGS TABLE / CARDS */}
      {!loading && !error && listings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {listings.map((item) => {
            const isEditable = (item.status === 'active' || item.status === 'closing_soon') && new Date(item.closing_at).getTime() > Date.now()
            const isCancellable = isEditable

            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                {/* Visual + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px', flex: '1 1 300px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      background: 'var(--code-bg)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {item.primary_image_url ? (
                      <img
                        src={item.primary_image_url}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.8rem' }}>📦</span>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      {getStatusBadge(item.status)}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text)', background: 'var(--code-bg)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        {item.category_name}
                      </span>
                    </div>

                    <Link
                      to={`/auctions/${item.id}`}
                      style={{ textDecoration: 'none', color: 'var(--text-h)', fontWeight: 700, fontSize: '1.05rem' }}
                    >
                      {item.title}
                    </Link>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', fontSize: '0.82rem', color: 'var(--text)' }}>
                      <span>Condition: <strong>{item.condition}</strong></span>
                      <span>•</span>
                      <span>Closes: <strong>{new Date(item.closing_at).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Price & Bids */}
                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block' }}>Current Highest Bid</span>
                  <strong style={{ fontSize: '1.35rem', color: 'var(--text-h)' }}>
                    ${Number(item.current_bid).toFixed(2)}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)', display: 'block' }}>
                    {item.bids_count} {item.bids_count === 1 ? 'bid' : 'bids'} (starts at ${Number(item.starting_price).toFixed(2)})
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <Link
                    to={`/auctions/${item.id}`}
                    style={{
                      textDecoration: 'none',
                      background: 'var(--code-bg)',
                      color: 'var(--text-h)',
                      padding: '0.5rem 0.95rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    View
                  </Link>

                  {isEditable && (
                    <Link
                      to={`/auctions/${item.id}/edit`}
                      style={{
                        textDecoration: 'none',
                        background: 'var(--accent-bg)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                        padding: '0.5rem 0.95rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                      }}
                    >
                      ✏️ Edit
                    </Link>
                  )}

                  {isCancellable && (
                    <button
                      type="button"
                      disabled={cancellingId === item.id}
                      onClick={() => handleCancel(item.id, item.title)}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '0.5rem 0.95rem',
                        borderRadius: '8px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {cancellingId === item.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

