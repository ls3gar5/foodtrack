import * as fc from 'fast-check'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SearchFacilitiesDto } from './dto/search-facilities.dto'
import { FacilityCacheService } from './facility-cache.service'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'
import { FacilityEntity } from './facility.entity'

function createDto(params: Record<string, unknown>): SearchFacilitiesDto {
  return plainToInstance(SearchFacilitiesDto, params)
}

describe('Facility Property Tests — Validation and Caching (Properties 7-10, 14-15)', () => {
  /**
   * Property 7: Invalid coordinates/radius rejected with 400
   * Validates: Requirements 2.5
   *
   * For any latitude outside [-90, 90], longitude outside [-180, 180],
   * or radius outside [100, 10000], validation SHALL produce errors.
   */
  describe('Property 7: Invalid coordinates/radius rejected with 400', () => {
    it('should reject latitude outside [-90, 90]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: 90.0001, max: 1000, noNaN: true }),
            fc.double({ min: -1000, max: -90.0001, noNaN: true }),
          ),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (invalidLat, validLng) => {
            const dto = createDto({
              latitude: String(invalidLat),
              longitude: String(validLng),
            })
            const errors = await validate(dto)
            const latErrors = errors.filter((e) => e.property === 'latitude')
            expect(latErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('should reject longitude outside [-180, 180]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.oneof(
            fc.double({ min: 180.0001, max: 1000, noNaN: true }),
            fc.double({ min: -1000, max: -180.0001, noNaN: true }),
          ),
          async (validLat, invalidLng) => {
            const dto = createDto({
              latitude: String(validLat),
              longitude: String(invalidLng),
            })
            const errors = await validate(dto)
            const lngErrors = errors.filter((e) => e.property === 'longitude')
            expect(lngErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('should reject radius outside [100, 10000]', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: 0.01, max: 99.99, noNaN: true }),
            fc.double({ min: 10000.01, max: 100000, noNaN: true }),
          ),
          async (invalidRadius) => {
            const dto = createDto({
              latitude: '37.7749',
              longitude: '-122.4194',
              radius: String(invalidRadius),
            })
            const errors = await validate(dto)
            const radiusErrors = errors.filter((e) => e.property === 'radius')
            expect(radiusErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 8: Invalid food type filter rejected with 400
   * Validates: Requirements 3.4
   *
   * For any food type that is empty, whitespace only, or where every
   * comma-separated term is shorter than 2 characters, validation SHALL produce errors.
   */
  describe('Property 8: Invalid food type filter rejected with 400', () => {
    it('should reject food type where all terms are shorter than 2 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)),
            { minLength: 1, maxLength: 5 },
          ),
          async (shortTerms) => {
            const foodType = shortTerms.join(',')
            const dto = createDto({
              latitude: '37.7749',
              longitude: '-122.4194',
              foodType,
            })
            const errors = await validate(dto)
            const foodErrors = errors.filter((e) => e.property === 'foodType')
            expect(foodErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('should reject empty or whitespace-only food type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.integer({ min: 1, max: 10 }).map((n) => ' '.repeat(n)),
          ),
          async (invalidFoodType) => {
            const dto = createDto({
              latitude: '37.7749',
              longitude: '-122.4194',
              foodType: invalidFoodType,
            })
            const errors = await validate(dto)
            const foodErrors = errors.filter((e) => e.property === 'foodType')
            expect(foodErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 9: Invalid facility type rejected with 400
   * Validates: Requirements 10.3
   *
   * For any facility type that is NOT "Truck" or "Push Cart" (case-insensitive),
   * validation SHALL produce errors.
   */
  describe('Property 9: Invalid facility type rejected with 400', () => {
    it('should reject facility types other than Truck or Push Cart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
            const lower = s.toLowerCase()
            return lower !== 'truck' && lower !== 'push cart'
          }),
          async (invalidType) => {
            const dto = createDto({
              latitude: '37.7749',
              longitude: '-122.4194',
              facilityType: invalidType,
            })
            const errors = await validate(dto)
            const typeErrors = errors.filter((e) => e.property === 'facilityType')
            expect(typeErrors.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 10: Facility detail includes all specified fields, absent as null
   * Validates: Requirements 4.1, 4.4
   *
   * For any facility stored in the database, requesting it by permit ID SHALL
   * return a response containing all specified fields with absent data as null.
   */
  describe('Property 10: Facility detail includes all specified fields, absent as null', () => {
    let controller: FacilityController
    let mockRepository: any

    beforeEach(async () => {
      mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          setParameters: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
        findOne: jest.fn(),
      }

      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      }

      const module: TestingModule = await Test.createTestingModule({
        controllers: [FacilityController],
        providers: [
          FacilityService,
          FacilityCacheService,
          {
            provide: getRepositoryToken(FacilityEntity),
            useValue: mockRepository,
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: mockRedis,
          },
        ],
      }).compile()

      controller = module.get<FacilityController>(FacilityController)
    })

    it('should return all required fields with null for absent data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            permitId: fc.stringMatching(/^[A-Z0-9][A-Za-z0-9\-]{0,19}$/),
            applicant: fc.string({ minLength: 1, maxLength: 50 }),
            facilityType: fc.oneof(fc.constant('Truck'), fc.constant('Push Cart')),
            address: fc.string({ minLength: 1, maxLength: 100 }),
            foodItems: fc.oneof(
              fc.string({ minLength: 2, maxLength: 100 }),
              fc.constant(null),
            ),
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true }),
            permitStatus: fc.oneof(
              fc.constant('APPROVED'),
              fc.constant('REQUESTED'),
              fc.constant('SUSPEND'),
              fc.constant('EXPIRED'),
            ),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          async (facility) => {
            mockRepository.findOne.mockResolvedValue({
              ...facility,
              location: {
                type: 'Point',
                coordinates: [facility.longitude, facility.latitude],
              },
            })

            const result = await controller.findByPermitId(facility.permitId)

            // All required fields must be present
            expect(result).toHaveProperty('permitId')
            expect(result).toHaveProperty('applicant')
            expect(result).toHaveProperty('facilityType')
            expect(result).toHaveProperty('address')
            expect(result).toHaveProperty('foodItems')
            expect(result).toHaveProperty('latitude')
            expect(result).toHaveProperty('longitude')
            expect(result).toHaveProperty('permitStatus')

            // Values should match input
            expect(result.permitId).toBe(facility.permitId)
            expect(result.applicant).toBe(facility.applicant)
            expect(result.facilityType).toBe(facility.facilityType)
            expect(result.address).toBe(facility.address)

            // Null foodItems should be null, not undefined/omitted
            if (facility.foodItems === null) {
              expect(result.foodItems).toBeNull()
            } else {
              expect(result.foodItems).toBe(facility.foodItems)
            }

            expect(result.latitude).toBeCloseTo(facility.latitude, 5)
            expect(result.longitude).toBeCloseTo(facility.longitude, 5)
            expect(result.permitStatus).toBe(facility.permitStatus)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 14: Cache key normalization consistent for nearby coordinates
   * Validates: Requirements 8.1
   *
   * For any two search requests with coordinates that differ only beyond
   * the 4th decimal place (< ~11 meters apart), the generated cache keys
   * SHALL be identical.
   */
  describe('Property 14: Cache key normalization consistent for nearby coordinates', () => {
    let cacheService: FacilityCacheService

    beforeEach(async () => {
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FacilityCacheService,
          {
            provide: 'REDIS_CLIENT',
            useValue: mockRedis,
          },
        ],
      }).compile()

      cacheService = module.get<FacilityCacheService>(FacilityCacheService)
    })

    it('should produce identical keys for coordinates differing only beyond 4th decimal place', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate base coordinates as integers in 4dp units, then convert
          // This ensures the base is already at a clean 4dp boundary
          fc.integer({ min: -890000, max: 890000 }),
          fc.integer({ min: -1790000, max: 1790000 }),
          fc.integer({ min: 100, max: 10000 }),
          // Offsets smaller than half of 0.0001 (so they can't push to next 4dp bucket)
          fc.integer({ min: 1, max: 49 }),
          fc.integer({ min: 1, max: 49 }),
          async (latInt, lngInt, radius, latOffsetInt, lngOffsetInt) => {
            // baseLat is e.g. 37.7749 (already at 4dp precision)
            const baseLat = latInt / 10000
            const baseLng = lngInt / 10000
            // offset is e.g. 0.0000001 to 0.0000049 — well below rounding threshold
            const latOffset = latOffsetInt / 10000000
            const lngOffset = lngOffsetInt / 10000000

            const params1: SearchFacilitiesDto = {
              latitude: baseLat,
              longitude: baseLng,
              radius,
            }
            const params2: SearchFacilitiesDto = {
              latitude: baseLat + latOffset,
              longitude: baseLng + lngOffset,
              radius,
            }

            const key1 = cacheService.generateKey(params1)
            const key2 = cacheService.generateKey(params2)

            expect(key1).toBe(key2)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   * Property 15: Cache bypass on Redis failure returns valid results
   * Validates: Requirements 8.4
   *
   * For any search request where Redis is unavailable, the system SHALL
   * still return valid results from the database without returning an error.
   */
  describe('Property 15: Cache bypass on Redis failure returns valid results', () => {
    let controller: FacilityController
    let mockQueryBuilder: any

    beforeEach(async () => {
      mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            permitId: '22MFF-00001',
            applicant: 'Test Truck',
            facilityType: 'Truck',
            address: '123 Main St',
            foodItems: 'Tacos',
            latitude: '37.7750000',
            longitude: '-122.4195000',
            permitStatus: 'APPROVED',
            distance: '150.5',
          },
        ]),
      }

      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        findOne: jest.fn(),
      }

      const failingRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
        set: jest.fn().mockRejectedValue(new Error('Redis connection refused')),
      }

      const module: TestingModule = await Test.createTestingModule({
        controllers: [FacilityController],
        providers: [
          FacilityService,
          FacilityCacheService,
          {
            provide: getRepositoryToken(FacilityEntity),
            useValue: mockRepository,
          },
          {
            provide: 'REDIS_CLIENT',
            useValue: failingRedis,
          },
        ],
      }).compile()

      controller = module.get<FacilityController>(FacilityController)
    })

    it('should return valid results from DB when Redis fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -89, max: 89, noNaN: true }),
          fc.double({ min: -179, max: 179, noNaN: true }),
          fc.integer({ min: 100, max: 10000 }),
          async (lat, lng, radius) => {
            const dto: SearchFacilitiesDto = {
              latitude: lat,
              longitude: lng,
              radius,
            }

            const results = await controller.search(dto)

            // Should not throw, should return array
            expect(Array.isArray(results)).toBe(true)
            expect(results.length).toBeGreaterThan(0)

            // Each result should have valid structure
            for (const result of results) {
              expect(result).toHaveProperty('permitId')
              expect(result).toHaveProperty('applicant')
              expect(result).toHaveProperty('facilityType')
              expect(result).toHaveProperty('distance')
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
