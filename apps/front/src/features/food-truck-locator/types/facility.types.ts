export interface Facility {
  permitId: string
  applicant: string
  facilityType: string
  address: string
  foodItems: string | null
  latitude: number
  longitude: number
  permitStatus: string
  distance: number
}

export interface FacilityDetail {
  permitId: string
  applicant: string
  facilityType: string
  address: string
  foodItems: string | null
  latitude: number
  longitude: number
  permitStatus: string
  createdAt: string
  updatedAt: string
}

export interface SearchParams {
  latitude: number
  longitude: number
  radius?: number
  foodType?: string
  facilityType?: string
}
