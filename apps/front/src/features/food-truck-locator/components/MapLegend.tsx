import React from 'react'

const legendStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'white',
    padding: '10px 14px',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    fontSize: '13px',
    lineHeight: '1.6',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: '6px',
    fontSize: '14px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  truckIcon: {
    width: '16px',
    height: '16px',
    backgroundColor: '#2563eb',
    borderRadius: '3px',
  },
  pushCartIcon: {
    width: '16px',
    height: '16px',
    backgroundColor: '#d97706',
    borderRadius: '50%',
  },
}

export const MapLegend: React.FC = () => {
  return (
    <div style={legendStyles.container} data-testid="map-legend">
      <div style={legendStyles.title}>Legend</div>
      <div style={legendStyles.item}>
        <span style={legendStyles.truckIcon} aria-hidden="true" />
        <span>Truck</span>
      </div>
      <div style={legendStyles.item}>
        <span style={legendStyles.pushCartIcon} aria-hidden="true" />
        <span>Push Cart</span>
      </div>
    </div>
  )
}
