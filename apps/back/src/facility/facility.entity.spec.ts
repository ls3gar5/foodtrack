import { FacilityEntity } from './facility.entity'

describe('FacilityEntity', () => {
  it('should create an instance with all required fields', () => {
    const entity = new FacilityEntity()
    entity.permitId = '12345'
    entity.applicant = 'Test Truck LLC'
    entity.facilityType = 'Truck'
    entity.address = '123 Main St'
    entity.foodItems = 'Tacos, Burritos'
    entity.location = {
      type: 'Point',
      coordinates: [-122.4194, 37.7749],
    }
    entity.latitude = 37.7749
    entity.longitude = -122.4194
    entity.permitStatus = 'APPROVED'

    expect(entity.permitId).toBe('12345')
    expect(entity.applicant).toBe('Test Truck LLC')
    expect(entity.facilityType).toBe('Truck')
    expect(entity.address).toBe('123 Main St')
    expect(entity.foodItems).toBe('Tacos, Burritos')
    expect(entity.location.type).toBe('Point')
    expect(entity.location.coordinates).toEqual([-122.4194, 37.7749])
    expect(entity.latitude).toBe(37.7749)
    expect(entity.longitude).toBe(-122.4194)
    expect(entity.permitStatus).toBe('APPROVED')
  })

  it('should allow null food_items', () => {
    const entity = new FacilityEntity()
    entity.foodItems = null

    expect(entity.foodItems).toBeNull()
  })
})
