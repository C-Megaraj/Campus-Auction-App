import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Request interceptor to attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if 401 occurs on protected mutations, not on public browsing or initial auth check
    const url = error.config?.url || ''
    const isPublicAuthOrBrowse =
      url.includes('/listings') && error.config.method === 'get' ||
      url.includes('/auth/me') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register')

    if (error.response?.status === 401 && !isPublicAuthOrBrowse) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Fetch listings from backend API with optional search, filters & sort
 */
export const fetchListings = async (params = {}) => {
  const { data } = await api.get('/listings', { params })
  return data
}

/**
 * Fetch a single listing by its ID
 */
export const fetchListingById = async (id) => {
  const { data } = await api.get(`/listings/${id}`)
  return data
}

/**
 * Fetch listings created by the authenticated student
 */
export const fetchMyListings = async () => {
  const { data } = await api.get('/listings/my-listings')
  return data
}

/**
 * Create a new auction listing (Authenticated)
 */
export const createListing = async (listingData) => {
  const { data } = await api.post('/listings', listingData)
  return data
}

/**
 * Update an existing auction listing (Owner only)
 */
export const updateListing = async (id, listingData) => {
  const { data } = await api.put(`/listings/${id}`, listingData)
  return data
}

/**
 * Cancel an auction listing (Owner only)
 */
export const cancelListing = async (id) => {
  const { data } = await api.delete(`/listings/${id}`)
  return data
}

export default api
