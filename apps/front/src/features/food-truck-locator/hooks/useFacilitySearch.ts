import { useQuery } from 'react-query'
import { searchFacilities } from '../services/facilityApi'
import { Facility, SearchParams } from '../types/facility.types'

export function useFacilitySearch(params: SearchParams | null) {
  return useQuery<Facility[], Error>(
    ['facilities', 'search', params],
    () => searchFacilities(params as SearchParams),
    {
      enabled: params !== null,
    },
  )
}
