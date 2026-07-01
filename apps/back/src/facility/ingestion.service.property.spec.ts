import * as fc from 'fast-check'

// Break circular dependency: ingestion.service -> facility.module -> ingestion.processor -> ingestion.service
jest.mock('./facility.module', () => ({
  REDIS_CLIENT: 'REDIS_CLIENT',
}))
jest.mock('./ingestion.processor', () => ({}))

import { IngestionService, SodaRecord } from './ingestion.service'

// --- Arbitraries ---

const arbitraryPermitId = (): fc.Arbitrary<string> =>
  fc.array(
    fc.constantFrom(...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    { minLength: 4, maxLength: 12 },
  ).map((chars) => chars.join(''))

const arbitrarySodaRecord = (): fc.Arbitrary<SodaRecord> =>
  fc.record({
    objectid: fc.array(
      fc.constantFrom(...'0123456789'.split('')),
      { minLength: 1, maxLength: 6 },
    ).map((chars) => chars.join('')),
    applicant: fc.string({ minLength: 1, maxLength: 60 }),
    facilitytype: fc.constantFrom('Truck', 'Push Cart'),
    address: fc.string({ minLength: 1, maxLength: 100 }),
    fooditems: fc.string({ minLength: 0, maxLength: 100 }),
    latitude: fc.double({ min: 37.7, max: 37.85, noNaN: true }).map(String),
    longitude: fc.double({ min: -122.52, max: -122.35, noNaN: true }).map(String),
    permit: arbitraryPermitId(),
    status: fc.constantFrom('APPROVED', 'REQUESTED', 'SUSPEND', 'EXPIRED'),
  })

const arbitraryInvalidSodaRecord = (): fc.Arbitrary<SodaRecord> =>
  fc.oneof(
    // null-ish latitude
    arbitrarySodaRecord().map((r) => ({ ...r, latitude: '' })),
    // null-ish longitude
    arbitrarySodaRecord().map((r) => ({ ...r, longitude: '' })),
    // zero latitude
    arbitrarySodaRecord().map((r) => ({ ...r, latitude: '0' })),
    // zero longitude
    arbitrarySodaRecord().map((r) => ({ ...r, longitude: '0' })),
    // out-of-range latitude
    fc.oneof(
      fc.double({ min: 91, max: 200, noNaN: true }),
      fc.double({ min: -200, max: -91, noNaN: true }),
    ).chain((lat) =>
      arbitrarySodaRecord().map((r) => ({ ...r, latitude: String(lat) })),
    ),
    // out-of-range longitude
    fc.oneof(
      fc.double({ min: 181, max: 360, noNaN: true }),
      fc.double({ min: -360, max: -181, noNaN: true }),
    ).chain((lng) =>
      arbitrarySodaRecord().map((r) => ({ ...r, longitude: String(lng) })),
    ),
  )

// --- Test Helpers ---

function createMockRepository() {
  const store = new Map<string, Record<string, unknown>>()

  return {
    store,
    findOne: jest.fn(({ where }: { where: { permitId: string } }) => {
      const entity = store.get(where.permitId)
      return Promise.resolve(entity || null)
    }),
    save: jest.fn((entity: { permitId: string }) => {
      store.set(entity.permitId, { ...entity })
      return Promise.resolve(entity)
    }),
  }
}

function createMockRedis() {
  return {
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
  }
}

function createIngestionService(
  repository: ReturnType<typeof createMockRepository>,
  redis: ReturnType<typeof createMockRedis>,
  records: SodaRecord[],
): IngestionService {
  const service = new IngestionService(
    repository as any,
    redis as any,
  )

  // Mock the private fetchFromSodaApi method to return our generated records
  jest.spyOn(service as any, 'fetchFromSodaApi').mockResolvedValue(records)

  return service
}

// --- Property Tests ---

describe('IngestionService Property Tests', () => {
  /**
   * Property 11: Upsert by permit identifier — no duplicates after ingestion
   * of records with duplicate permit IDs
   *
   * **Validates: Requirements 1.5**
   */
  it('Property 11: Upsert by permit identifier — no duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySodaRecord(), { minLength: 1, maxLength: 20 }),
        async (records) => {
          // Introduce duplicate permit IDs by repeating some records
          const duplicated = [...records, ...records.slice(0, Math.ceil(records.length / 2))]

          const repo = createMockRepository()
          const redis = createMockRedis()
          const service = createIngestionService(repo, redis, duplicated)

          await service.importFacilities()

          // The repository store should have exactly one entry per unique permit ID
          const uniquePermitIds = new Set(duplicated.map((r) => r.permit))
          expect(repo.store.size).toBe(uniquePermitIds.size)

          // Verify each unique permit ID has exactly one entry
          for (const permitId of uniquePermitIds) {
            expect(repo.store.has(permitId)).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 12: Valid coordinates imported, invalid coordinates skipped
   * without stopping import
   *
   * **Validates: Requirements 1.6, 1.7**
   */
  it('Property 12: Valid coordinates imported, invalid coordinates skipped without stopping import', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySodaRecord(), { minLength: 1, maxLength: 10 }),
        fc.array(arbitraryInvalidSodaRecord(), { minLength: 1, maxLength: 10 }),
        async (validRecords, invalidRecords) => {
          // Ensure unique permit IDs across valid and invalid
          const usedPermits = new Set<string>()
          const deduplicatedValid = validRecords.filter((r) => {
            if (usedPermits.has(r.permit)) return false
            usedPermits.add(r.permit)
            return true
          })
          const deduplicatedInvalid = invalidRecords
            .map((r, i) => ({ ...r, permit: `INVALID_${i}_${r.permit}` }))
            .filter((r) => {
              if (usedPermits.has(r.permit)) return false
              usedPermits.add(r.permit)
              return true
            })

          // Interleave valid and invalid records
          const mixed: SodaRecord[] = []
          let vi = 0, ii = 0
          while (vi < deduplicatedValid.length || ii < deduplicatedInvalid.length) {
            if (vi < deduplicatedValid.length) mixed.push(deduplicatedValid[vi++])
            if (ii < deduplicatedInvalid.length) mixed.push(deduplicatedInvalid[ii++])
          }

          const repo = createMockRepository()
          const redis = createMockRedis()
          const service = createIngestionService(repo, redis, mixed)

          const result = await service.importFacilities()

          // All valid records should be imported
          expect(repo.store.size).toBe(deduplicatedValid.length)

          // Invalid records should be skipped
          expect(result.skipped).toBe(deduplicatedInvalid.length)

          // Total imported + updated should equal valid count
          expect(result.imported + result.updated).toBe(deduplicatedValid.length)

          // Verify no invalid permits were saved
          for (const invalid of deduplicatedInvalid) {
            expect(repo.store.has(invalid.permit)).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Property 13: All required fields mapped from valid SODA records
   *
   * **Validates: Requirements 1.2**
   */
  it('Property 13: All required fields mapped from valid SODA records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitrarySodaRecord(), { minLength: 1, maxLength: 10 }).map((records) => {
          // Ensure unique permit IDs
          const seen = new Set<string>()
          return records.filter((r) => {
            if (seen.has(r.permit)) return false
            seen.add(r.permit)
            return true
          })
        }),
        async (records) => {
          const repo = createMockRepository()
          const redis = createMockRedis()
          const service = createIngestionService(repo, redis, records)

          await service.importFacilities()

          // Every saved entity must have all required fields
          for (const record of records) {
            const saved = repo.store.get(record.permit) as Record<string, unknown> | undefined
            expect(saved).toBeDefined()

            // Required fields from Requirements 1.2:
            // applicant name, facility type, address, food items,
            // latitude, longitude, permit status, permit identifier
            expect(saved).toHaveProperty('permitId')
            expect(saved!.permitId).toBe(record.permit)

            expect(saved).toHaveProperty('applicant')
            expect(typeof saved!.applicant).toBe('string')

            expect(saved).toHaveProperty('facilityType')
            expect(typeof saved!.facilityType).toBe('string')

            expect(saved).toHaveProperty('address')
            expect(typeof saved!.address).toBe('string')

            // foodItems can be null but must be present
            expect('foodItems' in saved!).toBe(true)

            expect(saved).toHaveProperty('latitude')
            expect(typeof saved!.latitude).toBe('number')
            expect(saved!.latitude).not.toBeNaN()

            expect(saved).toHaveProperty('longitude')
            expect(typeof saved!.longitude).toBe('number')
            expect(saved!.longitude).not.toBeNaN()

            expect(saved).toHaveProperty('permitStatus')
            expect(typeof saved!.permitStatus).toBe('string')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
