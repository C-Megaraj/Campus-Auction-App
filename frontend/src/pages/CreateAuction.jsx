import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createListing } from '../services/api'
import { CATEGORIES, CONDITIONS } from '../utils/mockAuctions'
import './CreateAuction.css'

const PRESET_ICONS = ['💻', '📚', '🚲', '🎧', '🖥️', '🧊', '🪑', '👕', '💡', '📱', '🎒', '⌚', '📦', '🛹']
const PRESET_COLORS = [
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#0284c7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
]

export default function CreateAuction() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('electronics')
  const [condition, setCondition] = useState('Like New')
  const [conditionNotes, setConditionNotes] = useState('')
  const [description, setDescription] = useState('')
  const [startingBid, setStartingBid] = useState('')
  const [minIncrement, setMinIncrement] = useState('2')
  const [imageUrl, setImageUrl] = useState('')
  const [closingDateTime, setClosingDateTime] = useState(() => {
    // Default to 48 hours from now
    const d = new Date(Date.now() + 48 * 3600 * 1000)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [selectedIcon, setSelectedIcon] = useState('💻')
  const [selectedColor, setSelectedColor] = useState('#8b5cf6')
  const [campusLocation, setCampusLocation] = useState('Student Union / Campus Quad')

  // Validation errors
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  // Quick preset end time buttons
  const setQuickDuration = (hours) => {
    const d = new Date(Date.now() + hours * 3600 * 1000)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setClosingDateTime(d.toISOString().slice(0, 16))
    if (errors.closingDateTime) {
      setErrors((prev) => ({ ...prev, closingDateTime: null }))
    }
  }

  // Validate form
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
      errs.description = 'Description should be at least 10 characters to inform student bidders.'
    }

    const priceNum = Number(startingBid)
    if (!startingBid || isNaN(priceNum) || priceNum <= 0) {
      errs.startingBid = 'Starting price must be a positive number greater than $0.'
    }

    const incNum = Number(minIncrement)
    if (!minIncrement || isNaN(incNum) || incNum < 1) {
      errs.minIncrement = 'Minimum increment must be at least $1.00.'
    }

    if (!closingDateTime) {
      errs.closingDateTime = 'Please select a closing date and time.'
    } else {
      const selectedTime = new Date(closingDateTime).getTime()
      if (selectedTime <= Date.now() + 2 * 60 * 1000) {
        errs.closingDateTime = 'Closing time must be at least 2 minutes in the future.'
      }
    }

    if (imageUrl.trim()) {
      try {
        new URL(imageUrl.trim())
      } catch {
        errs.imageUrl = 'Please enter a valid URL (starting with http:// or https://).'
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
        description: descriptionNotesCombined(),
        starting_price: Number(startingBid),
        minimum_bid_increment: Number(minIncrement),
        closing_at: new Date(closingDateTime).toISOString(),
        image_url: imageUrl.trim() || undefined,
      }

      const res = await createListing(payload)

      if (res && res.success && res.listing) {
        setSuccessMessage('Auction listing created successfully! Redirecting to your auction...')
        setTimeout(() => {
          navigate(`/auctions/${res.listing.id}`)
        }, 800)
      } else {
        setErrors({ form: res?.message || 'Failed to publish listing.' })
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Error creating listing:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to connect to the auction server. Please verify backend and MySQL are running.'
      setErrors({ form: errorMsg })
      setIsSubmitting(false)
    }
  }

  const descriptionNotesCombined = () => {
    if (conditionNotes.trim()) {
      return `${description.trim()}\n\n[Condition Notes: ${conditionNotes.trim()}]`
    }
    return description.trim()
  }

  // Filter out 'all' category for the dropdown
  const formCategories = CATEGORIES.filter((c) => c.id !== 'all')
  const formConditions = CONDITIONS.filter((c) => c.id !== 'all')

  return (
    <div className="create-listing-page">
      {/* NAVIGATION */}
      <nav className="create-nav-bar">
        <button onClick={() => navigate('/')} className="btn-back-link">
          <span className="arrow-back">←</span>
          <span>Back to Auctions</span>
        </button>

        <div className="create-breadcrumbs">
          <Link to="/" className="bc-link">Home</Link>
          <span className="bc-sep">/</span>
          <span className="bc-active">List an Item</span>
        </div>
      </nav>

      {/* HEADER */}
      <div className="create-header-area">
        <h1 className="create-page-title">List an Item for Campus Auction</h1>
        <p className="create-page-subtitle">
          Turn unused college gear, textbooks, or electronics into cash with peer student bidding
        </p>
      </div>

      {/* SUCCESS MESSAGE BANNER */}
      {successMessage && (
        <div className="create-success-banner">
          <span className="success-icon">🎉</span>
          <p>{successMessage}</p>
        </div>
      )}

      {errors.form && (
        <div className="create-error-banner">
          <span className="error-icon">⚠️</span>
          <p>{errors.form}</p>
        </div>
      )}

      {/* MAIN TWO-COLUMN FORM + LIVE PREVIEW */}
      <div className="create-layout-grid">
        {/* FORM COLUMN */}
        <form onSubmit={handleSubmit} className="listing-form-card" noValidate>
          {/* SECTION 1: BASIC INFO */}
          <div className="form-section-block">
            <h2 className="form-section-title">1. Item Information</h2>

            {/* Title */}
            <div className="form-field-group">
              <label htmlFor="title-input" className="form-label">
                Item Title <span className="req-star">*</span>
              </label>
              <input
                id="title-input"
                type="text"
                className={`form-text-input ${errors.title ? 'input-error' : ''}`}
                placeholder="e.g. TI-84 Plus CE Graphing Calculator (Color Screen)"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors((prev) => ({ ...prev, title: null }))
                }}
                maxLength={150}
              />
              <div className="field-hint-row">
                {errors.title ? (
                  <span className="error-hint">{errors.title}</span>
                ) : (
                  <span className="form-hint">Be specific with brand, model, or course requirement</span>
                )}
                <span className="char-count">{title.length}/150</span>
              </div>
            </div>

            {/* Category & Condition Row */}
            <div className="form-row-two-col">
              {/* Category */}
              <div className="form-field-group">
                <label htmlFor="category-select" className="form-label">
                  Category <span className="req-star">*</span>
                </label>
                <select
                  id="category-select"
                  className={`form-select-input ${errors.category ? 'input-error' : ''}`}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    if (errors.category) setErrors((prev) => ({ ...prev, category: null }))
                  }}
                >
                  {formCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="error-hint">{errors.category}</span>}
              </div>

              {/* Condition */}
              <div className="form-field-group">
                <label htmlFor="condition-select" className="form-label">
                  Condition <span className="req-star">*</span>
                </label>
                <select
                  id="condition-select"
                  className={`form-select-input ${errors.condition ? 'input-error' : ''}`}
                  value={condition}
                  onChange={(e) => {
                    setCondition(e.target.value)
                    if (errors.condition) setErrors((prev) => ({ ...prev, condition: null }))
                  }}
                >
                  {formConditions.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.label}
                    </option>
                  ))}
                </select>
                {errors.condition && <span className="error-hint">{errors.condition}</span>}
              </div>
            </div>

            {/* Condition Notes */}
            <div className="form-field-group">
              <label htmlFor="condition-notes-input" className="form-label">
                Condition Highlights
              </label>
              <input
                id="condition-notes-input"
                type="text"
                className="form-text-input"
                placeholder="e.g. Minor scratches on back, screen is clean, original charger included"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
              />
              <span className="form-hint">Brief note on wear, flaws, or included accessories</span>
            </div>

            {/* Description */}
            <div className="form-field-group">
              <label htmlFor="description-input" className="form-label">
                Detailed Description <span className="req-star">*</span>
              </label>
              <textarea
                id="description-input"
                rows="4"
                className={`form-textarea-input ${errors.description ? 'input-error' : ''}`}
                placeholder="Describe your item, why you're selling it, what courses it was used for, and any useful details for campus buyers..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors((prev) => ({ ...prev, description: null }))
                }}
              />
              {errors.description ? (
                <span className="error-hint">{errors.description}</span>
              ) : (
                <span className="form-hint">At least 10 characters describing the item and campus meetup details</span>
              )}
            </div>
          </div>

          {/* SECTION 2: PRICING & BID RULES */}
          <div className="form-section-block">
            <h2 className="form-section-title">2. Auction Pricing & Schedule</h2>

            <div className="form-row-two-col">
              {/* Starting Bid */}
              <div className="form-field-group">
                <label htmlFor="starting-bid-input" className="form-label">
                  Starting Price ($) <span className="req-star">*</span>
                </label>
                <div className="input-with-symbol">
                  <span className="symbol">$</span>
                  <input
                    id="starting-bid-input"
                    type="number"
                    min="1"
                    step="0.50"
                    placeholder="25"
                    className={`form-text-input with-prefix ${errors.startingBid ? 'input-error' : ''}`}
                    value={startingBid}
                    onChange={(e) => {
                      setStartingBid(e.target.value)
                      if (errors.startingBid) setErrors((prev) => ({ ...prev, startingBid: null }))
                    }}
                  />
                </div>
                {errors.startingBid && <span className="error-hint">{errors.startingBid}</span>}
              </div>

              {/* Min Increment */}
              <div className="form-field-group">
                <label htmlFor="min-inc-input" className="form-label">
                  Minimum Bid Increment ($) <span className="req-star">*</span>
                </label>
                <div className="input-with-symbol">
                  <span className="symbol">+$</span>
                  <input
                    id="min-inc-input"
                    type="number"
                    min="1"
                    step="0.50"
                    placeholder="2"
                    className={`form-text-input with-prefix ${errors.minIncrement ? 'input-error' : ''}`}
                    value={minIncrement}
                    onChange={(e) => {
                      setMinIncrement(e.target.value)
                      if (errors.minIncrement) setErrors((prev) => ({ ...prev, minIncrement: null }))
                    }}
                  />
                </div>
                {errors.minIncrement && <span className="error-hint">{errors.minIncrement}</span>}
              </div>
            </div>

            {/* Closing Date/Time */}
            <div className="form-field-group">
              <label htmlFor="closing-time-input" className="form-label">
                Auction Closing Date & Time <span className="req-star">*</span>
              </label>
              <input
                id="closing-time-input"
                type="datetime-local"
                className={`form-text-input ${errors.closingDateTime ? 'input-error' : ''}`}
                value={closingDateTime}
                onChange={(e) => {
                  setClosingDateTime(e.target.value)
                  if (errors.closingDateTime) setErrors((prev) => ({ ...prev, closingDateTime: null }))
                }}
              />
              <div className="quick-durations-row">
                <span className="quick-label">Quick Presets:</span>
                <button type="button" onClick={() => setQuickDuration(24)} className="btn-preset-time">
                  +1 Day
                </button>
                <button type="button" onClick={() => setQuickDuration(72)} className="btn-preset-time">
                  +3 Days
                </button>
                <button type="button" onClick={() => setQuickDuration(168)} className="btn-preset-time">
                  +7 Days
                </button>
              </div>
              {errors.closingDateTime && <span className="error-hint">{errors.closingDateTime}</span>}
            </div>
          </div>

          {/* SECTION 3: VISUALS & SELLER INFO */}
          <div className="form-section-block">
            <h2 className="form-section-title">3. Item Photos & Visual Preview</h2>

            {/* Item Image URL */}
            <div className="form-field-group">
              <label htmlFor="image-url-input" className="form-label">
                Public Image URL (Optional)
              </label>
              <input
                id="image-url-input"
                type="url"
                className={`form-text-input ${errors.imageUrl ? 'input-error' : ''}`}
                placeholder="https://images.unsplash.com/... or hosted student photo"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  if (errors.imageUrl) setErrors((prev) => ({ ...prev, imageUrl: null }))
                }}
              />
              <span className="form-hint">
                Provide an image URL to show the actual item photo, or select an emoji thumbnail below. (Remote image URLs are stored permanently in MySQL).
              </span>
              {errors.imageUrl && <span className="error-hint">{errors.imageUrl}</span>}
            </div>

            {/* Preset Icon Choice */}
            <div className="form-field-group">
              <span className="form-label">Fallback Thumbnail Icon:</span>
              <div className="icon-selector-grid">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-choice-btn ${selectedIcon === icon ? 'active' : ''}`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="form-field-group">
              <span className="form-label">Card Theme Color:</span>
              <div className="color-selector-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`color-choice-btn ${selectedColor === c.hex ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setSelectedColor(c.hex)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Pickup Spot */}
            <div className="form-field-group">
              <label htmlFor="location-input" className="form-label">
                Campus Meetup & Handoff Location
              </label>
              <input
                id="location-input"
                type="text"
                className="form-text-input"
                value={campusLocation}
                onChange={(e) => setCampusLocation(e.target.value)}
                placeholder="e.g. Science Library, Student Center Lobby"
              />
              <span className="form-hint">Where you plan to exchange the item with the winning student bidder</span>
            </div>
          </div>

          {/* FORM ACTIONS */}
          <div className="form-submit-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-create-submit"
            >
              {isSubmitting ? 'Publishing Listing to MySQL...' : 'Publish Campus Listing'}
              <span className="arrow-icon">→</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-create-cancel"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <aside className="preview-sidebar">
          <div className="preview-sticky-card">
            <div className="preview-header">
              <span className="preview-badge">Live Card Preview</span>
              <span className="preview-hint">What students see in the browse feed</span>
            </div>

            {/* SIMULATED CARD PREVIEW */}
            <div className="preview-card-box">
              <div
                className="preview-media-banner"
                style={{ borderTop: `4px solid ${selectedColor}` }}
              >
                <div className="preview-visual-box">
                  {imageUrl.trim() ? (
                    <img
                      src={imageUrl.trim()}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '18px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'inline'
                      }}
                    />
                  ) : null}
                  <span
                    className="preview-item-emoji"
                    style={imageUrl.trim() ? { display: 'none' } : {}}
                  >
                    {selectedIcon}
                  </span>
                </div>
                <div className="preview-top-badges">
                  <span className="badge-tag">
                    {CATEGORIES.find((c) => c.id === category)?.label || 'Category'}
                  </span>
                  <span className="badge-tag condition">{condition}</span>
                </div>
                <span className="preview-status-pill">New Listing</span>
              </div>

              <div className="preview-card-body">
                <h3 className="preview-item-title">
                  {title.trim() || 'Your Item Title Goes Here'}
                </h3>

                <div className="preview-seller-row">
                  <span>👤 {user?.full_name || user?.name || 'You (Verified Student)'}</span>
                  <span>📍 {campusLocation.trim() || 'Campus Center'}</span>
                </div>

                <div className="preview-countdown-box">
                  <span>⏳ Active Listing</span>
                </div>

                <div className="preview-price-box" style={{ borderColor: selectedColor }}>
                  <div>
                    <span className="preview-price-label">Starting Price</span>
                    <div className="preview-price-row">
                      <span className="curr">$</span>
                      <span className="amt">{startingBid || '0.00'}</span>
                    </div>
                  </div>
                  <div className="preview-bids-col">
                    <span className="bids-tag">0 bids</span>
                    <span className="inc-tag">+${minIncrement || '1.00'} min</span>
                  </div>
                </div>

                <div className="preview-card-buttons">
                  <div className="mock-btn primary">Place Bid →</div>
                  <div className="mock-btn secondary">Details</div>
                </div>
              </div>
            </div>

            <div className="preview-footer-note">
              <span>🛡️</span>
              <p>100% free to list for university students. 0% seller commission fees.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
