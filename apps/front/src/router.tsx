import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

const FoodTruckLocator = lazy(
  () => import('./features/food-truck-locator/FoodTruckLocator').then(
    (m) => ({ default: m.FoodTruckLocator }),
  ),
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/food-trucks" replace />,
  },
  {
    path: '/food-trucks',
    element: (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <FoodTruckLocator />
      </Suspense>
    ),
  },
])
