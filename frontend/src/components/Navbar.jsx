import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar-wrapper">
      <div className="navbar-top-banner">
        <span>📍 Exclusive to Verified Campus Students • No Listing Fees • Safe Campus Handoff</span>
      </div>
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="brand-logo-badge">🎓</span>
            <div className="brand-text">
              <span className="brand-title">Campus<span className="brand-accent">Auction</span></span>
              <span className="brand-subtitle">Student Marketplace</span>
            </div>
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/" className="nav-link active">Home</Link>
          <Link to="/auctions" className="nav-link">Browse Auctions</Link>
          <a href="#categories" className="nav-link">Categories</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
        </div>

        <div className="navbar-right">
          <Link to="/auctions/create" className="btn-list-nav">
            <span className="btn-plus-icon">+</span>
            <span>List an Item</span>
          </Link>

          {user ? (
            <div className="user-nav-group">
              <Link to="/profile" className="user-profile-pill">
                <span className="user-avatar-circle">👤</span>
                <span className="user-nav-name">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="btn-nav-ghost">Logout</button>
            </div>
          ) : (
            <div className="auth-nav-group">
              <Link to="/login" className="btn-nav-ghost">Sign In</Link>
              <Link to="/register" className="btn-nav-primary">Join Free</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
