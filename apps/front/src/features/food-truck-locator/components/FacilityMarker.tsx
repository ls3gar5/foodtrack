import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Facility } from '../types/facility.types'

export interface FacilityMarkerProps {
  facility: Facility
  isHighlighted?: boolean
}

const TRUCK_ICON_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#2563eb" d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>
`)

const PUSH_CART_ICON_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#d97706" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
</svg>
`)

const TRUCK_ICON_HIGHLIGHTED_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#dc2626" d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>
`)

const PUSH_CART_ICON_HIGHLIGHTED_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#dc2626" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
</svg>
`)

function createIcon(svg: string, size: [number, number]): L.Icon {
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  })
}

const truckIcon = createIcon(TRUCK_ICON_SVG, [32, 32])
const pushCartIcon = createIcon(PUSH_CART_ICON_SVG, [32, 32])
const truckIconHighlighted = createIcon(TRUCK_ICON_HIGHLIGHTED_SVG, [40, 40])
const pushCartIconHighlighted = createIcon(PUSH_CART_ICON_HIGHLIGHTED_SVG, [40, 40])

function getIcon(facilityType: string, isHighlighted: boolean): L.Icon {
  const isTruck = facilityType.toLowerCase() === 'truck'

  if (isHighlighted) {
    return isTruck ? truckIconHighlighted : pushCartIconHighlighted
  }

  return isTruck ? truckIcon : pushCartIcon
}

export const FacilityMarker: React.FC<FacilityMarkerProps> = ({
  facility,
  isHighlighted = false,
}) => {
  const icon = getIcon(facility.facilityType, isHighlighted)

  return (
    <Marker
      position={[facility.latitude, facility.longitude]}
      icon={icon}
    >
      <Popup>
        <div className="facility-popup">
          <strong>{facility.applicant}</strong>
          <p>{facility.address}</p>
          <p>
            {facility.foodItems
              ? facility.foodItems
              : 'No food items listed'}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}
