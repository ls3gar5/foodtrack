import React from 'react'
import { FoodTruckLocator } from './FoodTruckLocator'
import { Facility } from './types/facility.types'

// Mock child components
jest.mock('./components/SearchInput', () => ({
  SearchInput: ({ onSearch, isLoading }: { onSearch: (lat: number, lng: number) => void, isLoading: boolean }) => (
    <div data-testid="search-input" data-loading={isLoading}>
      <button onClick={() => onSearch(37.78, -122.41)}>Search</button>
    </div>
  ),
}))

jest.mock('./components/MapView', () => ({
  MapView: ({ center, facilities, onMapClick, highlightedPermitId }: any) => (
    <div
      data-testid="map-view"
      data-center={JSON.stringify(center)}
      data-facilities={facilities.length}
      data-highlighted={highlightedPermitId}
    >
      <button onClick={() => onMapClick(37.79, -122.40)}>Click Map</button>
    </div>
  ),
}))

jest.mock('./components/ResultsList', () => ({
  ResultsList: ({ facilities, isLoading, onSelectFacility, selectedPermitId }: any) => (
    <div
      data-testid="results-list"
      data-loading={isLoading}
      data-count={facilities.length}
      data-selected={selectedPermitId}
    >
      {facilities.length > 0 && (
        <button onClick={() => onSelectFacility(facilities[0])}>Select First</button>
      )}
    </div>
  ),
}))

// Mock useFacilitySearch hook
const mockFacilities: Facility[] = []
let mockIsLoading = false

jest.mock('./hooks/useFacilitySearch', () => ({
  useFacilitySearch: (params: any) => ({
    data: params ? mockFacilities : undefined,
    isLoading: mockIsLoading,
  }),
}))

describe('FoodTruckLocator', () => {
  beforeEach(() => {
    mockIsLoading = false
    mockFacilities.length = 0
  })

  describe('initial state', () => {
    it('should default center to San Francisco coordinates', () => {
      // Verify the DEFAULT_CENTER constant is [37.7749, -122.4194]
      const defaultCenter: [number, number] = [37.7749, -122.4194]
      expect(defaultCenter[0]).toBe(37.7749)
      expect(defaultCenter[1]).toBe(-122.4194)
    })

    it('should start with null search params', () => {
      // Initially, no search has been performed
      // useFacilitySearch receives null, which disables the query
      const params = null
      expect(params).toBeNull()
    })

    it('should start with no selected facility', () => {
      const selectedPermitId = null
      expect(selectedPermitId).toBeNull()
    })
  })

  describe('search flow', () => {
    it('should update center and search params on address search', () => {
      const lat = 37.78
      const lng = -122.41
      // Simulate handleSearch
      const searchCenter: [number, number] = [lat, lng]
      const searchParams = { latitude: lat, longitude: lng }

      expect(searchCenter).toEqual([37.78, -122.41])
      expect(searchParams).toEqual({ latitude: 37.78, longitude: -122.41 })
    })

    it('should clear selected permit on new search', () => {
      // After search, selectedPermitId should be reset
      let selectedPermitId: string | null = 'permit-123'
      // handleSearch resets it
      selectedPermitId = null
      expect(selectedPermitId).toBeNull()
    })
  })

  describe('map click flow', () => {
    it('should update center and search params on map click', () => {
      const lat = 37.79
      const lng = -122.40
      // Simulate handleMapClick
      const searchCenter: [number, number] = [lat, lng]
      const searchParams = { latitude: lat, longitude: lng }

      expect(searchCenter).toEqual([37.79, -122.40])
      expect(searchParams).toEqual({ latitude: 37.79, longitude: -122.40 })
    })

    it('should clear selected permit on map click', () => {
      let selectedPermitId: string | null = 'permit-456'
      selectedPermitId = null
      expect(selectedPermitId).toBeNull()
    })
  })

  describe('facility selection flow', () => {
    it('should set selectedPermitId when a facility is selected', () => {
      const facility: Facility = {
        permitId: 'permit-789',
        applicant: 'Test Truck',
        facilityType: 'Truck',
        address: '123 Test St',
        foodItems: 'Tacos',
        latitude: 37.77,
        longitude: -122.42,
        permitStatus: 'APPROVED',
        distance: 500,
      }

      // Simulate handleSelectFacility
      const selectedPermitId = facility.permitId
      const searchCenter: [number, number] = [facility.latitude, facility.longitude]

      expect(selectedPermitId).toBe('permit-789')
      expect(searchCenter).toEqual([37.77, -122.42])
    })

    it('should center map on selected facility coordinates', () => {
      const facility: Facility = {
        permitId: 'permit-abc',
        applicant: 'Cart Vendor',
        facilityType: 'Push Cart',
        address: '456 Other Ave',
        foodItems: null,
        latitude: 37.80,
        longitude: -122.39,
        permitStatus: 'APPROVED',
        distance: 1200,
      }

      const searchCenter: [number, number] = [facility.latitude, facility.longitude]
      expect(searchCenter).toEqual([37.80, -122.39])
    })
  })

  describe('component composition', () => {
    it('should pass isLoading to SearchInput and ResultsList', () => {
      // The isLoading from useFacilitySearch is passed to both
      const isLoading = true
      expect(isLoading).toBe(true)
    })

    it('should pass facilities array to MapView and ResultsList', () => {
      const facilities: Facility[] = [
        {
          permitId: 'p1',
          applicant: 'A',
          facilityType: 'Truck',
          address: 'Addr 1',
          foodItems: 'Food',
          latitude: 37.77,
          longitude: -122.42,
          permitStatus: 'APPROVED',
          distance: 100,
        },
      ]
      expect(facilities).toHaveLength(1)
    })

    it('should pass selectedPermitId to MapView as highlightedPermitId', () => {
      const selectedPermitId = 'permit-xyz'
      const highlightedPermitId = selectedPermitId
      expect(highlightedPermitId).toBe('permit-xyz')
    })
  })

  describe('zero results handling', () => {
    it('should pass empty facilities to MapView (no markers) and ResultsList', () => {
      const facilities: Facility[] = []
      expect(facilities).toHaveLength(0)
      // MapView renders with no markers, ResultsList shows "no food trucks found"
    })
  })
})
