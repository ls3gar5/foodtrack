import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { FacilityService } from './facility.service'
import { FacilityEntity } from './facility.entity'
import { SearchFacilitiesDto } from './dto'

describe('FacilityService', () => {
  let service: FacilityService
  let mockQueryBuilder: any
  let mockRepository: any

  beforeEach(async () => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }

    mockRepository = {
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

    service = module.get<FacilityService>(FacilityService)
  })

  describe('search', () => {
    it('should construct a PostGIS query with ST_DWithin and ST_Distance', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
      }

      await service.search(dto)

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('f')
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('ST_Distance'),
        ]),
      )
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ST_DWithin(f.location, ST_MakePoint(:lng, :lat)::geography, :radius)',
      )
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'f.permit_status = :status',
      )
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith({
        lat: 37.7749,
        lng: -122.4194,
        radius: 1000,
        status: 'APPROVED',
      })
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('"distance"', 'ASC')
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50)
    })

    it('should use default radius of 1000 when not provided', async () => {
      const dto = {
        latitude: 37.7749,
        longitude: -122.4194,
      } as SearchFacilitiesDto

      await service.search(dto)

      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 1000 }),
      )
    })

    it('should filter by facilityType when provided', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
        facilityType: 'Truck',
      }

      await service.search(dto)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(f.facility_type) = LOWER(:facilityType)',
        { facilityType: 'Truck' },
      )
    })

    it('should not filter by facilityType when not provided', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
      }

      await service.search(dto)

      const calls = mockQueryBuilder.andWhere.mock.calls
      const hasFacilityTypeFilter = calls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('facility_type'),
      )
      expect(hasFacilityTypeFilter).toBe(false)
    })

    it('should apply OR logic for multiple food type terms', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
        foodType: 'tacos,burritos',
      }

      await service.search(dto)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(f.food_items) LIKE :foodTerm0 OR LOWER(f.food_items) LIKE :foodTerm1)',
        { foodTerm0: '%tacos%', foodTerm1: '%burritos%' },
      )
    })

    it('should apply single food type term as partial match', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
        foodType: 'tacos',
      }

      await service.search(dto)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(f.food_items) LIKE :foodTerm0)',
        { foodTerm0: '%tacos%' },
      )
    })

    it('should return empty array when no results', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
      }

      mockQueryBuilder.getRawMany.mockResolvedValue([])

      const result = await service.search(dto)
      expect(result).toEqual([])
    })

    it('should map raw results to FacilityResponseDto', async () => {
      const dto: SearchFacilitiesDto = {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 1000,
      }

      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          permitId: '22MFF-00001',
          applicant: 'Test Truck',
          facilityType: 'Truck',
          address: '123 Main St',
          foodItems: 'Tacos, Burritos',
          latitude: '37.7750000',
          longitude: '-122.4195000',
          permitStatus: 'APPROVED',
          distance: '150.5',
        },
      ])

      const result = await service.search(dto)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        permitId: '22MFF-00001',
        applicant: 'Test Truck',
        facilityType: 'Truck',
        address: '123 Main St',
        foodItems: 'Tacos, Burritos',
        latitude: 37.775,
        longitude: -122.4195,
        permitStatus: 'APPROVED',
        distance: 150.5,
      })
    })
  })

  describe('findByPermitId', () => {
    it('should return null when facility not found', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      const result = await service.findByPermitId('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should return facility detail when found', async () => {
      const mockFacility: Partial<FacilityEntity> = {
        permitId: '22MFF-00001',
        applicant: 'Test Truck',
        facilityType: 'Truck',
        address: '123 Main St',
        foodItems: 'Tacos, Burritos',
        latitude: 37.775 as any,
        longitude: -122.4195 as any,
        permitStatus: 'APPROVED',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-20T14:45:00.000Z'),
      }

      mockRepository.findOne.mockResolvedValue(mockFacility)

      const result = await service.findByPermitId('22MFF-00001')

      expect(result).toEqual({
        permitId: '22MFF-00001',
        applicant: 'Test Truck',
        facilityType: 'Truck',
        address: '123 Main St',
        foodItems: 'Tacos, Burritos',
        latitude: 37.775,
        longitude: -122.4195,
        permitStatus: 'APPROVED',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-20T14:45:00.000Z'),
      })
    })

    it('should return null foodItems when facility has no food items', async () => {
      const mockFacility: Partial<FacilityEntity> = {
        permitId: '22MFF-00002',
        applicant: 'Test Cart',
        facilityType: 'Push Cart',
        address: '456 Market St',
        foodItems: null,
        latitude: 37.78 as any,
        longitude: -122.42 as any,
        permitStatus: 'APPROVED',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-06-20T14:45:00.000Z'),
      }

      mockRepository.findOne.mockResolvedValue(mockFacility)

      const result = await service.findByPermitId('22MFF-00002')

      expect(result).not.toBeNull()
      expect(result!.foodItems).toBeNull()
    })

    it('should lookup facility by permitId', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await service.findByPermitId('22MFF-00001')

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { permitId: '22MFF-00001' },
      })
    })
  })
})
