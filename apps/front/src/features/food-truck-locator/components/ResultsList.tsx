import React from 'react'
import { Facility } from '../types/facility.types'
import { ResultCard } from './ResultCard'

export interface ResultsListProps {
  facilities: Facility[]
  isLoading: boolean
  onSelectFacility: (facility: Facility) => void
  selectedPermitId?: string | null
}

export function ResultsList({
  facilities,
  isLoading,
  onSelectFacility,
  selectedPermitId,
}: ResultsListProps) {
  if (isLoading) {
    return (
      <div className="results-list results-list--loading" role="status" aria-live="polite">
        <span className="results-list__spinner" aria-label="Loading results" />
        <p>Loading nearby food trucks...</p>
      </div>
    )
  }

  if (facilities.length === 0) {
    return (
      <div className="results-list results-list--empty" role="status" aria-live="polite">
        <p>No food trucks found near this location</p>
      </div>
    )
  }

  return (
    <ul className="results-list" aria-label="Food truck results">
      {facilities.map((facility) => (
        <ResultCard
          key={facility.permitId}
          facility={facility}
          isSelected={facility.permitId === selectedPermitId}
          onSelect={onSelectFacility}
        />
      ))}
    </ul>
  )
}
