import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

// Mock auction data representing campus items across the 4 required categories
// and 4 required conditions (New, Like New, Good, Fair)
const SAMPLE_AUCTIONS = [
  {
    id: 'auc-1',
    title: 'TI-84 Plus CE Color Graphing Calculator (With Charger & Case)',
    category: 'electronics',
    categoryName: 'Electronics',
    condition: 'Like New',
    currentBid: 68,
    startingBid: 30,
    minIncrement: 2,
    bidsCount: 14,
    initialMinutesLeft: 42,
    seller: 'Alex M.',
    campusLocation: 'Engineering Quad • Hall A',
    icon: '📟',
    accentColor: '#8b5cf6',
    verifiedStudent: true,
    tag: 'Ending Soon',
  },
  {
    id: 'auc-2',
    title: 'Organic Chemistry (Vollhardt & Schore 8th Ed) + Full Study Guide',
    category: 'books',
    categoryName: 'Books',
    condition: 'Good',
    currentBid: 45,
    startingBid: 20,
    minIncrement: 2,
    bidsCount: 9,
    initialMinutesLeft: 135,
    seller: 'Priya S.',
    campusLocation: 'Biochem Lab • Science Hall',
    icon: '📚',
    accentColor: '#3b82f6',
    verifiedStudent: true,
    tag: 'Course Required',
  },
  {
    id: 'auc-3',
    title: 'Trek FX 2 Disc Hybrid Commuter Bike (Medium Frame, with U-Lock)',
    category: 'cycles',
    categoryName: 'Cycles',
    condition: 'Like New',
    currentBid: 195,
    startingBid: 120,
    minIncrement: 5,
    bidsCount: 22,
    initialMinutesLeft: 340,
    seller: 'Marcus K.',
    campusLocation: 'West Dormitory Bicycle Bay',
    icon: '🚲',
    accentColor: '#10b981',
    verifiedStudent: true,
    tag: 'Popular',
  },
  {
    id: 'auc-4',
    title: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (Model U2720Q)',
    category: 'electronics',
    categoryName: 'Electronics',
    condition: 'New',
    currentBid: 230,
    startingBid: 150,
    minIncrement: 10,
    bidsCount: 18,
    initialMinutesLeft: 840,
    seller: 'Chen W.',
    campusLocation: 'Tech Village Tower 2',
    icon: '🖥️',
    accentColor: '#6366f1',
    verifiedStudent: true,
    tag: 'High Demand',
  },
  {
    id: 'auc-5',
    title: 'Compact Dorm Mini-Fridge with Top Freezer (3.2 cu. ft EnergyStar)',
    category: 'other',
    categoryName: 'Other Items',
    condition: 'Good',
    currentBid: 58,
    startingBid: 25,
    minIncrement: 3,
    bidsCount: 11,
    initialMinutesLeft: 75,
    seller: 'Sarah T.',
    campusLocation: 'East Quad Residence Hall',
    icon: '🧊',
    accentColor: '#f59e0b',
    verifiedStudent: true,
    tag: 'Must Go',
  },
  {
    id: 'auc-6',
    title: 'Sony WH-1000XM4 Noise Canceling Wireless Headphones (Silver)',
    category: 'electronics',
    categoryName: 'Electronics',
    condition: 'Like New',
    currentBid: 145,
    startingBid: 85,
    minIncrement: 5,
    bidsCount: 16,
    initialMinutesLeft: 52,
    seller: 'Elena R.',
    campusLocation: 'Law Library Study Lounge',
    icon: '🎧',
    accentColor: '#ec4899',
    verifiedStudent: true,
    tag: 'Ending Soon',
  },
  {
    id: 'auc-7',
    title: 'Official Campus Championship Vintage Navy Hoodie (Size Large)',
    category: 'other',
    categoryName: 'Other Items',
    condition: 'Like New',
    currentBid: 32,
    startingBid: 15,
    minIncrement: 1,
    bidsCount: 7,
    initialMinutesLeft: 1280,
    seller: 'Jordan L.',
    campusLocation: 'Student Athletic Center',
    icon: '👕',
    accentColor: '#0ea5e9',
    verifiedStudent: true,
    tag: 'Collector',
  },
  {
    id: 'auc-8',
    title: 'Ergonomic High-Back Mesh Desk Chair with 3D Armrests',
    category: 'other',
    categoryName: 'Other Items',
    condition: 'Good',
    currentBid: 82,
    startingBid: 40,
    minIncrement: 5,
    bidsCount: 13,
    initialMinutesLeft: 610,
    seller: 'Kevin P.',
    campusLocation: 'South Quad Apartments',
    icon: '🪑',
    accentColor: '#14b8a6',
    verifiedStudent: true,
    tag: 'Dorm Essential',
  },
  {
    id: 'auc-9',
    title: 'Calculus: Early Transcendentals (Stewart 9th Edition Hardcover)',
    category: 'books',
    categoryName: 'Books',
    condition: 'New',
    currentBid: 75,
    startingBid: 45,
    minIncrement: 5,
    bidsCount: 8,
    initialMinutesLeft: 210,
    seller: 'Maya J.',
    campusLocation: 'Math Dept • East Hall',
    icon: '📖',
    accentColor: '#0284c7',
    verifiedStudent: true,
    tag: 'Brand New',
  },
  {
    id: 'auc-10',
    title: 'Vintage Raleigh 10-Speed Road Bicycle (Rideable, Solid Steel Frame)',
    category: 'cycles',
    categoryName: 'Cycles',
    condition: 'Fair',
    currentBid: 40,
    startingBid: 25,
    minIncrement: 2,
    bidsCount: 15,
    initialMinutesLeft: 18,
    seller: 'Liam D.',
    campusLocation: 'North Campus Bike Rack',
    icon: '🚲',
    accentColor: '#e11d48',
    verifiedStudent: true,
    tag: 'Ending Soon',
  },
  {
    id: 'auc-11',
    title: 'Logitech MX Master 3S Wireless Performance Mouse (Graphite)',
    category: 'electronics',
    categoryName: 'Electronics',
    condition: 'Like New',
    currentBid: 52,
    startingBid: 30,
    minIncrement: 2,
    bidsCount: 12,
    initialMinutesLeft: 95,
    seller: 'David K.',
    campusLocation: 'CS Computer Lab B',
    icon: '🖱️',
    accentColor: '#6366f1',
    verifiedStudent: true,
    tag: 'High Demand',
  },
  {
    id: 'auc-12',
    title: 'Dorm Multi-Angle Floor Lamp with Warm Reading Light',
    category: 'other',
    categoryName: 'Other Items',
    condition: 'Fair',
    currentBid: 16,
    startingBid: 10,
    minIncrement: 1,
    bidsCount: 5,
    initialMinutesLeft: 110,
    seller: 'Emily R.',
    campusLocation: 'West Tower Common Room',
    icon: '💡',
    accentColor: '#ca8a04',
    verifiedStudent: true,
    tag: 'Budget Pick',
  },
]

// 4 Required Categories + All
const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: '✨' },
  { id: 'books', label: 'Books', icon: '📚' },
  { id: 'electronics', label: 'Electronics', icon: '💻' },
  { id: 'cycles', label: 'Cycles', icon: '🚲' },
  { id: 'other', label: 'Other Items', icon: '📦' },
]

// 4 Required Conditions + All
const CONDITIONS = [
  { id: 'all', label: 'All Conditions' },
  { id: 'New', label: 'New' },
  { id: 'Like New', label: 'Like New' },
  { id: 'Good', label: 'Good' },
  { id: 'Fair', label: 'Fair' },
]

// Required Sorting Options
const SORT_OPTIONS = [
  { id: 'closing-soon', label: 'Closing Soon' },
  { id: 'price-low-high', label: 'Price: Low to High' },
  { id: 'price-high-low', label: 'Price: High to Low' },
]

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

              return (
                <article key={item.id} className="auction-card">
                  {/* CARD HEADER & THUMBNAIL */}
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

                  {/* CARD BODY */}
                  <div className="card-body">
                    <h3 className="card-title" title={item.title}>
                      {item.title}
                    </h3>

                    {/* SELLER & LOCATION */}
                    <div className="card-seller-row">
                      <span className="seller-name">
                        👤 {item.seller}
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
