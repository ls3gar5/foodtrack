import * as fc from 'fast-check'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { FacilityService } from './facility.service'
import { FacilityEntity } from './facility.entity'
import { SearchFacilitiesDto } from './dto'

// --- Arbitraries ---

const arbitraryLatitude = (): fc.Arbitrary<number> =>
  fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true })

const arbitraryLongitude = (): fc.Arbitrary<number> =>
  fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true })

const arbitraryRadius = (): fc.Arbitrary<number> =>
  fc.integer({ min: 100, max: 10000 })

const arbitraryFacilityType = (): fc.Arbitrary<string> =>
  fc.constantFrom('Truck', 'Push Cart')

const arbitraryFoodTypeTerm = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 2, maxLength: 20 }).filter((s) => s.trim().length >= 2 && !s.includes(','))

const arbitraryPermitId = (): fc.Arbitrary<string> =>
  fc.array(
    fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'.split('')),
    { minLength: 4, maxLength: 15 },
  ).map((chars) => chars.join(''))

const arbitraryDistance = (maxRadius: number): fc.Arbitrary<number> =>
  fc.double({ min: 0, max: maxRadius, noNaN: true, noDefaultInfinity: true })

const arbitraryFacilityRawRow = (opts?: {
  distance?: number
  permitStatus?: string
  facilityType?: string
  foodItems?: string
}): fc.Arbitrary<Record<string, string>> =>
  fc.record({
    permitId: arbitraryPermitId(),
    applicant: fc.string({ minLength: 1, maxLength: 60 }),
    facilityType: opts?.facilityType
      ? fc.constant(opts.facilityType)
      : arbitraryFacilityType(),
    address: fc.string({ minLength: 1, maxLength: 100 }),
    foodItems: opts?.foodItems !== undefined
      ? fc.constant(opts.foodItems)
      : fc.string({ minLength: 0, maxLength: 100 }),
    latitude: fc.double({ min: 37.7, max: 37.85, noNaN: true, noDefaultInfinity: true }).map(String),
    longitude: fc.double({ min: -122.52, max: -122.35, noNaN: true, noDefaultInfinity: true }).map(String),
    permitStatus: opts?.permitStatus
      ? fc.constant(opts.permitStatus)
      : fc.constantFrom('APPROVED', 'REQUESTED', 'SUSPEND', 'EXPIRED'),
    distance: opts?.distance !== undefined
      ? fc.constant(String(opts.distance))
      : fc.double({ min: 0, max: 5000, noNaN: true, noDefaultInfinity: true }).map(String),
  })

// --- Test Helpers ---

function createMockQueryBuilder(rawResults: Record<string, string>[]) {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResults),
  }
}

async function createService(mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>) {
  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn().mockResolvedValue(null),
  }

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      FacilityService,
      {
        provide: getRepositoryToken(FacilityEntity),
        useValue: mockRepository,
      },
    ],
  }).compile()

  return module.get<FacilityService>(FacilityService)
}

// --- Property Tests ---

describe('FacilityService Property Tests', () => {
  /**
   * Property 1: All returned facilities are within the specified radius
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 1: All returned facilities are within the specified radius', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        fc.array(
          fc.double({ min: 0, max: 15000, noNaN: true, noDefaultInfinity: true }),
          { minLength: 1, maxLength: 20 },
        ),
        async (lat, lng, radius, distances) => {
          // Generate rows — some within radius, some outside
          const rows = distances.map((d, i) => ({
            permitId: `PERMIT-${i}`,
            applicant: `Vendor ${i}`,
            facilityType: 'Truck',
            address: `${i} Main St`,
            foodItems: 'Tacos',
            latitude: '37.7750000',
            longitude: '-122.4195000',
            permitStatus: 'APPROVED',
            distance: String(d),
          }))

          // Simulate PostGIS: only return rows within radius (as the DB would)
          const withinRadius = rows.filter((r) => parseFloat(r.distance) <= radius)
          const mockQb = createMockQueryBuilder(withinRadius)
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius }
          const results = await service.search(dto)

          // All returned facilities must be within the specified radius
          for (const facility of results) {
            expect(facility.distance).toBeLessThanOrEqual(radius)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 2: Results sorted by distance ascending
   *
   * **Validates: Requirements 2.3**
   */
  it('Property 2: Results sorted by distance ascending', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        fc.array(
          fc.double({ min: 0, max: 5000, noNaN: true, noDefaultInfinity: true }),
          { minLength: 2, maxLength: 30 },
        ),
        async (lat, lng, radius, distances) => {
          // The DB returns rows sorted by distance; simulate that
          const sortedDistances = [...distances].sort((a, b) => a - b)
          const rows = sortedDistances.map((d, i) => ({
            permitId: `PERMIT-${i}`,
            applicant: `Vendor ${i}`,
            facilityType: 'Truck',
            address: `${i} Main St`,
            foodItems: 'Tacos',
            latitude: '37.7750000',
            longitude: '-122.4195000',
            permitStatus: 'APPROVED',
            distance: String(d),
          }))

          const mockQb = createMockQueryBuilder(rows)
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius }
          const results = await service.search(dto)

          // Verify the service preserves distance ordering
          for (let i = 1; i < results.length; i++) {
            expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 3: Only APPROVED facilities returned
   *
   * **Validates: Requirements 2.6**
   */
  it('Property 3: Only APPROVED facilities returned', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        async (lat, lng, radius) => {
          const mockQb = createMockQueryBuilder([])
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius }
          await service.search(dto)

          // Verify the query always filters by APPROVED status
          expect(mockQb.andWhere).toHaveBeenCalledWith('f.permit_status = :status')
          expect(mockQb.setParameters).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'APPROVED' }),
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 4: Food type filter OR logic with case-insensitive partial match
   *
   * **Validates: Requirements 3.1, 3.3**
   */
  it('Property 4: Food type filter OR logic with case-insensitive partial match', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        fc.array(arbitraryFoodTypeTerm(), { minLength: 1, maxLength: 5 }),
        async (lat, lng, radius, terms) => {
          const foodType = terms.join(',')
          const mockQb = createMockQueryBuilder([])
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius, foodType }
          await service.search(dto)

          // Verify that the food type filter was applied with OR logic
          const andWhereCalls = mockQb.andWhere.mock.calls
          const foodFilterCall = andWhereCalls.find(
            (call: any[]) => typeof call[0] === 'string' && call[0].includes('food_items'),
          )
          expect(foodFilterCall).toBeDefined()

          const [query, params] = foodFilterCall as [string, Record<string, string>]

          // Should have one LIKE per term joined by OR
          for (let i = 0; i < terms.length; i++) {
            expect(query).toContain(`LOWER(f.food_items) LIKE :foodTerm${i}`)
            expect(params[`foodTerm${i}`]).toBe(`%${terms[i].trim().toLowerCase()}%`)
          }

          // Should use OR between multiple terms
          if (terms.length > 1) {
            expect(query).toContain(' OR ')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 5: Facility type filter exact case-insensitive match
   *
   * **Validates: Requirements 10.1**
   */
  it('Property 5: Facility type filter exact case-insensitive match', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        arbitraryFacilityType(),
        async (lat, lng, radius, facilityType) => {
          const mockQb = createMockQueryBuilder([])
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius, facilityType }
          await service.search(dto)

          // Verify the query includes case-insensitive facility type filter
          expect(mockQb.andWhere).toHaveBeenCalledWith(
            'LOWER(f.facility_type) = LOWER(:facilityType)',
            { facilityType },
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 6: Result set bounded to 50
   *
   * **Validates: Requirements 2.7**
   */
  it('Property 6: Result set bounded to 50', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryLatitude(),
        arbitraryLongitude(),
        arbitraryRadius(),
        async (lat, lng, radius) => {
          const mockQb = createMockQueryBuilder([])
          const service = await createService(mockQb)

          const dto: SearchFacilitiesDto = { latitude: lat, longitude: lng, radius }
          await service.search(dto)

          // Verify the query always applies LIMIT 50
          expect(mockQb.limit).toHaveBeenCalledWith(50)
        },
      ),
      { numRuns: 100 },
    )
  })
})
