import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchListingById, updateListing, cancelListing } from '../services/api'
import { CATEGORIES, CONDITIONS } from '../utils/mockAuctions'
import './CreateAuction.css'

export default function EditAuction() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isOwner, setIsOwner] = useState(true)
  const [hasBids, setHasBids] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('electronics')
  const [condition, setCondition] = useState('Like New')
  const [description, setDescription] = useState('')
  const [startingBid, setStartingBid] = useState('')
  const [minIncrement, setMinIncrement] = useState('1')
  const [imageUrl, setImageUrl] = useState('')
  const [closingDateTime, setClosingDateTime] = useState('')

  // Validation & Submit
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  const loadListing = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const data = await fetchListingById(id)
      if (data && data.success && data.listing) {
        const item = data.listing
        const sellerId = item.seller?.id || item.seller_id

        if (user && sellerId !== user.id) {
          setIsOwner(false)
          setLoading(false)
          return
        }

        const bidsCount = Number(item.bids_count || item.bids?.length || 0)
        const closed =
          item.status === 'ended' ||
          item.status === 'sold' ||
          item.status === 'cancelled' ||
          new Date(item.closing_at).getTime() <= Date.now()

        setHasBids(bidsCount > 0)
        setIsClosed(closed)

        setTitle(item.title || '')
        const catMatched = CATEGORIES.find(
          (c) =>
            c.id === String(item.category_id) ||
            c.label.toLowerCase() === (item.category_name || '').toLowerCase()
        )
        setCategory(catMatched ? catMatched.id : 'other')
        setCondition(item.condition || 'Like New')
        setDescription(item.description || '')
        setStartingBid(String(item.starting_price || item.startingBid || ''))
        setMinIncrement(String(item.minimum_bid_increment || item.minIncrement || '1'))

        if (item.images && item.images.length > 0) {
          setImageUrl(item.images[0].image_url || '')
        } else if (item.primary_image_url) {
          setImageUrl(item.primary_image_url)
        }

        if (item.closing_at) {
          const d = new Date(item.closing_at)
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
          setClosingDateTime(d.toISOString().slice(0, 16))
        }
      } else {
        setLoadError('Listing not found.')
      }
    } catch (err) {
      console.error('Error fetching listing to edit:', err)
      setLoadError(err.response?.data?.message || err.message || 'Failed to load listing details.')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    loadListing()
  }, [loadListing])

  const validateForm = () => {
    const errs = {}

    if (!title.trim()) {
      errs.title = 'Item title is required.'
    } else if (title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters.'
    }

    if (!category) {
      errs.category = 'Please choose a category.'
    }

    if (!condition) {
      errs.condition = 'Please select the item condition.'
    }

    if (!description.trim()) {
      errs.description = 'Item description is required.'
    } else if (description.trim().length < 10) {
      errs.description = 'Description should be at least 10 characters long.'
    }

    if (!hasBids) {
      const priceNum = Number(startingBid)
      if (!startingBid || isNaN(priceNum) || priceNum <= 0) {
        errs.startingBid = 'Starting price must be a positive number greater than $0.'
      }

      const incNum = Number(minIncrement)
      if (!minIncrement || isNaN(incNum) || incNum < 1) {
        errs.minIncrement = 'Minimum increment must be at least $1.00.'
      }
    }

    if (!closingDateTime) {
      errs.closingDateTime = 'Please select a closing date and time.'
    } else {
      const selectedTime = new Date(closingDateTime).getTime()
      if (selectedTime <= Date.now() + 60 * 1000) {
        errs.closingDateTime = 'Closing time must be in the future.'
      }
    }

    if (imageUrl.trim()) {
      try {
        new URL(imageUrl.trim())
      } catch {
        errs.imageUrl = 'Please enter a valid URL.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage(null)

    try {
      const payload = {
        title: title.trim(),
        category,
        condition,
        description: description.trim(),
        closing_at: new Date(closingDateTime).toISOString(),
        image_url: imageUrl.trim() || undefined,
      }

      if (!hasBids) {
        payload.starting_price = Number(startingBid)
        payload.minimum_bid_increment = Number(minIncrement)
      }

      const res = await updateListing(id, payload)

      if (res && res.success) {
        setSuccessMessage('Listing updated successfully! Redirecting...')
        setTimeout(() => {
          navigate(`/auctions/${id}`)
        }, 800)
      } else {
        setErrors({ form: res?.message || 'Failed to update listing.' })
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Error updating listing:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to update listing. Please verify the server is running.'
      setErrors({ form: errorMsg })
      setIsSubmitting(false)
    }
  }

  const handleCancelAuction = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this auction? This will close the auction and record it as cancelled in accordance with marketplace rules.'
    )
    if (!confirmed) return

    setIsCancelling(true)
    setErrors({})

    try {
      const res = await cancelListing(id)
      if (res && res.success) {
        setSuccessMessage('Auction listing has been cancelled.')
        setTimeout(() => {
          navigate('/my-listings')
        }, 800)
      } else {
        setErrors({ form: res?.message || 'Failed to cancel listing.' })
        setIsCancelling(false)
      }
    } catch (err) {
      console.error('Error cancelling listing:', err)
      setErrors({
        form:
          err.response?.data?.message ||
          err.message ||
          'Failed to cancel listing. Please check auction rules.',
      })
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="create-listing-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p>Loading listing details...</p>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="create-listing-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Unauthorized</h2>
        <p>You can only edit auctions that you personally created.</p>
        <button onClick={() => navigate('/')} className="btn-create-submit" style={{ margin: '1rem auto' }}>
          Back to Auctions
        </button>
      </div>
    )
  }

  if (isClosed) {
    return (
      <div className="create-listing-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Auction Ineligible for Editing</h2>
        <p>This auction is closed, ended, or cancelled and can no longer be edited.</p>
        <button onClick={() => navigate(`/auctions/${id}`)} className="btn-create-submit" style={{ margin: '1rem auto' }}>
          View Auction Details
        </button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="create-listing-page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Unable to Load Auction</h2>
        <p>{loadError}</p>
        <button onClick={() => navigate('/')} className="btn-create-cancel" style={{ margin: '1rem auto' }}>
          Back to Auctions
        </button>
      </div>
    )
  }

  const formCategories = CATEGORIES.filter((c) => c.id !== 'all')
  const formConditions = CONDITIONS.filter((c) => c.id !== 'all')

  return (
    <div className="create-listing-page">
      <nav className="create-nav-bar">
        <button onClick={() => navigate(`/auctions/${id}`)} className="btn-back-link">
          <span className="arrow-back">←</span>
          <span>Back to Auction Details</span>
        </button>

        <div className="create-breadcrumbs">
          <Link to="/" className="bc-link">Home</Link>
          <span className="bc-sep">/</span>
          <Link to="/my-listings" className="bc-link">My Listings</Link>
          <span className="bc-sep">/</span>
          <span className="bc-active">Edit #{id}</span>
        </div>
      </nav>

      <div className="create-header-area">
        <h1 className="create-page-title">Edit Auction Listing #{id}</h1>
        <p className="create-page-subtitle">
          Update item details, descriptions, and schedule
        </p>
      </div>

      {hasBids && (
        <div className="create-demo-banner" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
          <span className="banner-icon">🔒</span>
          <div className="banner-text">
            <strong style={{ color: '#92400e' }}>Active Bidding in Progress</strong>
            <p style={{ color: '#78350f' }}>
              Student bids have already been placed on this item. Starting price and minimum bid increment are locked to maintain marketplace integrity. You may still update title, description, condition, closing time, and photo.
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="create-success-banner">
          <span className="success-icon">✓</span>
          <p>{successMessage}</p>
        </div>
      )}

      {errors.form && (
        <div className="create-error-banner">
          <span className="error-icon">⚠️</span>
          <p>{errors.form}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="listing-form-card" style={{ maxWidth: '800px', margin: '0 auto' }} noValidate>
        {/* SECTION 1 */}
        <div className="form-section-block">
          <h2 className="form-section-title">Item Details</h2>

          <div className="form-field-group">
            <label htmlFor="edit-title" className="form-label">Item Title *</label>
            <input
              id="edit-title"
              type="text"
              className={`form-text-input ${errors.title ? 'input-error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
            {errors.title && <span className="error-hint">{errors.title}</span>}
          </div>

          <div className="form-row-two-col">
            <div className="form-field-group">
              <label htmlFor="edit-cat" className="form-label">Category *</label>
              <select
                id="edit-cat"
                className="form-select-input"
                value={category}
                disabled={hasBids}
                onChange={(e) => setCategory(e.target.value)}
              >
                {formCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="edit-cond" className="form-label">Condition *</label>
              <select
                id="edit-cond"
                className="form-select-input"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {formConditions.map((cond) => (
                  <option key={cond.id} value={cond.id}>{cond.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field-group">
            <label htmlFor="edit-desc" className="form-label">Description *</label>
            <textarea
              id="edit-desc"
              rows="4"
              className={`form-textarea-input ${errors.description ? 'input-error' : ''}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && <span className="error-hint">{errors.description}</span>}
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="form-section-block">
          <h2 className="form-section-title">Pricing & Schedule</h2>

          <div className="form-row-two-col">
            <div className="form-field-group">
              <label htmlFor="edit-price" className="form-label">
                Starting Price ($) {hasBids && '🔒 Locked'}
              </label>
              <input
                id="edit-price"
                type="number"
                step="0.50"
                className={`form-text-input ${errors.startingBid ? 'input-error' : ''}`}
                value={startingBid}
                disabled={hasBids}
                onChange={(e) => setStartingBid(e.target.value)}
              />
              {errors.startingBid && <span className="error-hint">{errors.startingBid}</span>}
            </div>

            <div className="form-field-group">
              <label htmlFor="edit-inc" className="form-label">
                Minimum Increment ($) {hasBids && '🔒 Locked'}
              </label>
              <input
                id="edit-inc"
                type="number"
                step="0.50"
                className={`form-text-input ${errors.minIncrement ? 'input-error' : ''}`}
                value={minIncrement}
                disabled={hasBids}
                onChange={(e) => setMinIncrement(e.target.value)}
              />
              {errors.minIncrement && <span className="error-hint">{errors.minIncrement}</span>}
            </div>
          </div>

          <div className="form-field-group">
            <label htmlFor="edit-closing" className="form-label">Closing Date & Time *</label>
            <input
              id="edit-closing"
              type="datetime-local"
              className={`form-text-input ${errors.closingDateTime ? 'input-error' : ''}`}
              value={closingDateTime}
              onChange={(e) => setClosingDateTime(e.target.value)}
            />
            {errors.closingDateTime && <span className="error-hint">{errors.closingDateTime}</span>}
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="form-section-block">
          <h2 className="form-section-title">Photo Preview</h2>

          <div className="form-field-group">
            <label htmlFor="edit-img" className="form-label">Public Image URL (Optional)</label>
            <input
              id="edit-img"
              type="url"
              className="form-text-input"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl.trim() && (
              <div style={{ marginTop: '0.75rem', width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={imageUrl.trim()} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="form-submit-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={isSubmitting || isCancelling} className="btn-create-submit">
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/auctions/${id}`)} className="btn-create-cancel">
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleCancelAuction}
            disabled={isSubmitting || isCancelling}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isCancelling ? 'Cancelling...' : '🚫 Cancel Auction'}
          </button>
        </div>
      </form>
    </div>
  )
}

