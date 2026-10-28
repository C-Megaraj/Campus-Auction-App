import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAuctionById } from '../utils/mockAuctions'
import { fetchListingById, cancelListing } from '../services/api'
import { useWatchlist } from '../context/WatchlistContext'
import { useAuth } from '../context/AuthContext'
import './AuctionDetail.css'

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recent'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return String(dateString)
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSecs < 60) return 'Just now'
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return `${Math.floor(diffSecs / 86400)}d ago`
}

export default function AuctionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isWatched, toggleWatchlist } = useWatchlist()

  // Data fetching states
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNotFound, setIsNotFound] = useState(false)

  // State for active photo gallery selection
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // State for ticking live countdown
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // State for future version bidding notice
  const [biddingNotice, setBiddingNotice] = useState(null)
  const [customBidAmount, setCustomBidAmount] = useState('')

  // Fetch listing by ID from API
  const loadListing = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsNotFound(false)

    try {
      const data = await fetchListingById(id)
      if (data && data.success && data.listing) {
        setAuction(data.listing)
      } else {
        setIsNotFound(true)
      }
    } catch (err) {
      console.error('Error fetching listing details:', err)
      if (err.response?.status === 404) {
        // Check if it exists in mock / local storage auctions as a fallback
        const mockFallback = getAuctionById(id)
        if (mockFallback) {
          setAuction(mockFallback)
        } else {
          setIsNotFound(true)
        }
      } else {
        // Network or server error: check if mock has it or show error
        const mockFallback = getAuctionById(id)
        if (mockFallback) {
          setAuction(mockFallback)
        } else {
          setError(
            err.response?.data?.message ||
            err.message ||
            'Unable to connect to the backend server. Please verify the Express API and MySQL database are running.'
          )
        }
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadListing()
  }, [loadListing])

  // Real-time ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // If loading, show clean loading state
  if (loading) {
    return (
      <div className="auction-detail-container">
        <nav className="detail-navigation-bar">
          <button onClick={() => navigate('/')} className="btn-back-nav">
            <span className="back-arrow">←</span>
            <span>Back to Auctions</span>
          </button>
        </nav>
        <div className="api-loading-state" style={{ margin: '3rem auto', maxWidth: '600px' }}>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading auction details from database...</p>
        </div>
      </div>
    )
  }

  // If server error occurred and no fallback found
  if (error && !auction) {
    return (
      <div className="auction-detail-container not-found-wrapper">
        <div className="api-error-card" style={{ maxWidth: '600px', margin: '3rem auto' }}>
          <div className="api-error-header">
            <span className="error-icon">⚠️</span>
            <h3>Unable to Load Auction</h3>
          </div>
          <p className="error-description">{error}</p>
          <div className="error-actions">
            <button type="button" className="btn-retry-api" onClick={loadListing}>
              🔄 Retry Connection
            </button>
            <button onClick={() => navigate('/')} className="btn-back-secondary">
              ← Back to Auctions
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If auction not found, show friendly 404 card with back button
  if (isNotFound || !auction) {
    return (
      <div className="auction-detail-container not-found-wrapper">
        <div className="not-found-card">
          <span className="not-found-icon">🔎</span>
          <h2>Auction Not Found</h2>
          <p>The auction item you are looking for (ID: {id}) does not exist in the database or may have been removed.</p>
          <button onClick={() => navigate('/')} className="btn-back-home">
            ← Back to Auctions
          </button>
        </div>
      </div>
    )
  }

  const watched = isWatched(auction.id)

  // Calculate live formatted remaining time
  let totalSeconds = 0
  let closingDateObj = null

  if (auction.closing_at) {
    closingDateObj = new Date(auction.closing_at)
    totalSeconds = Math.floor((closingDateObj.getTime() - Date.now()) / 1000)
  } else if (typeof auction.initialMinutesLeft === 'number') {
    closingDateObj = new Date(Date.now() + auction.initialMinutesLeft * 60 * 1000)
    totalSeconds = (auction.initialMinutesLeft * 60) - secondsElapsed
  } else {
    closingDateObj = new Date()
    totalSeconds = 0
  }

  const isEnded = totalSeconds <= 0 || auction.status === 'ended' || auction.status === 'sold' || auction.status === 'closed'
  const isUrgent = !isEnded && totalSeconds < 3600

  const days = Math.floor(Math.max(0, totalSeconds) / 86400)
  const hours = Math.floor((Math.max(0, totalSeconds) % 86400) / 3600)
  const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60)
  const seconds = Math.max(0, totalSeconds) % 60

  const formattedClosingDate = closingDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedClosingTime = closingDateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Normalize prices & increments
  const currentBid = Number(auction.current_bid ?? auction.currentBid ?? auction.starting_price ?? auction.startingBid ?? 0)
  const startingBid = Number(auction.starting_price ?? auction.startingBid ?? 0)
  const minIncrement = Number(auction.minimum_bid_increment ?? auction.minIncrement ?? 1)
  const bidsCount = Number(auction.bids_count ?? auction.bidsCount ?? (auction.bids?.length || 0))
  const nextMinimumBid = currentBid + minIncrement

  const categoryName = auction.category_name || auction.categoryName || 'Item'

  // Normalize Seller details
  const sellerObj = typeof auction.seller === 'object' && auction.seller !== null
    ? {
        name: auction.seller.name || 'Campus Student',
        major: auction.seller.major || 'Undergraduate Student',
        gradYear: auction.seller.gradYear || "'25",
        rating: auction.seller.rating || '4.9',
        reviewsCount: auction.seller.reviewsCount || 15,
        verified: auction.seller.verification_status === 'verified' || Boolean(auction.seller.verified),
        pickupSpot: auction.seller.pickupSpot || auction.campusLocation || 'Student Center & Library Quad',
      }
    : {
        name: String(auction.seller || 'Campus Student'),
        major: 'Undergraduate Student',
        gradYear: "'25",
        rating: '4.9',
        reviewsCount: 15,
        verified: true,
        pickupSpot: auction.campusLocation || 'Student Center & Library Quad',
      }

  // Normalize Photos
  const defaultIcon = categoryName.toLowerCase().includes('book')
    ? '📚'
    : categoryName.toLowerCase().includes('electr')
    ? '💻'
    : categoryName.toLowerCase().includes('cycl')
    ? '🚲'
    : '📦'

  let photos = []
  if (Array.isArray(auction.images) && auction.images.length > 0) {
    photos = auction.images.map((img, idx) => ({
      id: img.id || `img-${idx}`,
      url: img.image_url,
      label: img.is_primary ? 'Primary View' : `Photo #${idx + 1}`,
      icon: defaultIcon,
      bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    }))
  } else if (Array.isArray(auction.photos) && auction.photos.length > 0) {
    photos = auction.photos
  } else {
    photos = [
      {
        id: 'p1',
        url: auction.primary_image_url || null,
        label: 'Primary Item View',
        icon: auction.icon || defaultIcon,
        bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      },
    ]
  }
  const activePhoto = photos[activePhotoIndex] || photos[0]

  // Normalize Bids
  const bids = Array.isArray(auction.bids)
    ? auction.bids.map((b, idx) => ({
        id: b.id || `b-${idx}`,
        bidderName: b.bidder_name || b.bidderName || `Student Bidder`,
        amount: Number(b.amount),
        timeAgo: b.timeAgo || formatTimeAgo(b.created_at),
        isWinning: b.is_winning !== undefined ? Boolean(b.is_winning) : (b.isWinning !== undefined ? Boolean(b.isWinning) : idx === 0),
      }))
    : []

  // Handler for Place Bid button
  const handlePlaceBid = (e) => {
    e.preventDefault()
    setBiddingNotice(
      `Bidding will be available in a future version! Live bidding and campus escrow payments are scheduled for the next release milestone.`
    )
  }

  return (
    <div className="auction-detail-container">
      {/* 7. TOP BREADCRUMB & BACK BUTTON */}
      <nav className="detail-navigation-bar">
        <button onClick={() => navigate('/')} className="btn-back-nav">
          <span className="back-arrow">←</span>
          <span>Back to Auctions</span>
        </button>

        <div className="breadcrumb-trail">
          <Link to="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-link">{categoryName}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" title={auction.title}>
            {auction.title}
          </span>
        </div>

        {/* WATCHLIST TOGGLE IN NAV */}
        <button
          type="button"
          className={`btn-detail-watchlist ${watched ? 'active' : ''}`}
          onClick={() => toggleWatchlist(auction.id)}
          title={watched ? 'Remove from Watchlist' : 'Save to Watchlist'}
        >
          <span>{watched ? '❤️ Saved to Watchlist' : '🤍 Save to Watchlist'}</span>
        </button>
      </nav>

      {/* SELLER OWNER CONTROLS BANNER */}
      {user && (user.id === (auction.seller?.id || auction.seller_id)) && (
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong style={{ color: 'var(--text-h)' }}>👑 You are the seller of this auction</strong>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text)', fontSize: '0.88rem' }}>
              Status: <strong>{auction.status}</strong> • You can modify listing details or cancel the auction if eligible.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {(auction.status === 'active' || auction.status === 'closing_soon') && (
              <Link to={`/auctions/${auction.id}/edit`} className="btn-hero-primary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.88rem' }}>
                ✏️ Edit Listing
              </Link>
            )}
          </div>
        </div>
      )}

      {/* FUTURE BIDDING NOTIFICATION BANNER */}
      {biddingNotice && (
        <div className="bidding-alert-banner">
          <div className="alert-content">
            <span className="alert-bell-icon">🔔</span>
            <div className="alert-text-group">
              <strong>Preview Notice</strong>
              <p>{biddingNotice}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-dismiss-alert"
            onClick={() => setBiddingNotice(null)}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="detail-grid-layout">
        {/* LEFT COLUMN: PHOTOS & DESCRIPTION */}
        <section className="detail-left-column">
          {/* 2. PHOTOS GALLERY VIEWER */}
          <div className="photo-showcase-card">
            {/* Main Active Photo */}
            <div
              className="main-photo-stage"
              style={{ background: activePhoto.bg || 'var(--code-bg)' }}
            >
              {activePhoto.url ? (
                <img
                  src={activePhoto.url}
                  alt={auction.title}
                  className="main-photo-stage-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex'
                    }
                  }}
                />
              ) : null}

              <div
                className="photo-hero-graphic"
                style={activePhoto.url ? { display: 'none' } : {}}
              >
                <span className="photo-hero-emoji">{activePhoto.icon || defaultIcon}</span>
                <span className="photo-caption-tag">{activePhoto.label}</span>
              </div>

              {/* Status and Category Badges */}
              <div className="photo-badges-overlay">
                <span className="badge-tag category-badge">{categoryName}</span>
                <span className="badge-tag condition-badge">Condition: {auction.condition}</span>
                {auction.status === 'closing_soon' || isUrgent ? (
                  <span className="badge-tag status-badge urgent">Closing Soon</span>
                ) : isEnded ? (
                  <span className="badge-tag status-badge">Closed</span>
                ) : null}
              </div>
            </div>

            {/* Thumbnail Gallery Strip */}
            {photos.length > 1 && (
              <div className="thumbnail-strip">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    className={`thumbnail-btn ${activePhotoIndex === index ? 'active' : ''}`}
                    onClick={() => setActivePhotoIndex(index)}
                    title={photo.label}
                  >
                    {photo.url ? (
                      <img src={photo.url} alt={photo.label} className="thumb-img" />
                    ) : (
                      <span className="thumb-icon">{photo.icon || defaultIcon}</span>
                    )}
                    <span className="thumb-label">{photo.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ITEM DESCRIPTION CARD */}
          <div className="info-card description-card">
            <h2 className="info-card-heading">Item Description</h2>
            <p className="item-description-text">{auction.description}</p>

            <div className="condition-highlight-box">
              <div className="condition-header">
                <span className="condition-pill">{auction.condition}</span>
                <strong className="condition-title">Verified Condition Notes</strong>
              </div>
              <p className="condition-detail-text">
                {auction.conditionDescription || 'Inspected by student seller. Described accurately according to campus marketplace standards.'}
              </p>
            </div>
          </div>

          {/* 5. PUBLIC BID HISTORY */}
          <div className="info-card bid-history-card">
            <div className="bid-history-header">
              <div>
                <h2 className="info-card-heading">Public Bid History</h2>
                <p className="bid-history-subtitle">
                  {bidsCount} total {bidsCount === 1 ? 'bid' : 'bids'} placed by student peers
                </p>
              </div>
              <span className="live-activity-pill">
                <span className="pulse-dot"></span> Live Activity
              </span>
            </div>

            {bids.length > 0 ? (
              <div className="bid-history-table-wrapper">
                <table className="bid-history-table">
                  <thead>
                    <tr>
                      <th>Bidder</th>
                      <th>Bid Amount</th>
                      <th>Time Placed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((bid) => (
                      <tr key={bid.id} className={bid.isWinning ? 'winning-row' : ''}>
                        <td>
                          <div className="bidder-cell">
                            <span className="bidder-avatar">👤</span>
                            <span className="bidder-name">{bid.bidderName}</span>
                          </div>
                        </td>
                        <td className="bid-amount-cell">
                          <strong>${bid.amount.toFixed(2)}</strong>
                        </td>
                        <td className="bid-time-cell">{bid.timeAgo}</td>
                        <td>
                          {bid.isWinning ? (
                            <span className="winning-badge">Highest Bid 👑</span>
                          ) : (
                            <span className="outbid-badge">Outbid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-bids-message">No bids placed yet. Be the first to place a bid!</p>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: PRICING, COUNTDOWN, BIDDING & SELLER */}
        <aside className="detail-right-column">
          {/* PRICING & COUNTDOWN ACTION BOX */}
          <div className="action-sidebar-card">
            {/* Title */}
            <h1 className="detail-item-title">{auction.title}</h1>

            {/* LIVE COUNTDOWN TIMER */}
            <div className={`countdown-display-card ${isUrgent ? 'urgent' : ''}`}>
              <div className="countdown-header-row">
                <span className="countdown-icon">{isUrgent ? '🔥' : '⏳'}</span>
                <span className="countdown-title">
                  {isEnded ? 'Auction Concluded' : isUrgent ? 'Closing Soon!' : 'Time Remaining'}
                </span>
              </div>

              {isEnded ? (
                <div className="ended-notice">This auction has closed.</div>
              ) : (
                <div className="countdown-timer-grid">
                  <div className="time-block">
                    <span className="time-value">{String(days).padStart(2, '0')}</span>
                    <span className="time-unit">Days</span>
                  </div>
                  <span className="time-divider">:</span>
                  <div className="time-block">
                    <span className="time-value">{String(hours).padStart(2, '0')}</span>
                    <span className="time-unit">Hours</span>
                  </div>
                  <span className="time-divider">:</span>
                  <div className="time-block">
                    <span className="time-value">{String(minutes).padStart(2, '0')}</span>
                    <span className="time-unit">Mins</span>
                  </div>
                  <span className="time-divider">:</span>
                  <div className="time-block">
                    <span className="time-value">{String(seconds).padStart(2, '0')}</span>
                    <span className="time-unit">Secs</span>
                  </div>
                </div>
              )}

              {/* Closing Date/Time */}
              <div className="closing-schedule-row">
                <span className="calendar-icon">📅</span>
                <span>
                  Closes <strong>{formattedClosingDate}</strong> at <strong>{formattedClosingTime}</strong>
                </span>
              </div>
            </div>

            {/* 3. PRICES & BID INCREMENTS */}
            <div className="pricing-summary-card">
              <div className="current-bid-row">
                <div>
                  <span className="price-tagline">{isEnded ? 'Final Highest Bid' : 'Current Highest Bid'}</span>
                  <div className="price-main-display">
                    <span className="currency">$</span>
                    <span className="amount">{currentBid.toFixed(2)}</span>
                  </div>
                </div>
                <div className="activity-badge-box">
                  <span className="bids-tally">{bidsCount} {bidsCount === 1 ? 'bid' : 'bids'}</span>
                  <span className="min-inc-note">+${minIncrement.toFixed(2)} increment</span>
                </div>
              </div>

              <div className="price-breakdown-details">
                <div className="price-detail-line">
                  <span className="label">Starting Price:</span>
                  <span className="val">${startingBid.toFixed(2)}</span>
                </div>
                <div className="price-detail-line">
                  <span className="label">Minimum Bid Increment:</span>
                  <span className="val">+${minIncrement.toFixed(2)}</span>
                </div>
                <div className="price-detail-line highlight">
                  <span className="label">Suggested Next Bid:</span>
                  <span className="val">${nextMinimumBid.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 6. PLACE BID SECTION (Shows future version notice when clicked) */}
            <div className="bid-action-box">
              <form onSubmit={handlePlaceBid} className="place-bid-form">
                <label htmlFor="bid-input" className="bid-input-label">
                  Enter Your Bid:
                </label>
                <div className="bid-input-row">
                  <div className="bid-input-wrapper">
                    <span className="dollar-sign">$</span>
                    <input
                      id="bid-input"
                      type="number"
                      step="1"
                      min={nextMinimumBid}
                      placeholder={nextMinimumBid.toString()}
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(e.target.value)}
                      className="bid-number-input"
                    />
                  </div>
                  <button type="submit" className="btn-place-bid">
                    <span>Place Bid</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
                <p className="bid-helper-text">
                  Minimum acceptable bid is <strong>${nextMinimumBid.toFixed(2)}</strong>.
                </p>
              </form>

              <div className="bid-guarantee-note">
                <span>🛡️</span>
                <p>Campus Buyer Guarantee • No payment charged until handoff confirmed.</p>
              </div>
            </div>
          </div>

          {/* 2. SELLER INFORMATION CARD */}
          <div className="info-card seller-card">
            <h2 className="info-card-heading">Seller Information</h2>

            <div className="seller-profile-row">
              <div className="seller-avatar-badge">
                <span className="avatar-emoji">🎓</span>
              </div>

              <div className="seller-details-meta">
                <div className="seller-name-row">
                  <strong className="seller-display-name">{sellerObj.name}</strong>
                  {sellerObj.verified && (
                    <span className="verified-badge-pill" title="Verified Campus Student">
                      ✓ Verified Student
                    </span>
                  )}
                </div>
                <p className="seller-education">
                  {sellerObj.major} • Class of {sellerObj.gradYear}
                </p>
                <div className="seller-reputation-row">
                  <span className="seller-stars">★ {sellerObj.rating}</span>
                  <span className="seller-reviews">({sellerObj.reviewsCount} campus reviews)</span>
                  <span className="fast-responder-pill">⚡ Fast Responder</span>
                </div>
              </div>
            </div>

            {/* Safe Meetup Spot */}
            <div className="pickup-location-box">
              <div className="location-icon-box">📍</div>
              <div className="location-details">
                <strong>Campus Pickup Location:</strong>
                <p>{sellerObj.pickupSpot}</p>
              </div>
            </div>

            <div className="safe-handoff-banner">
              <span>🤝</span>
              <p>Meet in public campus areas (libraries, dining halls, student center) during daylight hours.</p>
            </div>
          </div>

          {/* SECONDARY BACK BUTTON */}
          <button onClick={() => navigate('/')} className="btn-back-secondary">
            ← Back to All Campus Auctions
          </button>
        </aside>
      </div>
    </div>
  )
}
