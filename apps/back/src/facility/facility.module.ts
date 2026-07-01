import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bullmq'
import Redis from 'ioredis'
import { FacilityEntity } from './facility.entity'
import { IngestionService } from './ingestion.service'
import { IngestionProcessor } from './ingestion.processor'
import { REDIS_CLIENT } from './constants'

export { REDIS_CLIENT } from './constants'

@Module({
  imports: [
    TypeOrmModule.forFeature([FacilityEntity]),
    BullModule.registerQueue({
      name: 'facility-ingestion',
    }),
  ],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          maxRetriesPerRequest: null,
        })
      },
    },
    IngestionService,
    IngestionProcessor,
  ],
  exports: [IngestionService, REDIS_CLIENT],
})
export class FacilityModule {}
