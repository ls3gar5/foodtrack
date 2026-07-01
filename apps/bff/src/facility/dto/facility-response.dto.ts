import { ApiProperty } from '@nestjs/swagger'

export class FacilityResponseDto {
  @ApiProperty({
    description: 'Unique permit identifier',
    example: '22MFF-00001',
  })
  permitId: string

  @ApiProperty({
    description: 'Name of the food facility applicant',
    example: 'Natan\'s Catering',
  })
  applicant: string

  @ApiProperty({
    description: 'Type of facility (Truck or Push Cart)',
    example: 'Truck',
    enum: ['Truck', 'Push Cart'],
  })
  facilityType: string

  @ApiProperty({
    description: 'Street address of the facility',
    example: '123 Market St',
  })
  address: string

  @ApiProperty({
    description: 'Comma-separated list of food items offered',
    example: 'Tacos, Burritos, Quesadillas',
    nullable: true,
  })
  foodItems: string | null

  @ApiProperty({
    description: 'Latitude of the facility location',
    example: 37.7749,
  })
  latitude: number

  @ApiProperty({
    description: 'Longitude of the facility location',
    example: -122.4194,
  })
  longitude: number

  @ApiProperty({
    description: 'Current permit status',
    example: 'APPROVED',
    enum: ['APPROVED', 'REQUESTED', 'SUSPEND', 'EXPIRED'],
  })
  permitStatus: string

  @ApiProperty({
    description: 'Distance from the search point in meters',
    example: 245.7,
  })
  distance: number
}
