import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllAuctions } from '../utils/mockAuctions'
import { useWatchlist } from '../context/WatchlistContext'
import AuctionCard from '../components/AuctionCard'
import './Watchlist.css'

export default function Watchlist() {
  const navigate = useNavigate()
  const { watchlist, clearWatchlist, watchlistCount } = useWatchlist()
  const [allAuctions, setAllAuctions] = useState(getAllAuctions())
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Listen for auction updates (in case user created new listings)
  useEffect(() => {
    const handleUpdate = () => setAllAuctions(getAllAuctions())
    window.addEventListener('auctions-updated', handleUpdate)
    return () => window.removeEventListener('auctions-updated', handleUpdate)
  }, [])

  // Timer for live ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter all auctions down to only those in user's watchlist
  const watchedAuctions = allAuctions.filter((auction) => watchlist.includes(auction.id))

  const handleConfirmClear = () => {
    clearWatchlist()
    setShowClearConfirm(false)
  }

  return (
    <div className="watchlist-page-container">
      {/* TOP NAVIGATION BREADCRUMBS */}
      <nav className="watchlist-nav-bar">
        <button onClick={() => navigate('/')} className="btn-back-link">
          <span className="arrow-back">←</span>
          <span>Back to Auctions</span>
        </button>

        <div className="watchlist-breadcrumbs">
          <Link to="/" className="bc-link">Home</Link>
          <span className="bc-sep">/</span>
          <span className="bc-active">Watchlist</span>
        </div>
      </nav>

      {/* HEADER ROW */}
      <div className="watchlist-header-row">
        <div>
          <h1 className="watchlist-title">
            Saved Auctions <span className="watchlist-count-badge">({watchlistCount})</span>
          </h1>
          <p className="watchlist-subtitle">
            Track bidding progress, current prices, and closing countdowns for items you love
          </p>
        </div>

        {watchlistCount > 0 && (
          <div className="watchlist-actions-group">
            {!showClearConfirm ? (
              <button
                type="button"
                className="btn-clear-watchlist"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear Watchlist
              </button>
            ) : (
              <div className="clear-confirm-dialog">
                <span className="confirm-prompt">Remove all saved items?</span>
                <button
                  type="button"
                  className="btn-confirm-yes"
                  onClick={handleConfirmClear}
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  className="btn-confirm-cancel"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DEMO NOTICE BANNER */}
      <div className="watchlist-demo-notice">
        <span className="notice-icon">💾</span>
        <div className="notice-text">
          <strong>Local Demo Mode</strong>
          <p>
            Your saved watchlist is securely persisted in your browser's local storage. In a future update, this will synchronize across your student account devices.
          </p>
        </div>
      </div>

      {/* EMPTY STATE */}
      {watchedAuctions.length === 0 ? (
        <div className="empty-watchlist-card">
          <div className="empty-icon-bubble">🤍</div>
          <h2>Your Watchlist is Empty</h2>
          <p>
            You haven't saved any campus auctions yet. Tap the heart icon on any textbook, bike, or gadget to keep an eye on active bids!
          </p>
          <div className="empty-actions-row">
            <Link to="/" className="btn-browse-auctions">
              <span>Explore Live Auctions</span>
              <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      ) : (
        /* WATCHLIST CARDS GRID */
        <div className="watchlist-grid">
          {watchedAuctions.map((item) => (
            <AuctionCard
              key={item.id}
              auction={item}
              secondsElapsed={secondsElapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

