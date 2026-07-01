import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FacilityEntity } from './facility.entity'
import { SearchFacilitiesDto } from './dto'
import { FacilityResponseDto } from './dto'
import { FacilityDetailResponseDto } from './dto'

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(FacilityEntity)
    private readonly facilityRepository: Repository<FacilityEntity>,
  ) {}

  async search(dto: SearchFacilitiesDto): Promise<FacilityResponseDto[]> {
    const { latitude, longitude, radius = 1000, facilityType, foodType } = dto

    const qb = this.facilityRepository
      .createQueryBuilder('f')
      .select([
        'f.permit_id AS "permitId"',
        'f.applicant AS "applicant"',
        'f.facility_type AS "facilityType"',
        'f.address AS "address"',
        'f.food_items AS "foodItems"',
        'f.latitude AS "latitude"',
        'f.longitude AS "longitude"',
        'f.permit_status AS "permitStatus"',
        'ST_Distance(f.location, ST_MakePoint(:lng, :lat)::geography) AS "distance"',
      ])
      .where(
        'ST_DWithin(f.location, ST_MakePoint(:lng, :lat)::geography, :radius)',
      )
      .andWhere('f.permit_status = :status')
      .setParameters({
        lat: latitude,
        lng: longitude,
        radius,
        status: 'APPROVED',
      })

    if (facilityType) {
      qb.andWhere('LOWER(f.facility_type) = LOWER(:facilityType)', {
        facilityType,
      })
    }

    if (foodType) {
      const terms = foodType.split(',').map((t) => t.trim())
      const foodConditions = terms.map((_, i) => `LOWER(f.food_items) LIKE :foodTerm${i}`)
      const foodParams: Record<string, string> = {}
      terms.forEach((term, i) => {
        foodParams[`foodTerm${i}`] = `%${term.toLowerCase()}%`
      })
      qb.andWhere(`(${foodConditions.join(' OR ')})`, foodParams)
    }

    qb.orderBy('"distance"', 'ASC')
    qb.limit(50)

    const results = await qb.getRawMany()

    return results.map((row) => ({
      permitId: row.permitId,
      applicant: row.applicant,
      facilityType: row.facilityType,
      address: row.address,
      foodItems: row.foodItems,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      permitStatus: row.permitStatus,
      distance: parseFloat(row.distance),
    }))
  }

  async findByPermitId(permitId: string): Promise<FacilityDetailResponseDto | null> {
    const facility = await this.facilityRepository.findOne({
      where: { permitId },
    })

    if (!facility) {
      return null
    }

    return {
      permitId: facility.permitId,
      applicant: facility.applicant,
      facilityType: facility.facilityType,
      address: facility.address,
      foodItems: facility.foodItems,
      latitude: parseFloat(facility.latitude as unknown as string),
      longitude: parseFloat(facility.longitude as unknown as string),
      permitStatus: facility.permitStatus,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    }
  }
}
