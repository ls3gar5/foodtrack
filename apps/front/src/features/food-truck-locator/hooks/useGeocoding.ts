import { useState, useCallback } from 'react'

interface GeocodingResult {
  lat: number
  lng: number
}

interface GeocodingState {
  geocode: (address: string) => Promise<GeocodingResult>
  isLoading: boolean
  error: string | null
}

const GEOCODING_TIMEOUT_MS = 5000

export function useGeocoding(): GeocodingState {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocode = useCallback(async (address: string): Promise<GeocodingResult> => {
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS)

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        throw new Error('Could not find that address.')
      }

      const result: GeocodingResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }

      return result
    } catch (err) {
      const message = err instanceof Error && err.name === 'AbortError'
        ? 'Geocoding request timed out.'
        : err instanceof Error
          ? err.message
          : 'Could not find that address.'

      setError(message)
      throw new Error(message)
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }, [])

  return { geocode, isLoading, error }
}
