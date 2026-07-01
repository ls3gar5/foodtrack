import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'
import { FacilityCacheService } from './facility-cache.service'
import { FacilityResponseDto } from './dto/facility-response.dto'
import { FacilityDetailResponseDto } from './dto/facility-detail-response.dto'
import { SearchFacilitiesDto } from './dto/search-facilities.dto'

describe('FacilityController', () => {
  let controller: FacilityController
  let facilityService: { search: jest.Mock; findByPermitId: jest.Mock }
  let cacheService: { generateKey: jest.Mock; get: jest.Mock; set: jest.Mock }

  beforeEach(async () => {
    facilityService = {
      search: jest.fn(),
      findByPermitId: jest.fn(),
    }

    cacheService = {
      generateKey: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FacilityController],
      providers: [
        { provide: FacilityService, useValue: facilityService },
        { provide: FacilityCacheService, useValue: cacheService },
      ],
    }).compile()

    controller = module.get<FacilityController>(FacilityController)
  })

  describe('findByPermitId', () => {
    it('should return facility detail when found', async () => {
      const detail: FacilityDetailResponseDto = {
        permitId: '22MFF-00001',
        applicant: "Natan's Catering",
        facilityType: 'Truck',
        address: '123 Market St',
        foodItems: 'Tacos, Burritos',
        latitude: 37.7749,
        longitude: -122.4194,
        permitStatus: 'APPROVED',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-20T14:45:00.000Z'),
      }
      facilityService.findByPermitId.mockResolvedValue(detail)

      const result = await controller.findByPermitId('22MFF-00001')

      expect(result).toEqual(detail)
      expect(facilityService.findByPermitId).toHaveBeenCalledWith('22MFF-00001')
    })

    it('should throw NotFoundException when facility not found', async () => {
      facilityService.findByPermitId.mockResolvedValue(null)

      await expect(
        controller.findByPermitId('22MFF-99999'),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException for empty permit ID', async () => {
      await expect(
        controller.findByPermitId(''),
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for whitespace-only permit ID', async () => {
      await expect(
        controller.findByPermitId('   '),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('search', () => {
    const dto: SearchFacilitiesDto = {
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 1000,
    }

    const cachedResults: FacilityResponseDto[] = [
      {
        permitId: '22MFF-00001',
        applicant: "Natan's Catering",
        facilityType: 'Truck',
        address: '123 Market St',
        foodItems: 'Tacos, Burritos',
        latitude: 37.7749,
        longitude: -122.4194,
        permitStatus: 'APPROVED',
        distance: 100,
      },
    ]

    it('should return cached result when cache hit (FacilityService NOT called)', async () => {
      cacheService.generateKey.mockReturnValue('food-truck:search:37.7749:-122.4194:1000:none:none')
      cacheService.get.mockResolvedValue(cachedResults)

      const result = await controller.search(dto)

      expect(result).toEqual(cachedResults)
      expect(cacheService.generateKey).toHaveBeenCalledWith(dto)
      expect(cacheService.get).toHaveBeenCalledWith('food-truck:search:37.7749:-122.4194:1000:none:none')
      expect(facilityService.search).not.toHaveBeenCalled()
      expect(cacheService.set).not.toHaveBeenCalled()
    })

    it('should call FacilityService and store in cache when cache miss', async () => {
      const dbResults: FacilityResponseDto[] = [
        {
          permitId: '22MFF-00002',
          applicant: 'Tacos El Gordo',
          facilityType: 'Truck',
          address: '456 Mission St',
          foodItems: 'Tacos',
          latitude: 37.775,
          longitude: -122.418,
          permitStatus: 'APPROVED',
          distance: 250,
        },
      ]

      cacheService.generateKey.mockReturnValue('food-truck:search:37.7749:-122.4194:1000:none:none')
      cacheService.get.mockResolvedValue(null)
      facilityService.search.mockResolvedValue(dbResults)
      cacheService.set.mockResolvedValue(undefined)

      const result = await controller.search(dto)

      expect(result).toEqual(dbResults)
      expect(facilityService.search).toHaveBeenCalledWith(dto)
      expect(cacheService.set).toHaveBeenCalledWith(
        'food-truck:search:37.7749:-122.4194:1000:none:none',
        dbResults,
      )
    })

    it('should still return results when Redis fails (cache bypass)', async () => {
      const dbResults: FacilityResponseDto[] = [
        {
          permitId: '22MFF-00003',
          applicant: 'Burrito Bonanza',
          facilityType: 'Push Cart',
          address: '789 Howard St',
          foodItems: 'Burritos',
          latitude: 37.776,
          longitude: -122.417,
          permitStatus: 'APPROVED',
          distance: 500,
        },
      ]

      cacheService.generateKey.mockReturnValue('food-truck:search:37.7749:-122.4194:1000:none:none')
      // Redis GET fails — returns null (FacilityCacheService swallows errors)
      cacheService.get.mockResolvedValue(null)
      facilityService.search.mockResolvedValue(dbResults)
      // Redis SET fails — but shouldn't break response
      cacheService.set.mockResolvedValue(undefined)

      const result = await controller.search(dto)

      expect(result).toEqual(dbResults)
      expect(facilityService.search).toHaveBeenCalledWith(dto)
    })
  })
})
