import React from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Facility } from '../types/facility.types'
import { FacilityMarker } from './FacilityMarker'
import { MapLegend } from './MapLegend'
import 'leaflet/dist/leaflet.css'

export interface MapViewProps {
  center: [number, number]
  facilities: Facility[]
  onMapClick?: (lat: number, lng: number) => void
  highlightedPermitId?: string | null
}

const DEFAULT_ZOOM = 14

interface RecenterProps {
  center: [number, number]
}

const Recenter: React.FC<RecenterProps> = ({ center }) => {
  const map = useMap()

  React.useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

interface ClickHandlerProps {
  onMapClick?: (lat: number, lng: number) => void
}

const ClickHandler: React.FC<ClickHandlerProps> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })

  return null
}

export const MapView: React.FC<MapViewProps> = ({
  center,
  facilities,
  onMapClick,
  highlightedPermitId,
}) => {
  return (
    <div className="map-view" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} />
        <ClickHandler onMapClick={onMapClick} />
        {facilities.map((facility) => (
          <FacilityMarker
            key={facility.permitId}
            facility={facility}
            isHighlighted={highlightedPermitId === facility.permitId}
          />
        ))}
      </MapContainer>
      <MapLegend />
    </div>
  )
}
