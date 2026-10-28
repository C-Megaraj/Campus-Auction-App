import { createContext, useContext, useState, useEffect } from 'react'

const WatchlistContext = createContext(null)
const STORAGE_KEY = 'campus_auction_watchlist'

export function WatchlistProvider({ children }) {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : ['auc-1', 'auc-6'] // Default demo items for immediate engagement
    } catch {
      return ['auc-1', 'auc-6']
    }
  })

  // Persist to localStorage whenever watchlist changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
    } catch (e) {
      console.warn('Could not save watchlist to localStorage', e)
    }
  }, [watchlist])

  const toggleWatchlist = (id) => {
    setWatchlist((prev) => {
      const exists = prev.includes(id)
      return exists ? prev.filter((item) => item !== id) : [...prev, id]
    })
  }

  const isWatched = (id) => watchlist.includes(id)

  const clearWatchlist = () => setWatchlist([])

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        watchlistCount: watchlist.length,
        toggleWatchlist,
        isWatched,
        clearWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  )
}

export const useWatchlist = () => {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within a WatchlistProvider')
  }
  return context
}

