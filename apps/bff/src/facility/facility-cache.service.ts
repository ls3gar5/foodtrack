import { Injectable, Logger, Inject } from '@nestjs/common'
import Redis from 'ioredis'
import { SearchFacilitiesDto } from './dto/search-facilities.dto'

@Injectable()
export class FacilityCacheService {
  private readonly logger = new Logger(FacilityCacheService.name)
  private static readonly TTL_SECONDS = 300

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  generateKey(params: SearchFacilitiesDto): string {
    const lat = params.latitude.toFixed(4)
    const lng = params.longitude.toFixed(4)
    const radius = params.radius ?? 1000
    const foodType = params.foodType ?? 'none'
    const facilityType = params.facilityType ?? 'none'

    return `food-truck:search:${lat}:${lng}:${radius}:${foodType}:${facilityType}`
  }

  async get(key: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(key)
      if (!cached) {
        return null
      }
      return JSON.parse(cached)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Redis GET failed for key "${key}": ${message}`)
      return null
    }
  }

  async set(key: string, data: any): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(data),
        'EX',
        FacilityCacheService.TTL_SECONDS,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Redis SET failed for key "${key}": ${message}`)
    }
  }
}
