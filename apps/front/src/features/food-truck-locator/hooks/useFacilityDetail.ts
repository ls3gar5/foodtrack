import { useQuery } from 'react-query'
import { getFacilityDetail } from '../services/facilityApi'
import { FacilityDetail } from '../types/facility.types'

export function useFacilityDetail(permitId: string | null) {
  return useQuery<FacilityDetail, Error>(
    ['facilities', 'detail', permitId],
    () => getFacilityDetail(permitId as string),
    {
      enabled: permitId !== null,
    },
  )
}
