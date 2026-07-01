import React from 'react'
import { Facility } from '../types/facility.types'

export function formatDistance(meters: number): string {
  const miles = meters * 0.000621371
  return `${miles.toFixed(1)} mi`
}

export function truncateFoodItems(foodItems: string | null): string {
  if (!foodItems) return 'No food items listed'
  if (foodItems.length <= 80) return foodItems
  return foodItems.slice(0, 80) + '...'
}

export interface ResultCardProps {
  facility: Facility
  isSelected?: boolean
  onSelect: (facility: Facility) => void
}

export function ResultCard({ facility, isSelected, onSelect }: ResultCardProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`result-card${isSelected ? ' result-card--selected' : ''}`}
      onClick={() => onSelect(facility)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(facility)
        }
      }}
    >
      <h3 className="result-card__name">{facility.applicant}</h3>
      <span className="result-card__distance">{formatDistance(facility.distance)}</span>
      <span className="result-card__type">{facility.facilityType}</span>
      <p className="result-card__food-items">
        {facility.foodItems
          ? truncateFoodItems(facility.foodItems)
          : <em>No food items listed</em>
        }
      </p>
    </li>
  )
}
