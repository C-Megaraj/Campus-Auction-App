import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function AuctionDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auction, setAuction] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')

  useEffect(() => {
    api.get(`/auctions/${id}`)
      .then(({ data }) => setAuction(data.auction))
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false))
  }, [id])

  const handleBid = async (e) => {
    e.preventDefault()
    setBidError('')
    setBidSuccess('')
    try {
      await api.post(`/bids/${id}`, { amount: Number(bidAmount) })
      setBidSuccess('Bid placed successfully!')
      // Refresh auction
      const { data } = await api.get(`/auctions/${id}`)
      setAuction(data.auction)
      setBidAmount('')
    } catch (err) {
      setBidError(err.response?.data?.message || 'Failed to place bid')
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading…</p>
  if (!auction) return null

  const minBid = auction.currentBid > 0
    ? auction.currentBid + auction.minBidIncrement
    : auction.startingBid

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
      <h2>{auction.title}</h2>
      <p style={{ color: 'var(--text)' }}>{auction.description}</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <span>Category: <strong>{auction.category}</strong></span>
        <span>Condition: <strong>{auction.condition}</strong></span>
        <span>Status: <strong>{auction.status}</strong></span>
      </div>
      <p style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 600 }}>
        Current bid: ${auction.currentBid > 0 ? auction.currentBid : auction.startingBid}
      </p>
      <p>Ends: {new Date(auction.endTime).toLocaleString()}</p>
      <p>Seller: {auction.seller?.name} {auction.seller?.college && `· ${auction.seller.college}`}</p>

      {user && user.id !== auction.seller?._id && auction.status === 'active' && (
        <form onSubmit={handleBid} style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <input
            type="number" min={minBid} step="0.01"
            placeholder={`Bid at least $${minBid}`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            required
            style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
          />
          <button type="submit" style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '6px', cursor: 'pointer' }}>
            Place Bid
          </button>
        </form>
      )}
      {bidError && <p style={{ color: 'red', marginTop: '0.5rem' }}>{bidError}</p>}
      {bidSuccess && <p style={{ color: 'green', marginTop: '0.5rem' }}>{bidSuccess}</p>}

      {auction.bids?.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Bid History</h3>
          {[...auction.bids].reverse().map((bid) => (
            <div key={bid._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span>{bid.bidder?.name || 'Anonymous'}</span>
              <strong>${bid.amount}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

