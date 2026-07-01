import { Transform } from 'class-transformer'
import {
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

@ValidatorConstraint({ name: 'isFoodTypeValid', async: false })
export class IsFoodTypeValid implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments): boolean {
    if (!value || value.trim().length === 0) return false

    const terms = value.split(',').map((t) => t.trim())
    if (terms.length > 10) return false

    return terms.every((term) => term.length >= 2)
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'foodType must be comma-separated terms, each at least 2 characters, with a maximum of 10 terms'
  }
}

export class SearchFacilitiesDto {
  @ApiProperty({
    description: 'Latitude of the search center point',
    example: 37.7749,
    minimum: -90,
    maximum: 90,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'latitude must be a valid number' })
  @Min(-90, { message: 'latitude must be between -90 and 90' })
  @Max(90, { message: 'latitude must be between -90 and 90' })
  latitude: number

  @ApiProperty({
    description: 'Longitude of the search center point',
    example: -122.4194,
    minimum: -180,
    maximum: 180,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({}, { message: 'longitude must be a valid number' })
  @Min(-180, { message: 'longitude must be between -180 and 180' })
  @Max(180, { message: 'longitude must be between -180 and 180' })
  longitude: number

  @ApiPropertyOptional({
    description: 'Search radius in meters',
    example: 1000,
    minimum: 100,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber({}, { message: 'radius must be a valid number' })
  @Min(100, { message: 'radius must be between 100 and 10000 meters' })
  @Max(10000, { message: 'radius must be between 100 and 10000 meters' })
  radius?: number = 1000

  @ApiPropertyOptional({
    description: 'Comma-separated food type filter terms (each >= 2 chars, max 10 terms)',
    example: 'tacos,burritos',
  })
  @IsOptional()
  @Validate(IsFoodTypeValid)
  foodType?: string

  @ApiPropertyOptional({
    description: 'Facility type filter',
    example: 'Truck',
    enum: ['Truck', 'Push Cart'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value
    const normalized = value.toString().toLowerCase()
    if (normalized === 'truck') return 'Truck'
    if (normalized === 'push cart') return 'Push Cart'
    return value
  })
  @IsIn(['Truck', 'Push Cart'], {
    message: 'facilityType must be one of the following values: Truck, Push Cart',
  })
  facilityType?: string
}
