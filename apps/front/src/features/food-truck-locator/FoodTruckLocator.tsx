import { useState } from 'react'
import { SearchInput } from './components/SearchInput'
import { MapView } from './components/MapView'
import { ResultsList } from './components/ResultsList'
import { useFacilitySearch } from './hooks/useFacilitySearch'
import { Facility, SearchParams } from './types/facility.types'

const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

export function FoodTruckLocator() {
  const [searchCenter, setSearchCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [selectedPermitId, setSelectedPermitId] = useState<string | null>(null)

  const { data: facilities = [], isLoading } = useFacilitySearch(searchParams)

  function handleSearch(lat: number, lng: number) {
    setSearchCenter([lat, lng])
    setSearchParams({ latitude: lat, longitude: lng })
    setSelectedPermitId(null)
  }

  function handleMapClick(lat: number, lng: number) {
    setSearchCenter([lat, lng])
    setSearchParams({ latitude: lat, longitude: lng })
    setSelectedPermitId(null)
  }

  function handleSelectFacility(facility: Facility) {
    setSelectedPermitId(facility.permitId)
    setSearchCenter([facility.latitude, facility.longitude])
  }

  return (
    <div className="food-truck-locator">
      <header className="food-truck-locator__header">
        <SearchInput onSearch={handleSearch} isLoading={isLoading} />
      </header>
      <main className="food-truck-locator__content">
        <div className="food-truck-locator__map">
          <MapView
            center={searchCenter}
            facilities={facilities}
            onMapClick={handleMapClick}
            highlightedPermitId={selectedPermitId}
          />
        </div>
        <aside className="food-truck-locator__sidebar">
          <ResultsList
            facilities={facilities}
            isLoading={isLoading}
            onSelectFacility={handleSelectFacility}
            selectedPermitId={selectedPermitId}
          />
        </aside>
      </main>
    </div>
  )
}
