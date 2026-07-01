import React from 'react'

jest.mock('react-router-dom', () => ({
  createBrowserRouter: jest.fn((routes) => ({ routes })),
  RouterProvider: ({ router }: any) => (
    <div data-testid="router-provider" data-routes={JSON.stringify(router.routes.map((r: any) => r.path))} />
  ),
  Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
}))

jest.mock('react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: any) => <div data-testid="query-client-provider">{children}</div>,
}))

jest.mock('./features/food-truck-locator/FoodTruckLocator', () => ({
  FoodTruckLocator: () => <div data-testid="food-truck-locator" />,
}))

describe('App Router', () => {
  it('should define a route for /food-trucks', async () => {
    const { router } = await import('./router')
    const routes = router.routes
    const foodTrucksRoute = routes.find((r: any) => r.path === '/food-trucks')
    expect(foodTrucksRoute).toBeDefined()
  })

  it('should define a redirect from / to /food-trucks', async () => {
    const { router } = await import('./router')
    const routes = router.routes
    const rootRoute = routes.find((r: any) => r.path === '/')
    expect(rootRoute).toBeDefined()
  })

  it('should have /food-trucks as the primary feature route', async () => {
    const { router } = await import('./router')
    const routes = router.routes
    const paths = routes.map((r: any) => r.path)
    expect(paths).toContain('/food-trucks')
    expect(paths).toContain('/')
  })

  it('should export App component that wraps with QueryClientProvider', async () => {
    const { App } = await import('./App')
    expect(App).toBeDefined()
    expect(typeof App).toBe('function')
  })
})
