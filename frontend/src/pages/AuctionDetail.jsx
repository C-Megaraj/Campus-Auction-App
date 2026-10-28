import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAuctionById } from '../utils/mockAuctions'
import {
  fetchListingById,
  cancelListing,
  placeBid,
  fetchBidHistory,
  fetchAuctionResult,
  decideAuctionResult,
  updateHandoverStage,
  acceptHighestBidEarly,
} from '../services/api'
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

  // Bidding state (Milestone 1)
  const [bidAmount, setBidAmount] = useState('')
  const [bidSubmitting, setBidSubmitting] = useState(false)
  const [bidError, setBidError] = useState(null)
  const [bidSuccess, setBidSuccess] = useState(null)

  // Auction Result & Seller Decision & Handover state (Milestones 2 & 3)
  const [resultData, setResultData] = useState(null)
  const [resultLoading, setResultLoading] = useState(false)
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Fetch listing by ID from API
  const loadListing = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsNotFound(false)

    try {
      const data = await fetchListingById(id)
      if (data && data.success && data.listing) {
        setAuction(data.listing)
        // Also fetch result status
        fetchResult()
      } else {
        setIsNotFound(true)
      }
    } catch (err) {
      console.error('Error fetching listing details:', err)
      if (err.response?.status === 404) {
        const mockFallback = getAuctionById(id)
        if (mockFallback) {
          setAuction(mockFallback)
        } else {
          setIsNotFound(true)
        }
      } else {
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

  // Fetch auction result & handover state
  const fetchResult = useCallback(async () => {
    try {
      setResultLoading(true)
      const res = await fetchAuctionResult(id)
      if (res && res.success) {
        setResultData(res.result || null)
      }
    } catch (err) {
      // Ignore 404 or inactive auction error silently
    } finally {
      setResultLoading(false)
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

  const isExpiredByTime = totalSeconds <= 0
  const isEnded = isExpiredByTime || auction.status === 'ended' || auction.status === 'sold' || auction.status === 'unsold' || auction.status === 'cancelled'
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
  const startingBid = Number(auction.starting_price ?? auction.startingBid ?? 0)
  const minIncrement = Number(auction.minimum_bid_increment ?? auction.minIncrement ?? 1)
  const bids = Array.isArray(auction.bids) ? auction.bids : []
  const bidsCount = Number(auction.bids_count ?? bids.length)
  const hasBids = bids.length > 0 || bidsCount > 0

  const currentBid = Number(
    auction.current_bid ?? (bids.length > 0 ? bids[0].amount : startingBid)
  )

  // Rule: If no bids yet, opening bid is starting price; otherwise current_bid + min_increment
  const nextMinimumBid = hasBids
    ? Math.round((currentBid + minIncrement) * 100) / 100
    : startingBid

  const categoryName = auction.category_name || auction.categoryName || 'Item'

  // Current user role checks
  const isOwner = Boolean(
    user && (user.id === auction.seller_id || user.id === auction.seller?.id)
  )

  // Normalize Seller details
  const sellerObj = typeof auction.seller === 'object' && auction.seller !== null
    ? {
        id: auction.seller.id || auction.seller_id,
        name: auction.seller.name || 'Campus Student',
        major: auction.seller.major || 'Undergraduate Student',
        gradYear: auction.seller.gradYear || "'25",
        rating: auction.seller.rating || '4.9',
        reviewsCount: auction.seller.reviewsCount || 15,
        verified: auction.seller.verification_status === 'verified' || Boolean(auction.seller.verified),
        pickupSpot: auction.seller.pickupSpot || auction.campusLocation || 'Student Center & Library Quad',
      }
    : {
        id: auction.seller_id,
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

  // Formatted public bids
  const formattedBids = bids.map((b, idx) => ({
    id: b.id || `b-${idx}`,
    bidderName: b.bidder_name || b.bidderName || `Student Bidder`,
    amount: Number(b.amount),
    timeAgo: b.timeAgo || formatTimeAgo(b.created_at),
    isWinning: b.is_winning !== undefined ? Boolean(b.is_winning) : idx === 0,
  }))

  // Highest bidder info
  const highestBidderObj = formattedBids.length > 0 ? formattedBids[0] : null

  // ==========================================
  // MILESTONE 1: PLACE BID SUBMISSION
  // ==========================================
  const handlePlaceBid = async (e) => {
    e.preventDefault()
    setBidError(null)
    setBidSuccess(null)

    if (!user) {
      setBidError('Please sign in to place a bid on this campus auction.')
      return
    }

    if (isOwner) {
      setBidError('Sellers are not permitted to bid on their own listings.')
      return
    }

    if (isEnded) {
      setBidError('This auction has closed. No further bids can be accepted.')
      return
    }

    const enteredAmount = Number(bidAmount || nextMinimumBid)
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setBidError('Please enter a valid positive bid amount.')
      return
    }

    if (enteredAmount < nextMinimumBid) {
      setBidError(
        `Your bid must be at least $${nextMinimumBid.toFixed(2)}.`
      )
      return
    }

    try {
      setBidSubmitting(true)
      const res = await placeBid(auction.id, enteredAmount)
      if (res && res.success) {
        setBidSuccess(`🎉 Bid of $${enteredAmount.toFixed(2)} placed successfully!`)
        setBidAmount('')
        // Refresh listing details and bid history
        await loadListing()
      } else {
        setBidError(res?.message || 'Failed to place bid.')
      }
    } catch (err) {
      console.error('Error placing bid:', err)
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to connect to the bidding server.'
      setBidError(msg)
    } finally {
      setBidSubmitting(false)
    }
  }

  // ========================================================
  // EARLY SALE: SELL NOW TO HIGHEST BIDDER AT ANY TIME
  // ========================================================
  const handleAcceptHighestBidEarly = async () => {
    if (!highestBidderObj) return
    const confirmMsg = `Are you sure you want to sell this item now to ${highestBidderObj.bidderName} for $${highestBidderObj.amount.toFixed(2)}?\n\nThis will immediately close the auction and no further bids will be accepted.`
    if (!window.confirm(confirmMsg)) return

    setActionError(null)
    setActionSuccess(null)

    try {
      setActionSubmitting(true)
      const res = await acceptHighestBidEarly(auction.id)
      if (res && res.success) {
        setActionSuccess(res.message)
        await loadListing()
        await fetchResult()
      } else {
        setActionError(res?.message || 'Failed to sell to highest bidder.')
      }
    } catch (err) {
      console.error('Error in early accept:', err)
      setActionError(err.response?.data?.message || err.message || 'Failed to complete early sale.')
    } finally {
      setActionSubmitting(false)
    }
  }

  // ========================================================
  // MILESTONES 2 & 3: SELLER DECISION (APPROVE/REJECT)
  // ========================================================
  const handleSellerDecision = async (decision) => {
    setActionError(null)
    setActionSuccess(null)

    try {
      setActionSubmitting(true)
      const res = await decideAuctionResult(auction.id, decision)
      if (res && res.success) {
        setActionSuccess(res.message)
        await loadListing()
        await fetchResult()
      } else {
        setActionError(res?.message || 'Failed to record decision.')
      }
    } catch (err) {
      console.error('Error recording seller decision:', err)
      setActionError(err.response?.data?.message || err.message || 'Failed to submit decision.')
    } finally {
      setActionSubmitting(false)
    }
  }

  // ========================================================
  // MILESTONE 3: HANDOVER STATUS PROGRESSION
  // ========================================================
  const handleHandoverProgression = async (newStatus) => {
    setActionError(null)
    setActionSuccess(null)

    try {
      setActionSubmitting(true)
      const res = await updateHandoverStage(auction.id, newStatus)
      if (res && res.success) {
        setActionSuccess(res.message)
        await loadListing()
        await fetchResult()
      } else {
        setActionError(res?.message || 'Failed to update handover stage.')
      }
    } catch (err) {
      console.error('Error updating handover:', err)
      setActionError(err.response?.data?.message || err.message || 'Failed to update handover.')
    } finally {
      setActionSubmitting(false)
    }
  }

  // Status computation for badges and notices
  const currentStatus = auction.status || (isEnded ? 'ended' : 'active')
  const isSold = currentStatus === 'sold'
  const isUnsold = currentStatus === 'unsold'
  const isCancelled = currentStatus === 'cancelled'

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
      {isOwner && (
        <div className="owner-controls-banner">
          <div className="owner-banner-left">
            <span className="owner-badge-icon">👑</span>
            <div>
              <strong>You are the student seller of this listing</strong>
              <p>Manage your auction details, accept bids at any time, or coordinate campus handover.</p>
            </div>
          </div>
          <div className="owner-banner-actions">
            {!isEnded && (
              <Link to={`/auctions/${auction.id}/edit`} className="btn-owner-edit">
                ✏️ Edit Listing
              </Link>
            )}
            <Link to="/my-listings" className="btn-owner-manage">
              📦 My Listings
            </Link>
          </div>
        </div>
      )}

      {/* SELLER EARLY SALE CALLOUT: SELL NOW TO HIGHEST BIDDER AT ANY TIME */}
      {isOwner && !isEnded && highestBidderObj && (
        <div
          className="early-sell-card"
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '2px solid #10b981',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 320px' }}>
            <span style={{ fontSize: '2rem' }}>💰</span>
            <div>
              <strong style={{ fontSize: '1.1rem', color: '#065f46', display: 'block' }}>
                Sell Now to Current Highest Bidder
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.92rem', color: '#047857' }}>
                You have a leading bid of <strong style={{ color: '#065f46' }}>${highestBidderObj.amount.toFixed(2)}</strong> from{' '}
                <strong>{highestBidderObj.bidderName}</strong>. You can close the auction early and accept this offer immediately!
              </p>
            </div>
          </div>
          <div>
            <button
              type="button"
              disabled={actionSubmitting}
              onClick={handleAcceptHighestBidEarly}
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '0.85rem 1.6rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.98rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{actionSubmitting ? 'Selling...' : `✓ Accept $${highestBidderObj.amount.toFixed(2)} & Close Auction`}</span>
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK BANNERS FOR SELLER ACTIONS */}
      {actionError && (
        <div className="auth-error-banner" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="auth-success-banner" style={{ marginBottom: '1.5rem' }}>
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* STATUS BANNER FOR CLOSED / UNSOLD / SOLD AUCTIONS */}
      {isEnded && (
        <div
          className={`auction-status-banner ${
            isSold ? 'status-sold' : isUnsold ? 'status-unsold' : 'status-ended'
          }`}
          style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            borderRadius: '12px',
            background: isSold ? '#ecfdf5' : isUnsold ? '#fef3c7' : '#f1f5f9',
            border: `1px solid ${isSold ? '#10b981' : isUnsold ? '#f59e0b' : '#cbd5e1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>
              {isSold ? '🎉' : isUnsold ? '📦' : '⏱️'}
            </span>
            <div>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: '#0f172a' }}>
                {isSold
                  ? 'Auction Concluded — Sale Approved'
                  : isUnsold
                  ? 'Auction Closed with No Bids (Unsold)'
                  : 'Auction Ended — Awaiting Finalization'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                {isSold
                  ? `Seller agreed to sell to ${resultData?.winner?.name || highestBidderObj?.bidderName || 'winning student'} for $${Number(resultData?.winning_amount || highestBidderObj?.amount || currentBid).toFixed(2)}. Campus handover is in progress.`
                  : isUnsold
                  ? 'No bids were placed before the closing deadline. Item is marked unsold.'
                  : resultData?.seller_decision === 'rejected'
                  ? 'The seller declined the provisional bid. Transaction cancelled.'
                  : resultData?.has_winner
                  ? `Provisional highest bidder: ${resultData?.winner?.name || 'Student Bidder'} ($${resultData?.winning_amount?.toFixed(2)})`
                  : 'Auction closed.'}
              </p>
            </div>
          </div>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                background: isSold ? '#10b981' : isUnsold ? '#f59e0b' : '#64748b',
                color: '#ffffff',
              }}
            >
              {isSold ? 'Sold' : isUnsold ? 'Unsold' : 'Ended'}
            </span>
          </div>
        </div>
      )}

      {/* MILESTONE 3: SELLER APPROVAL / REJECTION CARD (For auctions ended normally) */}
      {resultData && resultData.can_decide && (
        <div
          className="seller-decision-card"
          style={{
            background: '#ffffff',
            border: '2px solid #4f46e5',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>⚖️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                Seller Decision Required
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                The auction has closed with a provisional winning bid of{' '}
                <strong style={{ color: '#0f172a' }}>${resultData.winning_amount?.toFixed(2)}</strong> from{' '}
                <strong>{resultData.winner?.name}</strong>. Please approve or decline to proceed.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={actionSubmitting}
              onClick={() => handleSellerDecision('approved')}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>✓ Approve Winning Bid (${resultData.winning_amount?.toFixed(2)})</span>
            </button>
            <button
              type="button"
              disabled={actionSubmitting}
              onClick={() => handleSellerDecision('rejected')}
              style={{
                background: '#f1f5f9',
                color: '#ef4444',
                border: '1px solid #cbd5e1',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Decline Result
            </button>
          </div>
        </div>
      )}

      {/* MILESTONE 3: CAMPUS HANDOVER TRACKER (Available when item is sold) */}
      {(isSold || (resultData && resultData.seller_decision === 'accepted')) && (
        <div
          className="handover-tracker-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🤝</span> Campus Handover Tracker
            </h3>
            <span
              style={{
                padding: '0.3rem 0.8rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: resultData?.handover_status === 'completed' ? '#ecfdf5' : '#eef2ff',
                color: resultData?.handover_status === 'completed' ? '#059669' : '#4f46e5',
                border: `1px solid ${resultData?.handover_status === 'completed' ? '#a7f3d0' : '#c7d2fe'}`,
              }}
            >
              {resultData?.handover_status === 'completed'
                ? '✓ Completed'
                : resultData?.handover_status === 'scheduled'
                ? '📅 Handover Arranged'
                : '⏳ Awaiting Handover'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              margin: '1rem 0',
            }}
          >
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Winning Bidder</span>
              <strong style={{ color: '#0f172a' }}>{resultData?.winner?.name || highestBidderObj?.bidderName || 'Verified Student'}</strong>
            </div>
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Agreed Sale Price</span>
              <strong style={{ color: '#0f172a' }}>${Number(resultData?.winning_amount || highestBidderObj?.amount || currentBid).toFixed(2)}</strong>
            </div>
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Suggested Meetup Spot</span>
              <strong style={{ color: '#0f172a' }}>{sellerObj.pickupSpot}</strong>
            </div>
          </div>

          {/* Action buttons for authorized participants */}
          {(isOwner || (user && user.id === resultData?.winner?.id)) && resultData?.handover_status !== 'completed' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {(!resultData?.handover_status || resultData?.handover_status === 'pending') && (
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => handleHandoverProgression('scheduled')}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📅 Mark Handover as Arranged
                </button>
              )}
              {resultData?.handover_status === 'scheduled' && (
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => handleHandoverProgression('completed')}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Mark Campus Handover Completed
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TWO-COLUMN MAIN DETAILS LAYOUT */}
      <div className="auction-detail-layout-grid">
        {/* LEFT COLUMN: PHOTOS, DESCRIPTION & BID HISTORY */}
        <section className="detail-left-column">
          {/* PHOTO SHOWCASE */}
          <div className="photo-showcase-card">
            <div className="main-photo-frame" style={{ background: activePhoto.bg }}>
              {activePhoto.url ? (
                <img src={activePhoto.url} alt={auction.title} className="showcase-real-img" />
              ) : (
                <div className="showcase-icon-box">
                  <span className="showcase-icon">{activePhoto.icon || defaultIcon}</span>
                </div>
              )}

              <div className="frame-badges-overlay">
                <span className="badge-tag category-badge">{categoryName}</span>
                <span className="badge-tag condition-badge">{auction.condition}</span>
                {isEnded ? (
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

            {formattedBids.length > 0 ? (
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
                    {formattedBids.map((b) => (
                      <tr key={b.id} className={b.isWinning ? 'winning-row' : ''}>
                        <td>
                          <div className="bidder-cell">
                            <span className="bidder-avatar">👤</span>
                            <span className="bidder-name">{b.bidderName}</span>
                          </div>
                        </td>
                        <td className="bid-amount-cell">
                          <strong>${b.amount.toFixed(2)}</strong>
                        </td>
                        <td className="bid-time-cell">{b.timeAgo}</td>
                        <td>
                          {b.isWinning ? (
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
                <div className="ended-notice">
                  {isSold
                    ? 'This auction has concluded and was sold.'
                    : isUnsold
                    ? 'This auction closed without any bids.'
                    : 'This auction has closed.'}
                </div>
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
                {!isEnded && (
                  <div className="price-detail-line highlight">
                    <span className="label">Minimum Next Bid:</span>
                    <span className="val">${nextMinimumBid.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 6. PLACE BID SECTION */}
            <div className="bid-action-box">
              {bidError && (
                <div className="auth-error-banner" style={{ marginBottom: '1rem' }}>
                  <span>⚠️</span>
                  <span>{bidError}</span>
                </div>
              )}

              {bidSuccess && (
                <div className="auth-success-banner" style={{ marginBottom: '1rem' }}>
                  <span>✓</span>
                  <span>{bidSuccess}</span>
                </div>
              )}

              {isEnded ? (
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                  <span>🔒 Bidding is closed for this auction.</span>
                </div>
              ) : isOwner ? (
                <div style={{ textAlign: 'center', padding: '1rem', background: '#eef2ff', borderRadius: '8px', color: '#4338ca' }}>
                  <span>👑 You are the seller of this auction (sellers cannot bid on their own listings).</span>
                </div>
              ) : !user ? (
                <div style={{ textAlign: 'center', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.75rem', color: '#475569', fontSize: '0.95rem' }}>
                    Sign in to your campus account to place a bid.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/auctions/${auction.id}` } }}
                    style={{
                      display: 'inline-block',
                      background: '#4f46e5',
                      color: '#ffffff',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Sign In to Bid
                  </Link>
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="place-bid-form">
                  <label htmlFor="bid-input" className="bid-input-label">
                    Enter Your Bid Amount:
                  </label>
                  <div className="bid-input-row">
                    <div className="bid-input-wrapper">
                      <span className="dollar-sign">$</span>
                      <input
                        id="bid-input"
                        type="number"
                        step="0.01"
                        min={nextMinimumBid}
                        placeholder={nextMinimumBid.toFixed(2)}
                        value={bidAmount}
                        onChange={(e) => {
                          setBidAmount(e.target.value)
                          if (bidError) setBidError(null)
                        }}
                        className="bid-number-input"
                        disabled={bidSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-place-bid"
                      disabled={bidSubmitting}
                      style={{ opacity: bidSubmitting ? 0.7 : 1 }}
                    >
                      <span>{bidSubmitting ? 'Placing...' : 'Place Bid'}</span>
                      <span className="btn-arrow">→</span>
                    </button>
                  </div>
                  <p className="bid-helper-text">
                    Minimum acceptable bid is <strong>${nextMinimumBid.toFixed(2)}</strong>.
                  </p>
                </form>
              )}

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
