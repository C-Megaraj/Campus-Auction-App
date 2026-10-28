import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Profile() {
  const { user, logout } = useAuth()
  const [listings, setListings] = useState([])

  useEffect(() => {
    if (user) {
      api.get(`/users/${user.id}/listings`)
        .then(({ data }) => setListings(data.auctions))
        .catch(console.error)
    }
  }, [user])

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      <h2>My Profile</h2>
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px' }}>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
      </div>

      <h3>My Listings ({listings.length})</h3>
      {listings.length === 0 ? (
        <p>No listings yet. <Link to="/auctions/create">List your first item!</Link></p>
      ) : (
        <div>
          {listings.map((a) => (
            <Link key={a._id} to={`/auctions/${a._id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <strong>{a.title}</strong>
              <span style={{ float: 'right', color: 'var(--accent)' }}>${a.currentBid || a.startingBid}</span>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)' }}>{a.status} · Ends {new Date(a.endTime).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

