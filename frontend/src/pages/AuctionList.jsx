import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function AuctionList() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)

    setLoading(true)
    api.get(`/auctions?${params}`)
      .then(({ data }) => setAuctions(data.auctions))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [search, category])

  const categories = ['electronics', 'books', 'clothing', 'sports', 'furniture', 'other']

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>Browse Auctions</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Search auctions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p>Loading auctions…</p>
      ) : auctions.length === 0 ? (
        <p>No auctions found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {auctions.map((a) => (
            <Link key={a._id} to={`/auctions/${a._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: 'var(--bg)', transition: 'box-shadow 0.2s' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)' }}>{a.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: '0 0 0.75rem' }}>{a.category} · {a.condition}</p>
                <p style={{ fontWeight: 600, color: 'var(--accent)', margin: 0 }}>
                  Current bid: ${a.currentBid > 0 ? a.currentBid : a.startingBid}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: '0.5rem' }}>
                  Ends: {new Date(a.endTime).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

