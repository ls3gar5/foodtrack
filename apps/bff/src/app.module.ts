import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FacilityModule } from './facility/facility.module'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      extra: {
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false,
    }),
    FacilityModule,
  ],
})
export class AppModule {}
