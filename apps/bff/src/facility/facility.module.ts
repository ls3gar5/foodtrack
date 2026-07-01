import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import Redis from 'ioredis'
import { FacilityEntity } from './facility.entity'
import { FacilityController } from './facility.controller'
import { FacilityService } from './facility.service'
import { FacilityCacheService } from './facility-cache.service'

@Module({
  imports: [TypeOrmModule.forFeature([FacilityEntity])],
  controllers: [FacilityController],
  providers: [
    FacilityService,
    FacilityCacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
      },
    },
  ],
})
export class FacilityModule {}
