import { useState, useRef } from 'react'
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
  const fileInputRef = useRef(null)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('electronics')
  const [condition, setCondition] = useState('Like New')
  const [conditionNotes, setConditionNotes] = useState('')
  const [description, setDescription] = useState('')
  const [startingBid, setStartingBid] = useState('')
  const [minIncrement, setMinIncrement] = useState('2')

  // Mandatory Image Upload State
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

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

  // Handle local image file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        image: 'Only valid image files (JPEG, PNG, WEBP, GIF) are allowed.',
      }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        image: 'Image file size must be less than 5 MB.',
      }))
      return
    }

    setImageFile(file)
    setErrors((prev) => ({ ...prev, image: null }))

    // Create instant local preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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

    // MANDATORY IMAGE VALIDATION
    if (!imageFile) {
      errs.image = 'Uploading an item image is mandatory. Please choose a photo from your device.'
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
      // Use FormData to send actual file + listing metadata together
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('category', category)
      formData.append('condition', condition)
      formData.append('description', descriptionNotesCombined())
      formData.append('starting_price', Number(startingBid))
      formData.append('minimum_bid_increment', Number(minIncrement))
      formData.append('closing_at', new Date(closingDateTime).toISOString())

      // Append mandatory image file
      if (imageFile) {
        formData.append('images', imageFile)
      }

      const res = await createListing(formData)

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

  const formCategories = CATEGORIES.filter((c) => c.id !== 'all')
  const formConditions = CONDITIONS.filter((c) => c.id !== 'all')

  return (
    <div className="create-listing-page">
      {/* TOP SUB-NAV BAR */}
      <nav className="create-nav-bar">
        <button onClick={() => navigate(-1)} className="btn-back-nav">
          <span className="back-arrow">←</span>
          <span>Back</span>
        </button>

        <div className="create-breadcrumb-trail">
          <Link to="/" className="breadcrumb-link">
            Home
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">List New Campus Item</span>
        </div>
      </nav>

      {/* HEADER SECTION */}
      <header className="create-header-section">
        <div className="create-badge-pill">
          <span>🎓 Verified Student Seller</span>
        </div>
        <h1 className="create-page-title">List an Item for Campus Auction</h1>
        <p className="create-page-subtitle">
          Auction textbooks, calculators, electronics, bikes, and dorm essentials directly to your college peers with zero seller fees.
        </p>
      </header>

      {/* SERVER RESPONSE BANNERS */}
      {successMessage && (
        <div className="alert-banner alert-success">
          <span className="alert-icon">✓</span>
          <p>{successMessage}</p>
        </div>
      )}

      {errors.form && (
        <div className="alert-banner alert-error">
          <span className="alert-icon">⚠️</span>
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
                placeholder="Provide helpful context: which course it was used for, dimensions, battery health, why you're selling it..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors((prev) => ({ ...prev, description: null }))
                }}
              />
              {errors.description && <span className="error-hint">{errors.description}</span>}
            </div>
          </div>

          {/* SECTION 2: PRICING & TIMING */}
          <div className="form-section-block">
            <h2 className="form-section-title">2. Pricing & Auction Duration</h2>

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

          {/* SECTION 3: MANDATORY IMAGE UPLOAD & PREVIEW */}
          <div className="form-section-block">
            <h2 className="form-section-title">3. Item Photo Upload <span style={{ color: '#ef4444' }}>* (Mandatory)</span></h2>

            {/* MANDATORY FILE UPLOAD ZONE */}
            <div className="form-field-group">
              <label className="form-label">
                Upload Real Item Photo <span className="req-star">*</span>
              </label>

              <div
                style={{
                  border: `2px dashed ${errors.image ? '#ef4444' : imagePreview ? '#10b981' : '#cbd5e1'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: imagePreview ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="image-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {imagePreview ? (
                  <div>
                    <img
                      src={imagePreview}
                      alt="Upload Preview"
                      style={{
                        maxHeight: '180px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        marginBottom: '0.75rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 600 }}>
                        ✓ {imageFile?.name} ({(imageFile?.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage()
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>
                      Click to choose an item photo from your device
                    </strong>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Supports PNG, JPG, JPEG, WEBP or GIF (max 5MB). Photo is required.
                    </p>
                  </div>
                )}
              </div>

              {errors.image && (
                <span className="error-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
                  {errors.image}
                </span>
              )}
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
                placeholder="e.g. Engineering Quad, Main Library Lobby, Dining Hall Plaza"
                value={campusLocation}
                onChange={(e) => setCampusLocation(e.target.value)}
              />
              <span className="form-hint">Suggested public campus location where you prefer to meet winning bidders</span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="form-actions-row">
            <button
              type="submit"
              className="btn-publish-listing"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-dot"></span>
                  <span>Publishing Listing...</span>
                </>
              ) : (
                <>
                  <span>🚀 Publish Campus Auction</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* PREVIEW COLUMN */}
        <aside className="preview-sidebar">
          <div className="preview-sticky-wrap">
            <div className="preview-header-meta">
              <span className="preview-label">Live Marketplace Card Preview</span>
              <span className="preview-sub">How other students will see your listing</span>
            </div>

            <div className="preview-card-box">
              <div className="preview-card-media" style={{ backgroundColor: selectedColor }}>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="preview-emoji-icon">{selectedIcon}</span>
                )}
                <div className="preview-badges">
                  <span className="preview-category-pill">
                    {formCategories.find((c) => c.id === category)?.label || category}
                  </span>
                  <span className="preview-condition-pill">{condition}</span>
                </div>
              </div>

              <div className="preview-card-body">
                <h3 className="preview-card-title">{title || 'Your Item Title Will Appear Here'}</h3>

                <div className="preview-seller-info">
                  <span className="preview-avatar">🎓</span>
                  <span className="preview-seller-name">{user?.name || user?.full_name || 'You (Verified Student)'}</span>
                </div>

                <div className="preview-card-pricing">
                  <div>
                    <span className="preview-price-label">Starting Price</span>
                    <strong className="preview-price-val">
                      ${startingBid ? Number(startingBid).toFixed(2) : '0.00'}
                    </strong>
                  </div>
                  <div className="preview-min-inc">
                    <span>+${minIncrement ? Number(minIncrement).toFixed(2) : '1.00'} min inc</span>
                  </div>
                </div>

                <div className="preview-location-tag">
                  <span>📍 {campusLocation}</span>
                </div>
              </div>
            </div>

            <div className="preview-guidance-card">
              <h4>💡 Student Seller Tips:</h4>
              <ul>
                <li><strong>Clear Real Photos:</strong> Taking a well-lit photo of the actual item builds peer trust.</li>
                <li><strong>Accurate Details:</strong> Note any scratches, edition years, or bundled charging cords.</li>
                <li><strong>Safe Handoff:</strong> Meet only in public campus areas (libraries, dining halls).</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
