import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAuctionById } from '../utils/mockAuctions'
import { useWatchlist } from '../context/WatchlistContext'
import './AuctionDetail.css'

export default function AuctionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isWatched, toggleWatchlist } = useWatchlist()

  // State for active photo gallery selection
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // State for ticking live countdown
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // State for future version bidding notice
  const [biddingNotice, setBiddingNotice] = useState(null)
  const [customBidAmount, setCustomBidAmount] = useState('')

  // Find the auction from all sources (custom listings + standard mock)
  const auction = getAuctionById(id)
  const watched = auction ? isWatched(auction.id) : false

  // Real-time ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // If auction not found, show friendly 404 card with back button
  if (!auction) {
    return (
      <div className="auction-detail-container not-found-wrapper">
        <div className="not-found-card">
          <span className="not-found-icon">🔎</span>
          <h2>Auction Not Found</h2>
          <p>The auction item you are looking for does not exist or may have been removed.</p>
          <button onClick={() => navigate('/')} className="btn-back-home">
            ← Back to Auctions
          </button>
        </div>
      </div>
    )
  }

  // Calculate live formatted remaining time
  const totalSeconds = (auction.initialMinutesLeft * 60) - secondsElapsed
  const isEnded = totalSeconds <= 0
  const isUrgent = !isEnded && totalSeconds < 3600

  const days = Math.floor(Math.max(0, totalSeconds) / 86400)
  const hours = Math.floor((Math.max(0, totalSeconds) % 86400) / 3600)
  const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60)
  const seconds = Math.max(0, totalSeconds) % 60

  // Calculate closing date/time based on current time + initialMinutesLeft
  const closingDate = new Date(Date.now() + auction.initialMinutesLeft * 60 * 1000)
  const formattedClosingDate = closingDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedClosingTime = closingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  // Seller details normalization
  const seller = typeof auction.seller === 'object'
    ? auction.seller
    : {
        name: auction.seller,
        major: 'Undergraduate Student',
        gradYear: "'25",
        rating: '4.9',
        reviewsCount: 15,
        verified: true,
        pickupSpot: auction.campusLocation,
      }

  const nextMinimumBid = auction.currentBid + auction.minIncrement
  const photos = auction.photos || [
    { id: 'p1', label: 'Primary Item View', icon: auction.icon, bg: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  ]
  const activePhoto = photos[activePhotoIndex] || photos[0]

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
          <span className="breadcrumb-link">{auction.categoryName}</span>
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
              <div className="photo-hero-graphic">
                <span className="photo-hero-emoji">{activePhoto.icon || auction.icon}</span>
                <span className="photo-caption-tag">{activePhoto.label}</span>
              </div>

              {/* Status and Category Badges */}
              <div className="photo-badges-overlay">
                <span className="badge-tag category-badge">{auction.categoryName}</span>
                <span className="badge-tag condition-badge">Condition: {auction.condition}</span>
                {auction.tag && (
                  <span className={`badge-tag status-badge ${auction.tag === 'Ending Soon' ? 'urgent' : ''}`}>
                    {auction.tag}
                  </span>
                )}
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
                    <span className="thumb-icon">{photo.icon}</span>
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
                {auction.conditionDescription || 'Inspected by seller. Described honestly according to student marketplace standards.'}
              </p>
            </div>
          </div>

          {/* 5. PUBLIC BID HISTORY */}
          <div className="info-card bid-history-card">
            <div className="bid-history-header">
              <div>
                <h2 className="info-card-heading">Public Bid History</h2>
                <p className="bid-history-subtitle">
                  {auction.bidsCount || 0} total {auction.bidsCount === 1 ? 'bid' : 'bids'} placed by student peers
                </p>
              </div>
              <span className="live-activity-pill">
                <span className="pulse-dot"></span> Live Activity
              </span>
            </div>

            {auction.bids && auction.bids.length > 0 ? (
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
                    {auction.bids.map((bid) => (
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
                    <span className="amount">{auction.currentBid.toFixed(2)}</span>
                  </div>
                </div>
                <div className="activity-badge-box">
                  <span className="bids-tally">{auction.bidsCount || 0} {auction.bidsCount === 1 ? 'bid' : 'bids'}</span>
                  <span className="min-inc-note">+${auction.minIncrement} increment</span>
                </div>
              </div>

              <div className="price-breakdown-details">
                <div className="price-detail-line">
                  <span className="label">Starting Price:</span>
                  <span className="val">${auction.startingBid.toFixed(2)}</span>
                </div>
                <div className="price-detail-line">
                  <span className="label">Minimum Bid Increment:</span>
                  <span className="val">+${auction.minIncrement.toFixed(2)}</span>
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
                  <strong className="seller-display-name">{seller.name}</strong>
                  {seller.verified && (
                    <span className="verified-badge-pill" title="Verified Campus Student">
                      ✓ Verified Student
                    </span>
                  )}
                </div>
                <p className="seller-education">
                  {seller.major} • Class of {seller.gradYear}
                </p>
                <div className="seller-reputation-row">
                  <span className="seller-stars">★ {seller.rating}</span>
                  <span className="seller-reviews">({seller.reviewsCount} campus reviews)</span>
                  <span className="fast-responder-pill">⚡ Fast Responder</span>
                </div>
              </div>
            </div>

            {/* Safe Meetup Spot */}
            <div className="pickup-location-box">
              <div className="location-icon-box">📍</div>
              <div className="location-details">
                <strong>Campus Pickup Location:</strong>
                <p>{seller.pickupSpot || auction.campusLocation}</p>
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
