import * as fc from 'fast-check'
import { formatDistance, truncateFoodItems } from './ResultCard'

describe('formatDistance', () => {
  it('converts meters to miles with 1 decimal place', () => {
    expect(formatDistance(1609.34)).toBe('1.0 mi')
  })

  it('formats short distances', () => {
    expect(formatDistance(321.869)).toBe('0.2 mi')
  })

  it('formats zero distance', () => {
    expect(formatDistance(0)).toBe('0.0 mi')
  })

  it('formats large distances', () => {
    expect(formatDistance(16093.4)).toBe('10.0 mi')
  })

  it('rounds correctly at boundary', () => {
    // 805 meters = 0.5 miles (805 * 0.000621371 = 0.5001...)
    expect(formatDistance(805)).toBe('0.5 mi')
  })
})

describe('truncateFoodItems', () => {
  it('returns "No food items listed" for null', () => {
    expect(truncateFoodItems(null)).toBe('No food items listed')
  })

  it('returns full string when shorter than 80 chars', () => {
    const short = 'Tacos, Burritos, Nachos'
    expect(truncateFoodItems(short)).toBe(short)
  })

  it('returns full string when exactly 80 chars', () => {
    const exact80 = 'a'.repeat(80)
    expect(truncateFoodItems(exact80)).toBe(exact80)
  })

  it('truncates at 80 chars and appends ellipsis when longer', () => {
    const long = 'a'.repeat(100)
    const result = truncateFoodItems(long)
    expect(result).toBe('a'.repeat(80) + '...')
    expect(result.length).toBe(83)
  })

  it('truncates at word boundary content', () => {
    const long = 'Tacos: Al Pastor, Carnitas, Barbacoa, Pollo. Burritos: Bean, Cheese, Super. Quesadillas, Nachos, Chips'
    const result = truncateFoodItems(long)
    expect(result.length).toBe(83)
    expect(result.endsWith('...')).toBe(true)
    expect(result.slice(0, 80)).toBe(long.slice(0, 80))
  })

  it('returns "No food items listed" for empty string', () => {
    expect(truncateFoodItems('')).toBe('No food items listed')
  })
})

describe('Property 16: Distance display formatting and food items truncation', () => {
  /**
   * Validates: Requirements 7.2
   *
   * For any facility in the results list, the displayed distance SHALL be the
   * distance in miles rounded to one decimal place, and the food items summary
   * SHALL be truncated to 80 characters with an ellipsis appended when the
   * original exceeds 80 characters.
   */
  it('Property 16: formatDistance converts meters to miles (1 decimal) and truncateFoodItems truncates correctly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 50000, noNaN: true, noDefaultInfinity: true }),
        fc.option(fc.string({ minLength: 0, maxLength: 200 })),
        (meters, foodItems) => {
          // Distance formatting
          const formatted = formatDistance(meters)
          const expectedMiles = meters * 0.000621371
          expect(formatted).toBe(`${expectedMiles.toFixed(1)} mi`)

          // Food items truncation
          const truncated = truncateFoodItems(foodItems ?? null)
          if (foodItems === null || foodItems === '') {
            expect(truncated).toBe('No food items listed')
          } else if (foodItems.length <= 80) {
            expect(truncated).toBe(foodItems)
          } else {
            expect(truncated).toBe(foodItems.slice(0, 80) + '...')
            expect(truncated.length).toBe(83)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
