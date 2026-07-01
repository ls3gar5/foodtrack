import axios from 'axios'
import { Facility, FacilityDetail, SearchParams } from '../types/facility.types'

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
})

export async function searchFacilities(params: SearchParams): Promise<Facility[]> {
  const { data } = await apiClient.get<Facility[]>('/facilities/search', {
    params: {
      latitude: params.latitude,
      longitude: params.longitude,
      ...(params.radius !== undefined && { radius: params.radius }),
      ...(params.foodType !== undefined && { foodType: params.foodType }),
      ...(params.facilityType !== undefined && { facilityType: params.facilityType }),
    },
  })
  return data
}

export async function getFacilityDetail(permitId: string): Promise<FacilityDetail> {
  const { data } = await apiClient.get<FacilityDetail>(`/facilities/${encodeURIComponent(permitId)}`)
  return data
}
