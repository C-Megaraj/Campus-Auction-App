import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CATEGORIES,
  CONDITIONS,
  SORT_OPTIONS,
} from '../utils/mockAuctions'
import { fetchListings } from '../services/api'
import AuctionCard from '../components/AuctionCard'
import './Home.css'

export default function Home() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Unfiltered baseline listings to compute category counts
  const [categoryCounts, setCategoryCounts] = useState({})
  const [totalCount, setTotalCount] = useState(0)

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedCondition, setSelectedCondition] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('closing-soon')

  // Real-time ticking state (seconds elapsed)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // Debounce ref
  const debounceTimerRef = useRef(null)

  // Load baseline counts for categories
  const loadBaselineCounts = useCallback(async () => {
    try {
      const data = await fetchListings()
      if (data && data.success && Array.isArray(data.listings)) {
        setTotalCount(data.listings.length)
        const counts = {}
        data.listings.forEach((item) => {
          const catName = (item.category_name || item.category || '').toLowerCase()
          if (catName.includes('book')) counts.books = (counts.books || 0) + 1
          else if (catName.includes('electr')) counts.electronics = (counts.electronics || 0) + 1
          else if (catName.includes('cycl')) counts.cycles = (counts.cycles || 0) + 1
          else counts.other = (counts.other || 0) + 1
        })
        setCategoryCounts(counts)
      }
    } catch {
      // Non-blocking baseline fetch
    }
  }, [])

  // Main fetch listings with query parameters
  const loadAuctions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {}
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (selectedCondition !== 'all') params.condition = selectedCondition
      if (minPrice !== '') params.min_price = minPrice
      if (maxPrice !== '') params.max_price = maxPrice
      if (sortBy) params.sort = sortBy

      const data = await fetchListings(params)
      if (data && data.success) {
        setListings(data.listings || [])
      } else {
        setError(data?.message || 'Failed to retrieve listings from server.')
      }
    } catch (err) {
      console.error('Error fetching listings:', err)
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to the backend server. Please verify the Express API and MySQL database are running.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedCondition, minPrice, maxPrice, sortBy])

  // Debounce API calls for text/price inputs, immediate for dropdowns/pills
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAuctions()
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [loadAuctions])

  // Initial mount: load category counts
  useEffect(() => {
    loadBaselineCounts()
  }, [loadBaselineCounts])

  // Live ticking timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
                ? totalCount || listings.length
                : categoryCounts[cat.id] ?? 0

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
        {/* RESULTS META BAR */}
        <div className="results-meta-bar">
          <div className="results-count-text">
            <span>Showing <strong>{listings.length}</strong> {listings.length === 1 ? 'item' : 'items'}</span>
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
          </div>

          {isFilterActive && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* ERROR STATE WITH RETRY */}
        {error && (
          <div className="api-error-card">
            <div className="api-error-header">
              <span className="error-icon">⚠️</span>
              <h3>Unable to Connect to Auction Server</h3>
            </div>
            <p className="error-description">
              {error}
            </p>
            <div className="error-actions">
              <button
                type="button"
                className="btn-retry-api"
                onClick={loadAuctions}
              >
                🔄 Retry Connection
              </button>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {loading && !error && (
          <div className="api-loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading live campus auctions from database...</p>
          </div>
        )}

        {/* EMPTY STATE: Database contains no listings */}
        {!loading && !error && listings.length === 0 && !isFilterActive && (
          <div className="empty-results-card">
            <span className="empty-icon">📦</span>
            <h3>No Active Auctions Yet</h3>
            <p>
              There are currently no live auction listings in the database. Be the first student to list textbooks, dorm items, or gear!
            </p>
            <div className="empty-actions">
              <Link to="/auctions/create" className="btn-hero-primary">
                + List the First Item
              </Link>
            </div>
          </div>
        )}

        {/* EMPTY STATE: No items match active filters */}
        {!loading && !error && listings.length === 0 && isFilterActive && (
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
        )}

        {/* AUCTIONS GRID */}
        {!loading && !error && listings.length > 0 && (
          <div className="auction-grid">
            {listings.map((item) => (
              <AuctionCard
                key={item.id}
                auction={item}
                secondsElapsed={secondsElapsed}
              />
            ))}
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
