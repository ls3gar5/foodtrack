# Requirements Document

## Introduction

The Food Truck Locator feature enables users to discover mobile food facilities (trucks and push carts) near a specific location on an interactive map. The system ingests permit data from the SF Open Data portal (Mobile Food Facility Permit dataset) and exposes it through a RESTful API consumed by a React web frontend. Users can search by location, filter by food type or facility type, and view details about each vendor.

## Glossary

- **Locator_API**: The BFF REST endpoint(s) that accept location-based queries and return nearby food truck data
- **Back_Service**: The internal backend service responsible for data ingestion, storage, and geospatial querying
- **Frontend**: The React web application that renders the map and food truck results
- **Facility**: A mobile food vendor (truck or push cart) with an associated permit from SF DPH
- **Search_Radius**: The configurable distance (in meters) from a center point used to find nearby facilities
- **Food_Items**: The comma-separated list of food products offered by a facility
- **Facility_Type**: The classification of a mobile food vendor — either "Truck" or "Push Cart"
- **Permit_Status**: The current state of a facility's permit (APPROVED, REQUESTED, SUSPEND, EXPIRED)
- **Data_Source**: The SF Open Data SODA API endpoint providing Mobile Food Facility Permit records
- **Map_Component**: The interactive map UI element that displays facility locations as markers

## Requirements

### Requirement 1: Data Ingestion

**User Story:** As a system operator, I want the system to import food truck data from the SF Open Data portal, so that users can search up-to-date facility information.

#### Acceptance Criteria

1. WHEN the Back_Service starts, THE Back_Service SHALL import facility records from the Data_Source into the PostgreSQL database within 60 seconds of startup
2. THE Back_Service SHALL store the following fields for each facility: applicant name, facility type, address, food items, latitude, longitude, permit status, and permit identifier
3. IF the Data_Source is unreachable, THEN THE Back_Service SHALL log the error and retry the import up to 3 times with exponential backoff starting at 2 seconds (2s, 4s, 8s)
4. IF all 3 retry attempts fail, THEN THE Back_Service SHALL log a critical error and start without facility data, leaving the database in its previous state
5. WHEN a facility record already exists in the database (matched by permit identifier), THE Back_Service SHALL update the existing record rather than create a duplicate
6. THE Back_Service SHALL only import facilities that have valid latitude and longitude values (non-null, non-zero, latitude between -90 and 90, longitude between -180 and 180)
7. IF a facility record fails validation during import, THEN THE Back_Service SHALL skip that record, log a warning, and continue importing the remaining records

### Requirement 2: Geospatial Search

**User Story:** As a user, I want to find food trucks near a specific location, so that I can discover nearby food options.

#### Acceptance Criteria

1. WHEN the Locator_API receives a request with latitude, longitude, and an optional radius parameter (between 100 and 10000 meters), THE Locator_API SHALL return all facilities within the specified Search_Radius
2. THE Locator_API SHALL use a default Search_Radius of 1000 meters when no radius parameter is provided
3. THE Locator_API SHALL return results sorted by distance from the provided coordinates, nearest first
4. WHEN no facilities are found within the Search_Radius, THE Locator_API SHALL return an empty array with HTTP status 200
5. IF the latitude is missing or outside the range -90 to 90, or the longitude is missing or outside the range -180 to 180, or the radius is outside the range 100 to 10000, THEN THE Locator_API SHALL return HTTP status 400 with an error message indicating which parameter failed validation
6. THE Locator_API SHALL only return facilities with a Permit_Status of APPROVED
7. WHEN more than 50 facilities match the search criteria, THE Locator_API SHALL return only the 50 nearest facilities

### Requirement 3: Food Type Filtering

**User Story:** As a user, I want to filter food trucks by the type of food they serve, so that I can find exactly what I'm craving.

#### Acceptance Criteria

1. WHEN the Locator_API receives a request with a food type query parameter containing at least 2 characters, THE Locator_API SHALL return only facilities whose Food_Items contain the specified term using case-insensitive partial match
2. WHEN the food type filter is combined with a location search, THE Locator_API SHALL apply both filters (AND logic) and return only facilities matching both the food type and location criteria
3. THE Locator_API SHALL support up to 10 food type terms separated by commas in a single request, returning facilities matching any of the provided terms (OR logic)
4. IF the food type query parameter is empty, contains only whitespace, or every provided term is shorter than 2 characters, THEN THE Locator_API SHALL return a 400 response with an error message indicating the filter value is invalid
5. WHEN the food type filter produces no matching facilities, THE Locator_API SHALL return a successful response with an empty results list

### Requirement 4: Facility Detail

**User Story:** As a user, I want to view details about a specific food truck, so that I can decide whether to visit it.

#### Acceptance Criteria

1. WHEN the Locator_API receives a request for a specific facility by permit identifier, THE Locator_API SHALL return the facility record including applicant name, facility type, address, food items, latitude, longitude, and permit status within 500ms
2. IF the requested permit identifier does not match any existing facility, THEN THE Locator_API SHALL return HTTP status 404 with an error message indicating that no facility was found for the given permit identifier
3. IF the permit identifier in the request is malformed or empty, THEN THE Locator_API SHALL return HTTP status 400 with an error message indicating the identifier is invalid
4. WHEN the Locator_API returns a facility record, THE Locator_API SHALL include all enumerated fields in the response, representing absent data as null values rather than omitting the field

### Requirement 5: Interactive Map Display

**User Story:** As a user, I want to see food trucks displayed on a map, so that I can visually identify nearby options relative to my position.

#### Acceptance Criteria

1. WHEN the BFF returns search results, THE Frontend SHALL render an interactive Map_Component centered on the searched location displaying one marker per facility returned in the response
2. WHEN the user clicks a facility marker on the Map_Component, THE Frontend SHALL display a popup showing the facility name, address, and food items; IF a facility has no food items listed, THEN THE Frontend SHALL display "No food items listed" in the popup
3. WHEN the user performs a search, THE Frontend SHALL update the Map_Component to center on the searched location and display markers only for the facilities returned by that search
4. IF the search returns zero facilities, THEN THE Frontend SHALL display the Map_Component centered on the searched location with no markers and a visible message indicating no food trucks were found in the area
5. THE Frontend SHALL visually distinguish between Truck and Push Cart facility types using different marker icons and SHALL display a legend on the Map_Component identifying each icon type
6. WHEN the Map_Component is rendered, THE Frontend SHALL allow the user to zoom and pan the map to explore the surrounding area

### Requirement 6: Location Search Input

**User Story:** As a user, I want to search by entering an address or clicking on the map, so that I can easily specify my area of interest.

#### Acceptance Criteria

1. THE Frontend SHALL provide a text input (maximum 200 characters) where users can type an address or coordinates in decimal degrees format (e.g., "37.7749, -122.4194") to search
2. WHEN the user submits a search address, THE Frontend SHALL geocode the address into latitude and longitude coordinates within 5 seconds before querying the Locator_API
3. WHEN the user clicks directly on the Map_Component, THE Frontend SHALL use the clicked coordinates as the search location and query the Locator_API
4. IF geocoding fails for the entered address or does not respond within 5 seconds, THEN THE Frontend SHALL display an error message indicating the address could not be found and preserve the user's entered text in the input field
5. IF the user enters coordinates outside the valid range (latitude between -90 and 90, longitude between -180 and 180), THEN THE Frontend SHALL display an error message indicating the coordinates are invalid
6. WHEN the user submits a search (via text or map click), THE Frontend SHALL display a loading indicator until the Locator_API response is received or the request times out

### Requirement 7: Results List

**User Story:** As a user, I want to see a list of nearby food trucks alongside the map, so that I can quickly scan options and their details.

#### Acceptance Criteria

1. THE Frontend SHALL display a list panel showing all facilities returned by the current search, sorted by distance from the search point in ascending order, displaying a maximum of 50 results
2. WHEN a facility is displayed in the results list, THE Frontend SHALL show the applicant name, distance from search point in miles rounded to one decimal place, facility type, and a summary of food items truncated to 80 characters with an ellipsis if longer
3. WHEN the user clicks a facility in the results list, THE Frontend SHALL highlight the corresponding marker on the Map_Component with a visually distinct style and center the map on it
4. WHILE the Locator_API request is in progress, THE Frontend SHALL display a loading indicator in the list panel area
5. IF the Locator_API returns zero results, THEN THE Frontend SHALL display a message indicating no food trucks were found near the searched location

### Requirement 8: API Response Caching

**User Story:** As a system operator, I want frequently requested searches to be cached, so that the system responds quickly and reduces database load.

#### Acceptance Criteria

1. WHEN the Locator_API receives a geospatial search request, THE Locator_API SHALL generate a cache key from the normalized request parameters (latitude rounded to 4 decimal places, longitude rounded to 4 decimal places, radius, and any active filters) and check Redis for a cached response matching that key
2. WHEN a cached response exists in Redis and its TTL has not expired, THE Locator_API SHALL return the cached response without querying the database
3. WHEN no cached response exists in Redis for the generated cache key, THE Locator_API SHALL query the database, store the result in Redis with a TTL of 300 seconds, and return the response to the caller
4. IF Redis is unavailable or a cache read/write operation fails, THEN THE Locator_API SHALL bypass the cache, query the database directly, and return the response without error to the caller
5. WHEN the Back_Service completes a data import, THE Back_Service SHALL invalidate all cached search results by deleting all keys matching the search cache key pattern
6. IF cache invalidation fails after a data import, THEN THE Back_Service SHALL log the failure and continue operation, allowing cached entries to expire naturally via their TTL

### Requirement 9: API Documentation

**User Story:** As a developer, I want the API to be documented with OpenAPI/Swagger, so that I can understand and integrate with the endpoints.

#### Acceptance Criteria

1. THE Locator_API SHALL expose an OpenAPI specification at a single dedicated HTTP endpoint describing all food truck locator endpoints, request parameters (including type, required/optional status, and constraints), and response schemas (including all field names, types, and example values)
2. THE Locator_API SHALL decorate all controller endpoints with Swagger annotations including an operation summary of no more than 120 characters, a description of each path and query parameter with its type and constraints, and at least one response example per success (2xx) and one per error (4xx) status code returned by that endpoint
3. WHEN the OpenAPI specification endpoint is requested, THE Locator_API SHALL return a valid OpenAPI 3.0 document that passes schema validation without errors
4. IF a controller endpoint is added or modified without the required Swagger annotations, THEN THE Locator_API SHALL fail the lint check indicating the missing documentation

### Requirement 10: Facility Type Filtering

**User Story:** As a user, I want to filter results by facility type (Truck or Push Cart), so that I can narrow my search to my preferred vendor format.

#### Acceptance Criteria

1. WHEN the Locator_API receives a request with a `facilityType` query parameter set to a valid Facility_Type value, THE Locator_API SHALL return only facilities whose Facility_Type matches the specified value using case-insensitive comparison
2. THE Locator_API SHALL accept "Truck" and "Push Cart" as valid Facility_Type filter values
3. IF an invalid Facility_Type value is provided, THEN THE Locator_API SHALL return HTTP status 400 with an error message indicating the provided value is not a recognized facility type and listing the valid options
4. IF no facilities match the specified Facility_Type within the search area, THEN THE Locator_API SHALL return HTTP status 200 with an empty results array
5. IF the `facilityType` query parameter is omitted from the request, THEN THE Locator_API SHALL return facilities of all types without filtering by Facility_Type
