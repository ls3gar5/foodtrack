import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger'
import { FacilityService } from './facility.service'
import { FacilityCacheService } from './facility-cache.service'
import {
  SearchFacilitiesDto,
  FacilityResponseDto,
  FacilityDetailResponseDto,
} from './dto'

@ApiTags('Facilities')
@Controller('api/facilities')
export class FacilityController {
  constructor(
    private readonly facilityService: FacilityService,
    private readonly cacheService: FacilityCacheService,
  ) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Search nearby food facilities by location with optional filters' })
  @ApiQuery({
    name: 'latitude',
    type: Number,
    required: true,
    description: 'Latitude of the search center point (-90 to 90)',
  })
  @ApiQuery({
    name: 'longitude',
    type: Number,
    required: true,
    description: 'Longitude of the search center point (-180 to 180)',
  })
  @ApiQuery({
    name: 'radius',
    type: Number,
    required: false,
    description: 'Search radius in meters (100 to 10000, default: 1000)',
  })
  @ApiQuery({
    name: 'foodType',
    type: String,
    required: false,
    description: 'Comma-separated food type filter terms (each >= 2 chars, max 10 terms)',
  })
  @ApiQuery({
    name: 'facilityType',
    type: String,
    required: false,
    description: 'Facility type filter: "Truck" or "Push Cart"',
    enum: ['Truck', 'Push Cart'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of facilities within the search radius sorted by distance',
    type: [FacilityResponseDto],
    content: {
      'application/json': {
        example: [
          {
            permitId: '22MFF-00001',
            applicant: "Natan's Catering",
            facilityType: 'Truck',
            address: '123 Market St',
            foodItems: 'Tacos, Burritos, Quesadillas',
            latitude: 37.7749,
            longitude: -122.4194,
            permitStatus: 'APPROVED',
            distance: 245.7,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — invalid query parameters',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          message: ['latitude must be between -90 and 90'],
          error: 'Bad Request',
        },
      },
    },
  })
  async search(
    @Query() dto: SearchFacilitiesDto,
  ): Promise<FacilityResponseDto[]> {
    const cacheKey = this.cacheService.generateKey(dto)
    const cached = await this.cacheService.get(cacheKey)

    if (cached) {
      return cached
    }

    const results = await this.facilityService.search(dto)
    await this.cacheService.set(cacheKey, results)

    return results
  }

  @Get(':permitId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get facility details by permit identifier' })
  @ApiParam({
    name: 'permitId',
    type: String,
    description: 'Unique permit identifier for the facility',
    example: '22MFF-00001',
  })
  @ApiResponse({
    status: 200,
    description: 'Facility detail record',
    type: FacilityDetailResponseDto,
    content: {
      'application/json': {
        example: {
          permitId: '22MFF-00001',
          applicant: "Natan's Catering",
          facilityType: 'Truck',
          address: '123 Market St',
          foodItems: 'Tacos, Burritos, Quesadillas',
          latitude: 37.7749,
          longitude: -122.4194,
          permitStatus: 'APPROVED',
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-06-20T14:45:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or empty permit identifier',
    content: {
      'application/json': {
        example: {
          statusCode: 400,
          message: 'Permit identifier must not be empty',
          error: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No facility found for the given permit identifier',
    content: {
      'application/json': {
        example: {
          statusCode: 404,
          message: 'No facility found for permit identifier: 22MFF-99999',
          error: 'Not Found',
        },
      },
    },
  })
  async findByPermitId(
    @Param('permitId') permitId: string,
  ): Promise<FacilityDetailResponseDto> {
    if (!permitId || permitId.trim().length === 0) {
      throw new BadRequestException('Permit identifier must not be empty')
    }

    const facility = await this.facilityService.findByPermitId(permitId)

    if (!facility) {
      throw new NotFoundException(
        `No facility found for permit identifier: ${permitId}`,
      )
    }

    return facility
  }
}
