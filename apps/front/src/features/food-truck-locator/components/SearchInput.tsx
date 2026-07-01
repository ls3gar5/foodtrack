import { useState, FormEvent } from 'react'
import { useGeocoding } from '../hooks/useGeocoding'

export interface SearchInputProps {
  onSearch: (lat: number, lng: number) => void
  isLoading?: boolean
}

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

function parseCoordinates(input: string): { lat: number, lng: number } | null {
  const match = input.match(COORDINATE_PATTERN)
  if (!match) return null
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
}

function validateCoordinates(lat: number, lng: number): string | null {
  if (lat < -90 || lat > 90) return 'Coordinates are invalid. Latitude must be between -90 and 90.'
  if (lng < -180 || lng > 180) return 'Coordinates are invalid. Longitude must be between -180 and 180.'
  return null
}

export function SearchInput({ onSearch, isLoading = false }: SearchInputProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { geocode, isLoading: isGeocoding } = useGeocoding()

  const loading = isLoading || isGeocoding

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = input.trim()
    if (!trimmed) return

    const coords = parseCoordinates(trimmed)

    if (coords) {
      const validationError = validateCoordinates(coords.lat, coords.lng)
      if (validationError) {
        setError(validationError)
        return
      }
      onSearch(coords.lat, coords.lng)
    } else {
      try {
        const result = await geocode(trimmed)
        onSearch(result.lat, result.lng)
      } catch {
        setError('Could not find that address.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Location search">
      <div>
        <label htmlFor="search-input">Search location</label>
        <div>
          <input
            id="search-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter address or coordinates (e.g. 37.7749, -122.4194)"
            maxLength={200}
            disabled={loading}
            aria-describedby={error ? 'search-error' : undefined}
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {loading && (
          <div role="status" aria-live="polite">
            Loading...
          </div>
        )}
        {error && (
          <div id="search-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
      </div>
    </form>
  )
}
