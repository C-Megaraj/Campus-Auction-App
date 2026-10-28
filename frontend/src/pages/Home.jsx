import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  SAMPLE_AUCTIONS,
  CATEGORIES,
  CONDITIONS,
  SORT_OPTIONS,
} from '../utils/mockAuctions'
import './Home.css'

export default function Home() {
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedCondition, setSelectedCondition] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('closing-soon')
  
  // Real-time ticking state (seconds elapsed)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate live formatted remaining time for each item
  const formatTimeRemaining = (initialMinutes) => {
    const totalSeconds = initialMinutes * 60 - secondsElapsed
    if (totalSeconds <= 0) return { text: 'Auction Closed', isUrgent: false, isEnded: true }

    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const isUrgent = totalSeconds < 3600 // Less than 1 hour

    let text = ''
    if (days > 0) {
      text = `${days}d ${hours}h ${minutes}m left`
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s left`
    } else {
      text = `${minutes}m ${seconds}s left`
    }

    return { text, isUrgent, isEnded: false }
  }

  // Multi-filter logic: Title search, Category, Condition, Min Price, Max Price
  const filteredAuctions = SAMPLE_AUCTIONS.filter((auction) => {
    // 1. Search bar filters by item title
    const matchesTitle =
      !searchQuery.trim() ||
      auction.title.toLowerCase().includes(searchQuery.trim().toLowerCase())

    // 2. Category filter (Books, Electronics, Cycles, Other Items)
    const matchesCategory =
      selectedCategory === 'all' || auction.category === selectedCategory

    // 3. Condition filter (New, Like New, Good, Fair)
    const matchesCondition =
      selectedCondition === 'all' || auction.condition === selectedCondition

    // 4. Price filter (Min and Max price)
    const minVal = minPrice !== '' ? Number(minPrice) : null
    const maxVal = maxPrice !== '' ? Number(maxPrice) : null

    const matchesMinPrice =
      minVal === null || isNaN(minVal) || auction.currentBid >= minVal
    const matchesMaxPrice =
      maxVal === null || isNaN(maxVal) || auction.currentBid <= maxVal

    return (
      matchesTitle &&
      matchesCategory &&
      matchesCondition &&
      matchesMinPrice &&
      matchesMaxPrice
    )
  }).sort((a, b) => {
    // 5. Sorting options
    if (sortBy === 'closing-soon') {
      return a.initialMinutesLeft - b.initialMinutesLeft
    }
    if (sortBy === 'price-low-high') {
      return a.currentBid - b.currentBid
    }
    if (sortBy === 'price-high-low') {
      return b.currentBid - a.currentBid
    }
    return 0
  })

  // Check if any filters are active
  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedCondition !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    sortBy !== 'closing-soon'

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedCondition('all')
    setMinPrice('')
    setMaxPrice('')
    setSortBy('closing-soon')
  }

  return (
    <div className="home-container">
      {/* HERO SECTION */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-pill-badge">
            <span className="pill-pulse"></span>
            <span>Live Campus Peer-to-Peer Auctions</span>
          </div>

          <h1 className="hero-headline">
            Buy & Sell On Campus with <span className="highlight-text">Live Student Bidding</span>
          </h1>

          <p className="hero-tagline">
            Turn your used textbooks, dorm furniture, bikes, and tech into cash — or grab campus essentials at student prices from peers next door.
          </p>

          {/* HERO ACTIONS */}
          <div className="hero-cta-group">
            <Link to="/auctions/create" className="btn-hero-primary">
              <span className="cta-icon">➕</span>
              <span>List an Item for Auction</span>
            </Link>
            <a href="#browse-section" className="btn-hero-secondary">
              <span>Explore Live Auctions</span>
              <span className="cta-arrow">↓</span>
            </a>
          </div>

          {/* CAMPUS TRUST BADGES */}
          <div className="trust-stats-grid">
            <div className="trust-stat-item">
              <span className="trust-icon">🎓</span>
              <div>
                <strong>Verified Students</strong>
                <p>Campus email authenticated</p>
              </div>
            </div>
            <div className="trust-stat-item">
              <span className="trust-icon">⚡</span>
              <div>
                <strong>0% Seller Fees</strong>
                <p>Keep 100% of your winning bids</p>
              </div>
            </div>
            <div className="trust-stat-item">
              <span className="trust-icon">🤝</span>
              <div>
                <strong>Safe Handoffs</strong>
                <p>On-campus public meetup spots</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH AND CATEGORIES SECTION */}
      <section id="browse-section" className="browse-controls-section">
        <div className="browse-header-row">
          <div>
            <h2 className="section-title">Live Campus Auctions</h2>
            <p className="section-subtitle">Real-time bids from fellow students across dorms and departments</p>
          </div>
          
          <Link to="/auctions/create" className="btn-secondary-list">
            <span>+ List an Item</span>
          </Link>
        </div>

        {/* 1. CATEGORY FILTERS: Books, Electronics, Cycles, Other Items */}
        <div id="categories" className="category-pills-bar">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === 'all'
                ? SAMPLE_AUCTIONS.length
                : SAMPLE_AUCTIONS.filter((a) => a.category === cat.id).length

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-label">{cat.label}</span>
                <span className="cat-count">{count}</span>
              </button>
            )
          })}
        </div>

        {/* 2. SEARCH & ADVANCED FILTER PANEL */}
        <div className="filter-panel-card">
          {/* SEARCH BAR (Filters by Title) */}
          <div className="filter-row-primary">
            <div className="search-input-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search auctions by item title (e.g. TI-84, Trek, Organic Chemistry)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* SORTING CONTROLS */}
            <div className="filter-control-group sort-group">
              <label htmlFor="sort-select" className="filter-label">Sort By:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECONDARY FILTERS: Condition & Price Range */}
          <div className="filter-row-secondary">
            {/* CONDITION FILTER: New, Like New, Good, Fair */}
            <div className="filter-control-group">
              <label htmlFor="condition-select" className="filter-label">Condition:</label>
              <select
                id="condition-select"
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="filter-select"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            {/* PRICE RANGE FILTER: Min Price & Max Price */}
            <div className="filter-control-group price-range-group">
              <span className="filter-label">Price Range ($):</span>
              <div className="price-inputs-wrapper">
                <div className="price-input-container">
                  <span className="price-prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="price-input"
                  />
                </div>
                <span className="price-separator">to</span>
                <div className="price-input-container">
                  <span className="price-prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="price-input"
                  />
                </div>
              </div>
            </div>

            {/* RESET ALL BUTTON */}
            {isFilterActive && (
              <button
                type="button"
                className="btn-clear-all-filters"
                onClick={handleResetFilters}
              >
                ✕ Reset Filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* AUCTION CARDS GRID */}
      <section className="auction-grid-section">
        <div className="results-meta-bar">
          <span className="results-count-text">
            Showing <strong>{filteredAuctions.length}</strong> {filteredAuctions.length === 1 ? 'item' : 'items'}
            {selectedCategory !== 'all' && (
              <span className="active-tag-chip">
                Category: <strong>{CATEGORIES.find((c) => c.id === selectedCategory)?.label}</strong>
              </span>
            )}
            {selectedCondition !== 'all' && (
              <span className="active-tag-chip">
                Condition: <strong>{selectedCondition}</strong>
              </span>
            )}
            {(minPrice !== '' || maxPrice !== '') && (
              <span className="active-tag-chip">
                Price: <strong>${minPrice || '0'} - ${maxPrice || '∞'}</strong>
              </span>
            )}
            {searchQuery && (
              <span className="active-tag-chip">
                Title: <strong>"{searchQuery}"</strong>
              </span>
            )}
          </span>

          {isFilterActive && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
            >
              Clear All
            </button>
          )}
        </div>

        {/* 6. FRIENDLY NO-RESULTS MESSAGE */}
        {filteredAuctions.length === 0 ? (
          <div className="empty-results-card">
            <span className="empty-icon">🔍</span>
            <h3>No items match your selected filters</h3>
            <p>
              We couldn't find any auctions matching your current filter combination.
              Try adjusting your price range, clearing specific filters, or searching with different keywords.
            </p>
            <div className="empty-actions">
              <button
                type="button"
                className="btn-reset-filters-large"
                onClick={handleResetFilters}
              >
                Reset All Filters
              </button>
              <Link to="/auctions/create" className="btn-hero-primary">
                + List an Item Instead
              </Link>
            </div>
          </div>
        ) : (
          <div className="auction-grid">
            {filteredAuctions.map((item) => {
              const time = formatTimeRemaining(item.initialMinutesLeft)
              const sellerName = typeof item.seller === 'object' ? item.seller.name : item.seller

              return (
                <article key={item.id} className="auction-card">
                  {/* CARD HEADER & THUMBNAIL (Clickable to detail page) */}
                  <Link to={`/auctions/${item.id}`} className="card-media-banner-link">
                    <div className="card-media-banner" style={{ borderTop: `4px solid ${item.accentColor}` }}>
                      <div className="media-visual-box">
                        <span className="media-item-emoji">{item.icon}</span>
                      </div>

                      <div className="card-top-badges">
                        <span className="badge-category">{item.categoryName}</span>
                        <span className="badge-condition">{item.condition}</span>
                      </div>

                      {item.tag && (
                        <span className={`badge-status-tag ${item.tag === 'Ending Soon' ? 'urgent' : ''}`}>
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* CARD BODY */}
                  <div className="card-body">
                    <Link to={`/auctions/${item.id}`} className="card-title-link">
                      <h3 className="card-title" title={item.title}>
                        {item.title}
                      </h3>
                    </Link>

                    {/* SELLER & LOCATION */}
                    <div className="card-seller-row">
                      <span className="seller-name">
                        👤 {sellerName}
                        {item.verifiedStudent && <span className="verified-check" title="Verified Campus Student">✓</span>}
                      </span>
                      <span className="seller-location">📍 {item.campusLocation}</span>
                    </div>

                    {/* TIME REMAINING TIMER */}
                    <div className={`countdown-bar ${time.isUrgent ? 'urgent' : ''}`}>
                      <span className="timer-icon">{time.isUrgent ? '🔥' : '⏳'}</span>
                      <span className="timer-text">{time.text}</span>
                    </div>

                    {/* PRICE & BID METRICS */}
                    <div className="card-price-grid">
                      <div className="price-box">
                        <span className="price-label">Current Bid</span>
                        <div className="price-value-row">
                          <span className="currency-symbol">$</span>
                          <span className="price-number">{item.currentBid}</span>
                        </div>
                      </div>

                      <div className="bids-stat-box">
                        <span className="bids-label">Activity</span>
                        <span className="bids-count-tag">{item.bidsCount} bids</span>
                        <span className="min-inc-text">+${item.minIncrement} min</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="card-footer-actions">
                      <Link to={`/auctions/${item.id}`} className="btn-card-bid">
                        <span>Place Bid</span>
                        <span className="bid-arrow">→</span>
                      </Link>
                      <Link to={`/auctions/${item.id}`} className="btn-card-details" title="View details">
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="how-it-works-section">
        <h2 className="section-title text-center">How Campus Auction Works</h2>
        <p className="section-subtitle text-center">Transparent bidding, zero transaction fees, and friendly campus meetups</p>

        <div className="steps-cards-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <span className="step-icon">📸</span>
            <h3>List Your Item</h3>
            <p>Snap a photo, choose starting bid, set timer, and describe your dorm item or textbook in under a minute.</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <span className="step-icon">⏱️</span>
            <h3>Students Bid Live</h3>
            <p>Peer students place bids in real-time. Watch the competition heat up as the countdown ticks down.</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <span className="step-icon">🤝</span>
            <h3>Meet & Exchange</h3>
            <p>The highest bidder wins! Connect directly to exchange the item safely on campus (library, student center, quad).</p>
          </div>
        </div>
      </section>

      {/* BOTTOM SELLER PROMO BANNER */}
      <section className="seller-callout-banner">
        <div className="callout-inner">
          <div className="callout-text">
            <h2>Ready to Declutter Your Dorm Room?</h2>
            <p>List textbooks, electronics, bikes, or furniture in under 60 seconds. Students are bidding right now.</p>
          </div>
          <div className="callout-action">
            <Link to="/auctions/create" className="btn-banner-list">
              <span className="callout-btn-icon">📦</span>
              <span>List an Item for Auction</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
