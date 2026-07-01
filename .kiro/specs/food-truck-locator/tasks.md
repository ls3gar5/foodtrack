# Implementation Plan: Food Truck Locator

## Overview

Implement a food truck locator feature that ingests SF Open Data facility permits into PostgreSQL with PostGIS, exposes geospatial search and detail endpoints through the BFF, and renders results on an interactive Leaflet map in the React frontend. The implementation follows the existing monorepo layered architecture across apps/back, apps/bff, and apps/front.

## Tasks

- [x] 1. Database setup and entity definition
  - [x] 1.1 Create PostGIS migration and Facility entity
    - Add a TypeORM migration that enables the PostGIS extension and creates the `facilities` table with geography column, indices (GIST on location, GIN on food_items, B-tree on permit_status and facility_type)
    - Create `apps/back/src/facility/facility.entity.ts` with all columns mapped per the design (permit_id PK, applicant, facility_type, address, food_items, location geography Point, latitude, longitude, permit_status, created_at, updated_at)
    - _Requirements: 1.2_

- [x] 2. Data ingestion service (apps/back)
  - [x] 2.1 Create the Facility module and IngestionService
    - Create `apps/back/src/facility/facility.module.ts` registering the entity, BullMQ queue, and services
    - Create `apps/back/src/facility/ingestion.service.ts` implementing: fetch from SODA API (`https://data.sfgov.org/resource/rqzj-sfat.json`), validate each record (non-null/non-zero lat/lng within valid range), upsert by permit_id, skip invalid records with warning log
    - Implement retry logic: up to 3 attempts with exponential backoff (2s, 4s, 8s) on SODA API failure; log critical error and proceed if all retries fail
    - After successful import, invalidate Redis cache keys matching `food-truck:search:*`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.5_

  - [x] 2.2 Create BullMQ ingestion processor
    - Create `apps/back/src/facility/ingestion.processor.ts` that registers a BullMQ processor to run the import job on service startup
    - Ensure the job is enqueued on module initialization so import begins within 60 seconds of startup
    - _Requirements: 1.1_

  - [x] 2.3 Write property tests for ingestion validation (Properties 11, 12, 13)
    - **Property 11: Upsert by permit identifier — no duplicates after ingestion of records with duplicate permit IDs**
    - **Validates: Requirements 1.5**
    - **Property 12: Valid coordinates imported, invalid coordinates skipped without stopping import**
    - **Validates: Requirements 1.6, 1.7**
    - **Property 13: All required fields mapped from valid SODA records**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write unit tests for IngestionService
    - Test retry behavior with exponential backoff using mocked HTTP
    - Test critical error logging when all retries exhausted
    - Test cache invalidation call after successful import
    - Test that service starts without data when import fails
    - _Requirements: 1.3, 1.4, 8.5, 8.6_

- [x] 3. Checkpoint - Ensure ingestion tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. BFF facility search and detail API (apps/bff)
  - [x] 4.1 Create DTOs and validation classes
    - Create `apps/bff/src/facility/dto/search-facilities.dto.ts` with class-validator decorators: latitude (required, -90 to 90), longitude (required, -180 to 180), radius (optional, 100-10000, default 1000), foodType (optional, comma-separated terms each >= 2 chars, max 10 terms), facilityType (optional, "Truck" or "Push Cart")
    - Create `apps/bff/src/facility/dto/facility-response.dto.ts` and `facility-detail-response.dto.ts` with Swagger decorators
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.4, 4.4, 10.1, 10.2, 10.3_

  - [x] 4.2 Create FacilityService with PostGIS queries
    - Create `apps/bff/src/facility/facility.service.ts` implementing geospatial search using `ST_DWithin` and `ST_Distance` on the geography column
    - Filter by permit_status = 'APPROVED', optional facilityType (case-insensitive), optional foodType (case-insensitive partial match with OR logic for multiple terms)
    - Sort by distance ascending, limit to 50 results
    - Implement `findByPermitId` for facility detail lookup
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 2.7, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 10.1, 10.4, 10.5_

  - [x] 4.3 Create FacilityCacheService with Redis
    - Create `apps/bff/src/facility/facility-cache.service.ts` implementing cache key generation (lat rounded to 4dp, lng rounded to 4dp, radius, foodType or "none", facilityType or "none"), get/set with 300s TTL, graceful bypass on Redis failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.4 Create FacilityController with Swagger annotations
    - Create `apps/bff/src/facility/facility.controller.ts` with endpoints:
      - `GET /api/facilities/search` — geospatial search with cache layer
      - `GET /api/facilities/:permitId` — facility detail by permit ID
    - Add full Swagger decorators: @ApiTags, @ApiOperation (summary <= 120 chars), @ApiQuery for each param with type and constraints, @ApiResponse for success (200) and error (400, 404) with examples
    - Wire cache service: check cache before DB query, store on cache miss
    - _Requirements: 2.1, 2.5, 4.1, 4.2, 4.3, 9.1, 9.2, 9.3_

  - [x] 4.5 Create FacilityModule and register in AppModule
    - Create `apps/bff/src/facility/facility.module.ts` importing TypeORM entity, Redis module, and registering controller + services
    - Register FacilityModule in the BFF's root AppModule
    - _Requirements: 2.1, 4.1_

  - [x] 4.6 Write property tests for search service (Properties 1-6)
    - **Property 1: All returned facilities are within the specified radius**
    - **Validates: Requirements 2.1**
    - **Property 2: Results sorted by distance ascending**
    - **Validates: Requirements 2.3**
    - **Property 3: Only APPROVED facilities returned**
    - **Validates: Requirements 2.6**
    - **Property 4: Food type filter OR logic with case-insensitive partial match**
    - **Validates: Requirements 3.1, 3.3**
    - **Property 5: Facility type filter exact case-insensitive match**
    - **Validates: Requirements 10.1**
    - **Property 6: Result set bounded to 50**
    - **Validates: Requirements 2.7**

  - [x] 4.7 Write property tests for validation and caching (Properties 7-10, 14-15)
    - **Property 7: Invalid coordinates/radius rejected with 400**
    - **Validates: Requirements 2.5**
    - **Property 8: Invalid food type filter rejected with 400**
    - **Validates: Requirements 3.4**
    - **Property 9: Invalid facility type rejected with 400**
    - **Validates: Requirements 10.3**
    - **Property 10: Facility detail includes all specified fields, absent as null**
    - **Validates: Requirements 4.1, 4.4**
    - **Property 14: Cache key normalization consistent for nearby coordinates**
    - **Validates: Requirements 8.1**
    - **Property 15: Cache bypass on Redis failure returns valid results**
    - **Validates: Requirements 8.4**

  - [x] 4.8 Write unit tests for FacilityController and FacilityCacheService
    - Test 404 for unknown permit ID, 400 for malformed permit ID
    - Test cache hit returns without DB query, cache miss stores with 300s TTL
    - Test Redis failure bypass
    - _Requirements: 4.2, 4.3, 8.2, 8.3, 8.4_

- [x] 5. Checkpoint - Ensure BFF tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend food truck locator feature (apps/front)
  - [x] 6.1 Create API client and TypeScript types
    - Create `apps/front/src/features/food-truck-locator/types/facility.types.ts` with interfaces for Facility, SearchParams, SearchResponse
    - Create `apps/front/src/features/food-truck-locator/services/facilityApi.ts` with Axios calls to `GET /api/facilities/search` and `GET /api/facilities/:permitId`
    - _Requirements: 2.1, 4.1_

  - [x] 6.2 Create custom hooks for search and geocoding
    - Create `apps/front/src/features/food-truck-locator/hooks/useFacilitySearch.ts` using React Query for facility search
    - Create `apps/front/src/features/food-truck-locator/hooks/useGeocoding.ts` for address-to-coordinates conversion with 5-second timeout
    - Create `apps/front/src/features/food-truck-locator/hooks/useFacilityDetail.ts` for single facility detail
    - _Requirements: 6.2, 6.4_

  - [x] 6.3 Create SearchInput component
    - Create `apps/front/src/features/food-truck-locator/components/SearchInput.tsx` with text input (max 200 chars), support for address and decimal coordinate format (e.g. "37.7749, -122.4194"), loading indicator on submit, error display for geocoding failures preserving user input, validation for out-of-range coordinates
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

  - [x] 6.4 Create MapView and FacilityMarker components
    - Create `apps/front/src/features/food-truck-locator/components/MapView.tsx` wrapping Leaflet with zoom/pan, centering on search location, click-to-search
    - Create `apps/front/src/features/food-truck-locator/components/FacilityMarker.tsx` with distinct icons for Truck vs Push Cart, popup showing name/address/food items (or "No food items listed" if null)
    - Create `apps/front/src/features/food-truck-locator/components/MapLegend.tsx` identifying Truck and Push Cart icons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.3_

  - [x] 6.5 Create ResultsList and ResultCard components
    - Create `apps/front/src/features/food-truck-locator/components/ResultsList.tsx` displaying all facilities sorted by distance, loading indicator while request in progress, "no food trucks found" message on empty results
    - Create `apps/front/src/features/food-truck-locator/components/ResultCard.tsx` showing applicant name, distance in miles (1 decimal), facility type, food items truncated to 80 chars with ellipsis
    - Clicking a result card highlights marker on map and centers map on it
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.6 Create FoodTruckLocator page component and wire together
    - Create `apps/front/src/features/food-truck-locator/FoodTruckLocator.tsx` composing SearchInput, MapView, and ResultsList
    - Wire search flow: submit address → geocode → call API → render map markers + results list
    - Wire map click → use coordinates → call API → update markers + list
    - Handle zero results: show map centered on location, no markers, visible message
    - _Requirements: 5.1, 5.3, 5.4, 6.3, 7.1_

  - [x] 6.7 Write frontend component and formatting tests
    - Test ResultCard distance formatting (meters to miles, 1 decimal place)
    - Test food items truncation at 80 characters with ellipsis
    - Test MapView rendering with markers for different facility types
    - Test SearchInput validation and error states
    - Test LoadingIndicator display during API requests
    - **Property 16: Distance display formatting and food items truncation**
    - **Validates: Requirements 7.2**

- [x] 7. Checkpoint - Ensure frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration and wiring
  - [x] 8.1 Update Docker Compose for PostGIS and Redis
    - Add PostGIS extension to the PostgreSQL service in `docker-compose.yml` (use `postgis/postgis:16-3.4-alpine` image or add extension in init script)
    - Ensure Redis service is configured for both caching and BullMQ
    - Add environment variables for SODA API URL
    - _Requirements: 1.1, 8.1_

  - [x] 8.2 Add route and navigation for Food Truck Locator page
    - Register the FoodTruckLocator page in the React Router configuration
    - Add navigation entry to access the food truck locator feature
    - _Requirements: 5.1, 6.1_

  - [x] 8.3 Write integration tests for PostGIS queries
    - Seed facilities at known coordinates
    - Verify distance calculations accurate to within 1 meter
    - Test full search with combined filters against real PostGIS
    - _Requirements: 2.1, 2.3, 3.2, 10.1_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout: NestJS 11 for backend services, React 18 with Leaflet for frontend
- PostGIS geography type enables accurate distance calculations in meters without coordinate projection
- Redis caching uses normalized cache keys (4 decimal places for lat/lng) with 300s TTL

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "4.2", "4.3"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.4", "6.1"] },
    { "id": 4, "tasks": ["4.5", "4.6", "4.7", "4.8", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 6, "tasks": ["6.6", "6.7"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
