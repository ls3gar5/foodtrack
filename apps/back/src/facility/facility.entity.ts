import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { Point } from 'geojson'

@Entity('facilities')
export class FacilityEntity {
  @PrimaryColumn({ name: 'permit_id', type: 'varchar', length: 50 })
  permitId: string

  @Column({ name: 'applicant', type: 'varchar', length: 255 })
  applicant: string

  @Column({ name: 'facility_type', type: 'varchar', length: 50 })
  facilityType: string

  @Column({ name: 'address', type: 'varchar', length: 255 })
  address: string

  @Column({ name: 'food_items', type: 'text', nullable: true })
  foodItems: string | null

  @Column('geography', {
    name: 'location',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point

  @Column('decimal', { name: 'latitude', precision: 10, scale: 7 })
  latitude: number

  @Column('decimal', { name: 'longitude', precision: 10, scale: 7 })
  longitude: number

  @Column({ name: 'permit_status', type: 'varchar', length: 50 })
  permitStatus: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
