import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const CATEGORIES = ['electronics', 'books', 'clothing', 'sports', 'furniture', 'other']
const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'poor']

export default function CreateAuction() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', category: '', condition: '',
    startingBid: '', minBidIncrement: 1, endTime: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auctions', {
        ...form,
        startingBid: Number(form.startingBid),
        minBidIncrement: Number(form.minBidIncrement),
      })
      navigate(`/auctions/${data.auction._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    display: 'block', width: '100%', padding: '0.6rem 0.75rem',
    borderRadius: '6px', border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-h)',
    boxSizing: 'border-box', marginBottom: '1rem',
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>List an Item</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input style={fieldStyle} required value={form.title} onChange={set('title')} placeholder="e.g. MacBook Pro 2021" />

        <label>Description</label>
        <textarea style={{ ...fieldStyle, minHeight: '100px' }} required value={form.description} onChange={set('description')} placeholder="Describe your item…" />

        <label>Category</label>
        <select style={fieldStyle} required value={form.category} onChange={set('category')}>
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label>Condition</label>
        <select style={fieldStyle} required value={form.condition} onChange={set('condition')}>
          <option value="">Select condition</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label>Starting Bid ($)</label>
        <input style={fieldStyle} type="number" min="0" step="0.01" required value={form.startingBid} onChange={set('startingBid')} />

        <label>Min Bid Increment ($)</label>
        <input style={fieldStyle} type="number" min="1" step="0.01" value={form.minBidIncrement} onChange={set('minBidIncrement')} />

        <label>Auction End Time</label>
        <input style={fieldStyle} type="datetime-local" required value={form.endTime} onChange={set('endTime')} />

        <button type="submit" disabled={loading}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Creating…' : 'Create Auction'}
        </button>
      </form>
    </div>
  )
}

