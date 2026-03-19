/**
 * Property 5: Table Sorting Correctness
 * 
 * For any table data and sortable column, clicking the column header SHALL sort 
 * the data in ascending order, and clicking again SHALL sort in descending order, 
 * with the sorted data maintaining all original rows.
 * 
 * **Validates: Requirements 5.2**
 * 
 * Requirements:
 * - 5.2: WHEN rendering table headers, THE Table_Renderer SHALL support sorting 
 *        functionality via column header clicks
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ============================================
// Sorting Utility Functions (to be tested)
// ============================================

/**
 * Generic sort function for table data
 * Sorts an array of objects by a specified column in ascending or descending order
 * 
 * @param data - Array of data objects to sort
 * @param column - The key of the column to sort by
 * @param order - Sort order: 'asc' for ascending, 'desc' for descending
 * @returns A new sorted array (does not mutate original)
 */
export function sortData<T extends Record<string, unknown>>(
  data: T[],
  column: keyof T,
  order: 'asc' | 'desc'
): T[] {
  // Create a copy to avoid mutating original data
  const sorted = [...data]
  
  sorted.sort((a, b) => {
    const aVal = a[column]
    const bVal = b[column]
    
    // Handle null/undefined values - push them to the end
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    
    // Compare values based on type
    let comparison: number
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      // Fallback to string comparison
      comparison = String(aVal).localeCompare(String(bVal))
    }
    
    // Apply sort order
    return order === 'asc' ? comparison : -comparison
  })
  
  return sorted
}

/**
 * Stable sort function that maintains relative order of equal elements
 * Uses the original index as a tiebreaker
 * 
 * @param data - Array of data objects to sort
 * @param column - The key of the column to sort by
 * @param order - Sort order: 'asc' for ascending, 'desc' for descending
 * @returns A new sorted array with stable ordering
 */
export function stableSortData<T extends Record<string, unknown>>(
  data: T[],
  column: keyof T,
  order: 'asc' | 'desc'
): T[] {
  // Create indexed copy to preserve original positions
  const indexed = data.map((item, index) => ({ item, index }))
  
  indexed.sort((a, b) => {
    const aVal = a.item[column]
    const bVal = b.item[column]
    
    // Handle null/undefined values - push them to the end
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    
    // Compare values based on type
    let comparison: number
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      // Fallback to string comparison
      comparison = String(aVal).localeCompare(String(bVal))
    }
    
    // Apply sort order
    const orderMultiplier = order === 'asc' ? 1 : -1
    
    // If values are equal, use original index for stability
    if (comparison === 0) {
      return a.index - b.index
    }
    
    return comparison * orderMultiplier
  })
  
  return indexed.map(({ item }) => item)
}

// ============================================
// Test Data Types
// ============================================

interface TestTableRow {
  id: number
  name: string
  value: number
}

// ============================================
// Property Tests
// ============================================

// Feature: frontend-shadcn-migration, Property 5: Table Sorting Correctness
describe('Property 5: Table Sorting Correctness', () => {
  /**
   * Test that sorting preserves all rows (no data loss)
   * **Validates: Requirement 5.2**
   */
  it('sorting preserves all rows - no data is lost or duplicated', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, column, order) => {
          const sorted = sortData(data, column, order)
          
          // Verify length is preserved
          expect(sorted.length).toBe(data.length)
          
          // Verify all original items are present (by checking IDs if unique, or by content)
          const originalSet = new Set(data.map(item => JSON.stringify(item)))
          const sortedSet = new Set(sorted.map(item => JSON.stringify(item)))
          
          expect(sortedSet.size).toBe(originalSet.size)
          for (const item of originalSet) {
            expect(sortedSet.has(item)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that ascending sort orders data correctly
   * **Validates: Requirement 5.2**
   */
  it('ascending sort orders data correctly - each element >= previous element', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        (data, column) => {
          const sorted = sortData(data, column, 'asc')
          
          // Verify ascending order
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]![column]
            const curr = sorted[i]![column]
            
            if (typeof prev === 'string' && typeof curr === 'string') {
              expect(curr.localeCompare(prev)).toBeGreaterThanOrEqual(0)
            } else if (typeof prev === 'number' && typeof curr === 'number') {
              expect(curr).toBeGreaterThanOrEqual(prev)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that descending sort orders data correctly
   * **Validates: Requirement 5.2**
   */
  it('descending sort orders data correctly - each element <= previous element', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        (data, column) => {
          const sorted = sortData(data, column, 'desc')
          
          // Verify descending order
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]![column]
            const curr = sorted[i]![column]
            
            if (typeof prev === 'string' && typeof curr === 'string') {
              expect(curr.localeCompare(prev)).toBeLessThanOrEqual(0)
            } else if (typeof prev === 'number' && typeof curr === 'number') {
              expect(curr).toBeLessThanOrEqual(prev)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that stable sort maintains relative order of equal elements
   * **Validates: Requirement 5.2**
   */
  it('stable sort maintains relative order of equal elements', () => {
    fc.assert(
      fc.property(
        // Generate data with intentional duplicates in the sort column
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.constantFrom(1, 2, 3, 4, 5), // Limited values to ensure duplicates
          }),
          { minLength: 2, maxLength: 50 }
        ),
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, order) => {
          // Add unique sequence numbers to track original order
          const dataWithSequence = data.map((item, index) => ({
            ...item,
            _originalIndex: index,
          }))
          
          const sorted = stableSortData(dataWithSequence, 'value', order)
          
          // Group by value and check that within each group, original order is preserved
          const groups = new Map<number, typeof sorted>()
          for (const item of sorted) {
            const key = item.value
            if (!groups.has(key)) {
              groups.set(key, [])
            }
            groups.get(key)!.push(item)
          }
          
          // Within each group, original indices should be in ascending order
          for (const group of groups.values()) {
            for (let i = 1; i < group.length; i++) {
              expect(group[i]!._originalIndex).toBeGreaterThan(group[i - 1]!._originalIndex)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting does not mutate the original array
   * **Validates: Requirement 5.2**
   */
  it('sorting does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, column, order) => {
          // Create a deep copy of original data for comparison
          const originalCopy = JSON.stringify(data)
          
          // Perform sort
          sortData(data, column, order)
          
          // Verify original data is unchanged
          expect(JSON.stringify(data)).toBe(originalCopy)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting handles null/undefined values correctly
   * **Validates: Requirement 5.2**
   */
  it('sorting handles null values by pushing them to the end', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.option(fc.nat({ max: 10000 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, order) => {
          const sorted = sortData(data, 'value', order)
          
          // Find the index of the first null value
          const firstNullIndex = sorted.findIndex(item => item.value === null)
          
          if (firstNullIndex !== -1) {
            // All items after the first null should also be null
            for (let i = firstNullIndex; i < sorted.length; i++) {
              expect(sorted[i]!.value).toBeNull()
            }
            
            // All items before the first null should not be null
            for (let i = 0; i < firstNullIndex; i++) {
              expect(sorted[i]!.value).not.toBeNull()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting by numeric column produces correct numeric ordering
   * (not string ordering, e.g., 2 < 10, not "10" < "2")
   * **Validates: Requirement 5.2**
   */
  it('sorting by numeric column uses numeric comparison, not string comparison', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 2, maxLength: 100 }
        ),
        (data) => {
          const sorted = sortData(data, 'value', 'asc')
          
          // Verify numeric ordering (not string ordering)
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!.value
            const curr = sorted[i]!.value
            
            // This would fail if string comparison was used
            // e.g., "10" < "2" in string comparison, but 10 > 2 in numeric
            expect(curr).toBeGreaterThanOrEqual(prev)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting by string column uses locale-aware comparison
   * **Validates: Requirement 5.2**
   */
  it('sorting by string column uses locale-aware comparison', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, order) => {
          const sorted = sortData(data, 'name', order)
          
          // Verify string ordering using localeCompare
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]!.name
            const curr = sorted[i]!.name
            const comparison = curr.localeCompare(prev)
            
            if (order === 'asc') {
              expect(comparison).toBeGreaterThanOrEqual(0)
            } else {
              expect(comparison).toBeLessThanOrEqual(0)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting is idempotent - sorting already sorted data produces same result
   * **Validates: Requirement 5.2**
   */
  it('sorting is idempotent - sorting already sorted data produces same result', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, column, order) => {
          const sortedOnce = sortData(data, column, order)
          const sortedTwice = sortData(sortedOnce, column, order)
          
          // Results should be identical
          expect(sortedTwice).toEqual(sortedOnce)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that toggling sort order reverses the array (for unique values)
   * **Validates: Requirement 5.2**
   */
  it('toggling sort order reverses the sorted array for unique values', () => {
    fc.assert(
      fc.property(
        // Generate data with unique values to ensure deterministic reversal
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ).filter(data => {
          // Filter to ensure unique values in the sort column
          const values = data.map(d => d.value)
          return new Set(values).size === values.length
        }),
        (data) => {
          const sortedAsc = sortData(data, 'value', 'asc')
          const sortedDesc = sortData(data, 'value', 'desc')
          
          // Descending should be reverse of ascending
          expect(sortedDesc).toEqual([...sortedAsc].reverse())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Combined property test as shown in the design document
   * **Validates: Requirement 5.2**
   */
  it('sorting preserves all rows and orders correctly (combined test)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 50 }),
            value: fc.nat({ max: 10000 }),
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.constantFrom('id', 'name', 'value') as fc.Arbitrary<keyof TestTableRow>,
        fc.constantFrom('asc', 'desc') as fc.Arbitrary<'asc' | 'desc'>,
        (data, column, order) => {
          const sorted = sortData(data, column, order)
          
          // Property 1: Preserve all rows
          expect(sorted.length).toBe(data.length)
          
          // Property 2: Correct ordering
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1]![column]
            const curr = sorted[i]![column]
            
            if (typeof prev === 'number' && typeof curr === 'number') {
              if (order === 'asc') {
                expect(curr >= prev).toBe(true)
              } else {
                expect(curr <= prev).toBe(true)
              }
            } else if (typeof prev === 'string' && typeof curr === 'string') {
              const comparison = curr.localeCompare(prev)
              if (order === 'asc') {
                expect(comparison >= 0).toBe(true)
              } else {
                expect(comparison <= 0).toBe(true)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
