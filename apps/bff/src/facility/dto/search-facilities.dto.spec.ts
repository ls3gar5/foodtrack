import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { SearchFacilitiesDto } from './search-facilities.dto'

describe('SearchFacilitiesDto', () => {
  function createDto(params: Record<string, unknown>): SearchFacilitiesDto {
    return plainToInstance(SearchFacilitiesDto, params)
  }

  describe('latitude', () => {
    it('should accept a valid latitude', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194' })
      const errors = await validate(dto)
      const latErrors = errors.filter((e) => e.property === 'latitude')
      expect(latErrors).toHaveLength(0)
    })

    it('should reject latitude above 90', async () => {
      const dto = createDto({ latitude: '91', longitude: '-122.4194' })
      const errors = await validate(dto)
      const latErrors = errors.filter((e) => e.property === 'latitude')
      expect(latErrors.length).toBeGreaterThan(0)
    })

    it('should reject latitude below -90', async () => {
      const dto = createDto({ latitude: '-91', longitude: '-122.4194' })
      const errors = await validate(dto)
      const latErrors = errors.filter((e) => e.property === 'latitude')
      expect(latErrors.length).toBeGreaterThan(0)
    })

    it('should reject missing latitude', async () => {
      const dto = createDto({ longitude: '-122.4194' })
      const errors = await validate(dto)
      const latErrors = errors.filter((e) => e.property === 'latitude')
      expect(latErrors.length).toBeGreaterThan(0)
    })
  })

  describe('longitude', () => {
    it('should accept a valid longitude', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194' })
      const errors = await validate(dto)
      const lngErrors = errors.filter((e) => e.property === 'longitude')
      expect(lngErrors).toHaveLength(0)
    })

    it('should reject longitude above 180', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '181' })
      const errors = await validate(dto)
      const lngErrors = errors.filter((e) => e.property === 'longitude')
      expect(lngErrors.length).toBeGreaterThan(0)
    })

    it('should reject longitude below -180', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-181' })
      const errors = await validate(dto)
      const lngErrors = errors.filter((e) => e.property === 'longitude')
      expect(lngErrors.length).toBeGreaterThan(0)
    })
  })

  describe('radius', () => {
    it('should default to 1000 when not provided', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194' })
      expect(dto.radius).toBe(1000)
    })

    it('should accept a valid radius', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194', radius: '5000' })
      const errors = await validate(dto)
      const radiusErrors = errors.filter((e) => e.property === 'radius')
      expect(radiusErrors).toHaveLength(0)
    })

    it('should reject radius below 100', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194', radius: '50' })
      const errors = await validate(dto)
      const radiusErrors = errors.filter((e) => e.property === 'radius')
      expect(radiusErrors.length).toBeGreaterThan(0)
    })

    it('should reject radius above 10000', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194', radius: '20000' })
      const errors = await validate(dto)
      const radiusErrors = errors.filter((e) => e.property === 'radius')
      expect(radiusErrors.length).toBeGreaterThan(0)
    })
  })

  describe('foodType', () => {
    it('should accept valid comma-separated food terms', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        foodType: 'tacos,burritos',
      })
      const errors = await validate(dto)
      const foodErrors = errors.filter((e) => e.property === 'foodType')
      expect(foodErrors).toHaveLength(0)
    })

    it('should reject a term shorter than 2 characters', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        foodType: 'a,burritos',
      })
      const errors = await validate(dto)
      const foodErrors = errors.filter((e) => e.property === 'foodType')
      expect(foodErrors.length).toBeGreaterThan(0)
    })

    it('should reject more than 10 terms', async () => {
      const terms = Array.from({ length: 11 }, (_, i) => `food${i}`).join(',')
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        foodType: terms,
      })
      const errors = await validate(dto)
      const foodErrors = errors.filter((e) => e.property === 'foodType')
      expect(foodErrors.length).toBeGreaterThan(0)
    })

    it('should reject empty foodType', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        foodType: '',
      })
      const errors = await validate(dto)
      const foodErrors = errors.filter((e) => e.property === 'foodType')
      expect(foodErrors.length).toBeGreaterThan(0)
    })

    it('should be optional', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194' })
      const errors = await validate(dto)
      const foodErrors = errors.filter((e) => e.property === 'foodType')
      expect(foodErrors).toHaveLength(0)
    })
  })

  describe('facilityType', () => {
    it('should accept "Truck"', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        facilityType: 'Truck',
      })
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors).toHaveLength(0)
    })

    it('should accept "Push Cart"', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        facilityType: 'Push Cart',
      })
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors).toHaveLength(0)
    })

    it('should accept case-insensitive "truck" and normalize to "Truck"', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        facilityType: 'truck',
      })
      expect(dto.facilityType).toBe('Truck')
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors).toHaveLength(0)
    })

    it('should accept case-insensitive "push cart" and normalize to "Push Cart"', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        facilityType: 'push cart',
      })
      expect(dto.facilityType).toBe('Push Cart')
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors).toHaveLength(0)
    })

    it('should reject invalid facility type', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        facilityType: 'Van',
      })
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors.length).toBeGreaterThan(0)
    })

    it('should be optional', async () => {
      const dto = createDto({ latitude: '37.7749', longitude: '-122.4194' })
      const errors = await validate(dto)
      const typeErrors = errors.filter((e) => e.property === 'facilityType')
      expect(typeErrors).toHaveLength(0)
    })
  })

  describe('combined validation', () => {
    it('should accept all valid parameters together', async () => {
      const dto = createDto({
        latitude: '37.7749',
        longitude: '-122.4194',
        radius: '2000',
        foodType: 'tacos,pizza',
        facilityType: 'Truck',
      })
      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })
  })
})
