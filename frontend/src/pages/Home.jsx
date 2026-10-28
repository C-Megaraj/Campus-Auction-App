import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Home.css'

export default function Home() {
  const { user } = useAuth()
  return (
    <div className="home">
      <section className="hero">
        <h1>Campus Auction</h1>
        <p className="hero-sub">Buy and sell items with fellow students — fast, easy, and local.</p>
        <div className="hero-actions">
          <Link to="/auctions" className="btn-primary">Browse Auctions</Link>
          {!user && <Link to="/register" className="btn-secondary">Join Free</Link>}
          {user && <Link to="/auctions/create" className="btn-secondary">List an Item</Link>}
        </div>
      </section>
    </div>
  )
}

