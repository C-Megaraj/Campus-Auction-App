/**
 * Formats image URLs:
 * If the URL is relative (e.g. "/uploads/item-123.jpg"), prepend the backend host.
 * If already an absolute HTTP/HTTPS URL, return as is.
 */
export function formatImageUrl(url) {
  if (!url) return null
  const trimmed = String(url).trim()
  if (!trimmed) return null

  // If already absolute (http://, https://, data:)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed
  }

  // Prepend backend base host (default http://localhost:5000)
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const backendHost = apiBase.replace(/\/api\/?$/, '')
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${backendHost}${cleanPath}`
}

