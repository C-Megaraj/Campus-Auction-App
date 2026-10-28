import { Link } from 'react-router-dom'
import { useWatchlist } from '../context/WatchlistContext'
import './AuctionCard.css'

export default function AuctionCard({ auction, secondsElapsed = 0 }) {
  const { isWatched, toggleWatchlist } = useWatchlist()
  const watched = isWatched(auction.id)

  // Calculate live formatted remaining time (handles both closing_at from MySQL API and initialMinutesLeft from demo)
  let totalSeconds = 0
  if (auction.closing_at) {
    const closingTimeMs = new Date(auction.closing_at).getTime()
    totalSeconds = Math.floor((closingTimeMs - Date.now()) / 1000)
  } else if (typeof auction.initialMinutesLeft === 'number') {
    totalSeconds = (auction.initialMinutesLeft * 60) - secondsElapsed
  }

  const isEnded = totalSeconds <= 0 || auction.status === 'ended' || auction.status === 'sold' || auction.status === 'closed'
  const isUrgent = !isEnded && totalSeconds < 3600

  const days = Math.floor(Math.max(0, totalSeconds) / 86400)
  const hours = Math.floor((Math.max(0, totalSeconds) % 86400) / 3600)
  const minutes = Math.floor((Math.max(0, totalSeconds) % 3600) / 60)
  const seconds = Math.max(0, totalSeconds) % 60

  let timerText = ''
  if (isEnded) {
    timerText = 'Auction Closed'
  } else if (days > 0) {
    timerText = `${days}d ${hours}h ${minutes}m left`
  } else if (hours > 0) {
    timerText = `${hours}h ${minutes}m ${seconds}s left`
  } else {
    timerText = `${minutes}m ${seconds}s left`
  }

  // Determine status label and badge style
  let statusLabel = 'Active'
  let statusClass = 'status-active'
  if (isEnded) {
    statusLabel = 'Closed'
    statusClass = 'status-closed'
  } else if (isUrgent || auction.status === 'closing_soon') {
    statusLabel = 'Closing Soon'
    statusClass = 'status-urgent'
  } else if (auction.tag) {
    statusLabel = auction.tag
    statusClass = 'status-tag'
  }

  // Normalize data between API (snake_case) and mock (camelCase)
  const currentBid = Number(auction.current_bid ?? auction.currentBid ?? auction.starting_price ?? auction.startingBid ?? 0)
  const startingBid = Number(auction.starting_price ?? auction.startingBid ?? 0)
  const bidsCount = Number(auction.bids_count ?? auction.bidsCount ?? 0)
  const categoryName = auction.category_name || auction.categoryName || 'Item'
  const sellerName = typeof auction.seller === 'object' ? (auction.seller?.name || 'Campus Student') : (auction.seller || 'Campus Student')
  const isVerifiedStudent = typeof auction.seller === 'object'
    ? (auction.seller?.verification_status === 'verified' || auction.seller?.verified)
    : Boolean(auction.verifiedStudent)
  const campusLocation = auction.campusLocation || 'Campus Pickup Spot'

  const fallbackIcon = categoryName.toLowerCase().includes('book')
    ? '📚'
    : categoryName.toLowerCase().includes('electr')
    ? '💻'
    : categoryName.toLowerCase().includes('cycl')
    ? '🚲'
    : '📦'
  const itemIcon = auction.icon || fallbackIcon
  const primaryImageUrl = auction.primary_image_url || (auction.images && auction.images[0]?.image_url) || null

  const handleWatchlistClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatchlist(auction.id)
  }

  return (
    <article className={`auction-card-box ${isUrgent ? 'card-urgent-glow' : ''}`}>
      {/* CARD BANNER & VISUAL */}
      <div className="card-media-wrapper" style={{ borderTop: `4px solid ${auction.accentColor || 'var(--accent)'}` }}>
        <Link to={`/auctions/${auction.id}`} className="card-visual-link">
          <div className="media-preview-box">
            {primaryImageUrl ? (
              <img
                src={primaryImageUrl}
                alt={auction.title}
                className="media-item-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'inline'
                  }
                }}
              />
            ) : null}
            <span
              className="media-item-emoji"
              style={primaryImageUrl ? { display: 'none' } : {}}
            >
              {itemIcon}
            </span>
          </div>
        </Link>

        {/* WATCHLIST / HEART BUTTON */}
        <button
          type="button"
          className={`btn-watchlist-toggle ${watched ? 'watched' : ''}`}
          onClick={handleWatchlistClick}
          title={watched ? 'Remove from Watchlist' : 'Save to Watchlist'}
          aria-label={watched ? 'Remove from Watchlist' : 'Save to Watchlist'}
        >
          <span className="heart-icon">{watched ? '❤️' : '🤍'}</span>
        </button>

        {/* BADGES ROW */}
        <div className="card-badges-row">
          <span className="card-badge category-pill-tag">{categoryName}</span>
          <span className="card-badge condition-pill-tag">{auction.condition}</span>
        </div>

        {/* STATUS TAG */}
        <span className={`status-pill-badge ${statusClass}`}>
          {isUrgent && <span className="urgent-fire">🔥 </span>}
          {statusLabel}
        </span>
      </div>

      {/* CARD BODY */}
      <div className="card-body-content">
        <Link to={`/auctions/${auction.id}`} className="card-title-anchor">
          <h3 className="auction-card-title" title={auction.title}>
            {auction.title}
          </h3>
        </Link>

        {/* SELLER & LOCATION */}
        <div className="card-seller-info-row">
          <span className="seller-name-text">
            👤 {sellerName}
            {isVerifiedStudent && <span className="verified-check-bubble" title="Verified Campus Student">✓</span>}
          </span>
          <span className="seller-location-text">📍 {campusLocation}</span>
        </div>

        {/* COUNTDOWN TIMER */}
        <div className={`card-countdown-ticker ${isUrgent ? 'urgent' : ''} ${isEnded ? 'ended' : ''}`}>
          <span className="ticker-icon">{isEnded ? '🔒' : isUrgent ? '🔥' : '⏳'}</span>
          <span className="ticker-time">{timerText}</span>
        </div>

        {/* PRICE & BIDS METRICS */}
        <div className="card-pricing-block">
          <div className="price-primary-col">
            <span className="price-caption">{isEnded ? 'Final Bid' : 'Highest Bid'}</span>
            <div className="price-figure-row">
              <span className="currency-mark">$</span>
              <span className="price-digits">{currentBid.toFixed(2)}</span>
            </div>
          </div>

          <div className="price-secondary-col">
            <span className="bids-count-bubble">{bidsCount} {bidsCount === 1 ? 'bid' : 'bids'}</span>
            <span className="starting-bid-label">Starts at ${startingBid.toFixed(2)}</span>
          </div>
        </div>

        {/* CARD ACTIONS */}
        <div className="card-action-buttons">
          <Link to={`/auctions/${auction.id}`} className="btn-card-bid-action">
            <span>{isEnded ? 'View Result' : 'Place Bid'}</span>
            <span className="arrow-glyph">→</span>
          </Link>
          <Link to={`/auctions/${auction.id}`} className="btn-card-details-action" title="View details">
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}
