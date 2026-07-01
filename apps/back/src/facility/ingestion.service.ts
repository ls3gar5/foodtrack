import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import Redis from 'ioredis'
import { FacilityEntity } from './facility.entity'
import { REDIS_CLIENT } from './constants'

export interface SodaRecord {
  objectid: string
  applicant: string
  facilitytype: string
  address: string
  fooditems: string
  latitude: string
  longitude: string
  permit: string
  status: string
}

export interface ImportResult {
  imported: number
  skipped: number
  updated: number
  errors: string[]
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

const SODA_API_URL = process.env.SODA_API_URL || 'https://data.sfgov.org/resource/rqzj-sfat.json'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    @InjectRepository(FacilityEntity)
    private readonly facilityRepository: Repository<FacilityEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async importFacilities(): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [],
    }

    const records = await this.fetchFromSodaApi()
    if (!records) {
      return result
    }

    for (const record of records) {
      const validation = this.validateRecord(record)
      if (!validation.valid) {
        this.logger.warn(
          `Skipping record with permit "${record.permit}": ${validation.reason}`,
        )
        result.skipped++
        continue
      }

      try {
        const existing = await this.facilityRepository.findOne({
          where: { permitId: record.permit },
        })

        const entity = this.mapToEntity(record)

        if (existing) {
          await this.facilityRepository.save(entity)
          result.updated++
        } else {
          await this.facilityRepository.save(entity)
          result.imported++
        }
      } catch (error) {
        const message = `Error upserting record with permit "${record.permit}": ${error instanceof Error ? error.message : String(error)}`
        this.logger.warn(message)
        result.errors.push(message)
        result.skipped++
      }
    }

    await this.invalidateCache()

    return result
  }

  validateRecord(raw: SodaRecord): ValidationResult {
    const lat = parseFloat(raw.latitude)
    const lng = parseFloat(raw.longitude)

    if (raw.latitude == null || raw.longitude == null) {
      return { valid: false, reason: 'latitude or longitude is null' }
    }

    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, reason: 'latitude or longitude is not a valid number' }
    }

    if (lat === 0 && lng === 0) {
      return { valid: false, reason: 'latitude and longitude are both zero' }
    }

    if (lat === 0) {
      return { valid: false, reason: 'latitude is zero' }
    }

    if (lng === 0) {
      return { valid: false, reason: 'longitude is zero' }
    }

    if (lat < -90 || lat > 90) {
      return { valid: false, reason: `latitude ${lat} is out of range (-90 to 90)` }
    }

    if (lng < -180 || lng > 180) {
      return { valid: false, reason: `longitude ${lng} is out of range (-180 to 180)` }
    }

    return { valid: true }
  }

  private async fetchFromSodaApi(): Promise<SodaRecord[] | null> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get<SodaRecord[]>(SODA_API_URL, {
          params: { $limit: 5000 },
        })
        return response.data
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(
          `SODA API fetch attempt ${attempt}/${MAX_RETRIES} failed: ${message}`,
        )

        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    this.logger.error(
      'CRITICAL: All retry attempts to fetch from SODA API have been exhausted. Proceeding without data.',
    )
    return null
  }

  private mapToEntity(record: SodaRecord): FacilityEntity {
    const lat = parseFloat(record.latitude)
    const lng = parseFloat(record.longitude)

    const entity = new FacilityEntity()
    entity.permitId = record.permit
    entity.applicant = record.applicant || ''
    entity.facilityType = record.facilitytype || ''
    entity.address = record.address || ''
    entity.foodItems = record.fooditems || null
    entity.latitude = lat
    entity.longitude = lng
    entity.location = {
      type: 'Point',
      coordinates: [lng, lat],
    }
    entity.permitStatus = record.status || ''

    return entity
  }

  private async invalidateCache(): Promise<void> {
    try {
      const keys = await this.redis.keys('food-truck:search:*')
      if (keys.length > 0) {
        await this.redis.del(...keys)
        this.logger.log(`Invalidated ${keys.length} cache keys`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to invalidate cache: ${message}`)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
