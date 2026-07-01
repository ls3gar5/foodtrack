import { Test, TestingModule } from '@nestjs/testing'
import { FacilityCacheService } from './facility-cache.service'
import { SearchFacilitiesDto } from './dto/search-facilities.dto'

describe('FacilityCacheService', () => {
  let service: FacilityCacheService
  let mockRedis: {
    get: jest.Mock
    set: jest.Mock
  }

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
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

    service = module.get<FacilityCacheService>(FacilityCacheService)
  })

  describe('generateKey', () => {
    it('should generate a key with all parameters', () => {
      const params: SearchFacilitiesDto = {
        latitude: 37.77493456,
        longitude: -122.41941234,
        radius: 1000,
        foodType: 'tacos',
        facilityType: 'Truck',
      }

      const key = service.generateKey(params)

      expect(key).toBe('food-truck:search:37.7749:-122.4194:1000:tacos:Truck')
    })

    it('should use "none" for missing optional parameters', () => {
      const params: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
      }

      const key = service.generateKey(params)

      expect(key).toBe('food-truck:search:37.7749:-122.4194:1000:none:none')
    })

    it('should round latitude and longitude to 4 decimal places', () => {
      const params: SearchFacilitiesDto = {
        latitude: 37.77491111,
        longitude: -122.41945555,
        radius: 500,
      }

      const key = service.generateKey(params)

      expect(key).toBe('food-truck:search:37.7749:-122.4195:500:none:none')
    })

    it('should produce consistent keys for coordinates differing beyond 4dp', () => {
      const params1: SearchFacilitiesDto = {
        latitude: 37.77490001,
        longitude: -122.41940001,
        radius: 1000,
      }
      const params2: SearchFacilitiesDto = {
        latitude: 37.77490099,
        longitude: -122.41940099,
        radius: 1000,
      }

      expect(service.generateKey(params1)).toBe(service.generateKey(params2))
    })
  })

  describe('get', () => {
    it('should return parsed data on cache hit', async () => {
      const data = [{ permitId: '123', applicant: 'Test Truck' }]
      mockRedis.get.mockResolvedValue(JSON.stringify(data))

      const result = await service.get('food-truck:search:37.7749:-122.4194:1000:none:none')

      expect(result).toEqual(data)
      expect(mockRedis.get).toHaveBeenCalledWith('food-truck:search:37.7749:-122.4194:1000:none:none')
    })

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await service.get('food-truck:search:37.7749:-122.4194:1000:none:none')

      expect(result).toBeNull()
    })

    it('should return null and log warning on Redis failure', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection refused'))

      const result = await service.get('food-truck:search:37.7749:-122.4194:1000:none:none')

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('should store data with 300s TTL', async () => {
      mockRedis.set.mockResolvedValue('OK')
      const data = [{ permitId: '123' }]

      await service.set('food-truck:search:37.7749:-122.4194:1000:none:none', data)

      expect(mockRedis.set).toHaveBeenCalledWith(
        'food-truck:search:37.7749:-122.4194:1000:none:none',
        JSON.stringify(data),
        'EX',
        300,
      )
    })

    it('should not throw on Redis failure', async () => {
      mockRedis.set.mockRejectedValue(new Error('Connection refused'))

      await expect(
        service.set('some-key', { data: 'test' }),
      ).resolves.toBeUndefined()
    })
  })
})
