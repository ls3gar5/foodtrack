import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { IngestionService, SodaRecord } from './ingestion.service'
import { FacilityEntity } from './facility.entity'
import { REDIS_CLIENT } from './constants'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('IngestionService', () => {
  let service: IngestionService
  let repository: jest.Mocked<Partial<Repository<FacilityEntity>>>
  let redis: { keys: jest.Mock; del: jest.Mock }

  beforeEach(async () => {
    jest.useFakeTimers()

    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }

    redis = {
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getRepositoryToken(FacilityEntity),
          useValue: repository,
        },
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
      ],
    }).compile()

    service = module.get<IngestionService>(IngestionService)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  const validSodaRecord: SodaRecord = {
    objectid: '1',
    applicant: 'Test Truck',
    facilitytype: 'Truck',
    address: '123 Main St',
    fooditems: 'Tacos: Burritos',
    latitude: '37.7749',
    longitude: '-122.4194',
    permit: 'PERMIT-001',
    status: 'APPROVED',
  }

  describe('retry behavior with exponential backoff', () => {
    it('should retry 3 times with delays of 2s, 4s, 8s on SODA API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const importPromise = service.importFacilities()

      // First retry delay: 2s
      await jest.advanceTimersByTimeAsync(2000)
      // Second retry delay: 4s
      await jest.advanceTimersByTimeAsync(4000)

      const result = await importPromise

      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
      expect(result).toEqual({
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: [],
      })
    })

    it('should succeed on second attempt after first failure', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: [validSodaRecord] })

      repository.findOne!.mockResolvedValue(null)
      repository.save!.mockResolvedValue({} as FacilityEntity)

      const importPromise = service.importFacilities()

      // Advance past first retry delay (2s)
      await jest.advanceTimersByTimeAsync(2000)

      const result = await importPromise

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(result.imported).toBe(1)
    })

    it('should succeed on third attempt after two failures', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({ data: [validSodaRecord] })

      repository.findOne!.mockResolvedValue(null)
      repository.save!.mockResolvedValue({} as FacilityEntity)

      const importPromise = service.importFacilities()

      // Advance past first retry delay (2s)
      await jest.advanceTimersByTimeAsync(2000)
      // Advance past second retry delay (4s)
      await jest.advanceTimersByTimeAsync(4000)

      const result = await importPromise

      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
      expect(result.imported).toBe(1)
    })
  })

  describe('critical error logging when all retries exhausted', () => {
    it('should log critical error when all 3 retries fail', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'))

      const loggerSpy = jest.spyOn(service['logger'], 'error')

      const importPromise = service.importFacilities()

      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(4000)

      await importPromise

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL'),
      )
    })

    it('should return empty result when all retries exhausted', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'))

      const importPromise = service.importFacilities()

      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(4000)

      const result = await importPromise

      expect(result).toEqual({
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: [],
      })
    })
  })

  describe('cache invalidation after successful import', () => {
    it('should query and delete Redis keys matching food-truck:search:*', async () => {
      mockedAxios.get.mockResolvedValue({ data: [validSodaRecord] })
      repository.findOne!.mockResolvedValue(null)
      repository.save!.mockResolvedValue({} as FacilityEntity)
      redis.keys.mockResolvedValue([
        'food-truck:search:37.7749:-122.4194:1000:none:none',
        'food-truck:search:37.7800:-122.4100:500:tacos:none',
      ])

      const result = await service.importFacilities()

      expect(redis.keys).toHaveBeenCalledWith('food-truck:search:*')
      expect(redis.del).toHaveBeenCalledWith(
        'food-truck:search:37.7749:-122.4194:1000:none:none',
        'food-truck:search:37.7800:-122.4100:500:tacos:none',
      )
      expect(result.imported).toBe(1)
    })

    it('should not call del when no cache keys exist', async () => {
      mockedAxios.get.mockResolvedValue({ data: [validSodaRecord] })
      repository.findOne!.mockResolvedValue(null)
      repository.save!.mockResolvedValue({} as FacilityEntity)
      redis.keys.mockResolvedValue([])

      await service.importFacilities()

      expect(redis.keys).toHaveBeenCalledWith('food-truck:search:*')
      expect(redis.del).not.toHaveBeenCalled()
    })

    it('should log error but still complete successfully when cache invalidation fails', async () => {
      mockedAxios.get.mockResolvedValue({ data: [validSodaRecord] })
      repository.findOne!.mockResolvedValue(null)
      repository.save!.mockResolvedValue({} as FacilityEntity)
      redis.keys.mockRejectedValue(new Error('Redis connection lost'))

      const loggerSpy = jest.spyOn(service['logger'], 'error')

      const result = await service.importFacilities()

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to invalidate cache'),
      )
      expect(result.imported).toBe(1)
    })
  })

  describe('service starts without data when import fails', () => {
    it('should not call cache invalidation when API fetch returns null', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const importPromise = service.importFacilities()

      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(4000)

      const result = await importPromise

      expect(redis.keys).not.toHaveBeenCalled()
      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.updated).toBe(0)
      expect(result.errors).toEqual([])
    })
  })

  describe('validateRecord', () => {
    it('should return valid for a record with valid coordinates', () => {
      const result = service.validateRecord(validSodaRecord)
      expect(result).toEqual({ valid: true })
    })

    it('should reject record with null latitude', () => {
      const record = { ...validSodaRecord, latitude: null as unknown as string }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('null')
    })

    it('should reject record with null longitude', () => {
      const record = { ...validSodaRecord, longitude: null as unknown as string }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('null')
    })

    it('should reject record with zero latitude', () => {
      const record = { ...validSodaRecord, latitude: '0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('zero')
    })

    it('should reject record with zero longitude', () => {
      const record = { ...validSodaRecord, longitude: '0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('zero')
    })

    it('should reject record with both latitude and longitude zero', () => {
      const record = { ...validSodaRecord, latitude: '0', longitude: '0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('zero')
    })

    it('should reject record with latitude out of range (> 90)', () => {
      const record = { ...validSodaRecord, latitude: '91.0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('out of range')
    })

    it('should reject record with latitude out of range (< -90)', () => {
      const record = { ...validSodaRecord, latitude: '-91.0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('out of range')
    })

    it('should reject record with longitude out of range (> 180)', () => {
      const record = { ...validSodaRecord, longitude: '181.0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('out of range')
    })

    it('should reject record with longitude out of range (< -180)', () => {
      const record = { ...validSodaRecord, longitude: '-181.0' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('out of range')
    })

    it('should reject record with non-numeric latitude', () => {
      const record = { ...validSodaRecord, latitude: 'abc' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not a valid number')
    })

    it('should reject record with non-numeric longitude', () => {
      const record = { ...validSodaRecord, longitude: 'xyz' }
      const result = service.validateRecord(record)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not a valid number')
    })

    it('should accept record at boundary latitude 90', () => {
      const record = { ...validSodaRecord, latitude: '90' }
      const result = service.validateRecord(record)
      expect(result).toEqual({ valid: true })
    })

    it('should accept record at boundary latitude -90', () => {
      const record = { ...validSodaRecord, latitude: '-90' }
      const result = service.validateRecord(record)
      expect(result).toEqual({ valid: true })
    })

    it('should accept record at boundary longitude 180', () => {
      const record = { ...validSodaRecord, longitude: '180' }
      const result = service.validateRecord(record)
      expect(result).toEqual({ valid: true })
    })

    it('should accept record at boundary longitude -180', () => {
      const record = { ...validSodaRecord, longitude: '-180' }
      const result = service.validateRecord(record)
      expect(result).toEqual({ valid: true })
    })
  })
})
