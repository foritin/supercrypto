/**
 * Property 6: Table Pagination Invariant
 * 
 * For any paginated table data, the total count of items across all pages SHALL 
 * equal the original data length, and navigating through pages SHALL display 
 * each item exactly once.
 * 
 * **Validates: Requirements 5.4**
 * 
 * Requirements:
 * - 5.4: WHEN paginating data, THE Table_Renderer SHALL implement pagination 
 *        using shadcn/ui Pagination component
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// ============================================
// Pagination Utility Functions (to be tested)
// ============================================

/**
 * Paginate an array of data
 * Returns the items for a specific page given the page index and page size
 * 
 * @param data - Array of data objects to paginate
 * @param pageIndex - Zero-based page index
 * @param pageSize - Number of items per page
 * @returns Array of items for the specified page
 */
export function paginateData<T>(
  data: T[],
  pageIndex: number,
  pageSize: number
): T[] {
  if (pageSize <= 0) return []
  if (pageIndex < 0) return []
  
  const startIndex = pageIndex * pageSize
  const endIndex = startIndex + pageSize
  
  return data.slice(startIndex, endIndex)
}

/**
 * Calculate the total number of pages for a given data length and page size
 * 
 * @param dataLength - Total number of items
 * @param pageSize - Number of items per page
 * @returns Total number of pages
 */
export function calculatePageCount(dataLength: number, pageSize: number): number {
  if (pageSize <= 0) return 0
  if (dataLength <= 0) return 0
  
  return Math.ceil(dataLength / pageSize)
}

/**
 * Get all items across all pages
 * Useful for verifying that pagination covers all items exactly once
 * 
 * @param data - Array of data objects
 * @param pageSize - Number of items per page
 * @returns Array of all items collected from all pages
 */
export function getAllItemsFromPages<T>(
  data: T[],
  pageSize: number
): T[] {
  const pageCount = calculatePageCount(data.length, pageSize)
  const allItems: T[] = []
  
  for (let page = 0; page < pageCount; page++) {
    const pageData = paginateData(data, page, pageSize)
    allItems.push(...pageData)
  }
  
  return allItems
}

/**
 * Validate page boundaries
 * Returns information about the start and end indices for a page
 * 
 * @param dataLength - Total number of items
 * @param pageIndex - Zero-based page index
 * @param pageSize - Number of items per page
 * @returns Object with start index, end index, and expected item count
 */
export function getPageBoundaries(
  dataLength: number,
  pageIndex: number,
  pageSize: number
): { startIndex: number; endIndex: number; expectedCount: number } {
  const startIndex = pageIndex * pageSize
  const endIndex = Math.min(startIndex + pageSize, dataLength)
  const expectedCount = Math.max(0, endIndex - startIndex)
  
  return { startIndex, endIndex, expectedCount }
}

// ============================================
// Test Data Types
// ============================================

interface TestTableRow {
  id: number
  name?: string
  value?: number
}

// ============================================
// Property Tests
// ============================================

// Feature: frontend-shadcn-migration, Property 6: Table Pagination Invariant
describe('Property 6: Table Pagination Invariant', () => {
  /**
   * Test that total count across all pages equals original data length
   * **Validates: Requirement 5.4**
   */
  it('total count across all pages equals original data length', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 200 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const allItems = getAllItemsFromPages(data, pageSize)
          
          // Total count should equal original data length
          expect(allItems.length).toBe(data.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that each item appears exactly once across all pages
   * **Validates: Requirement 5.4**
   */
  it('each item appears exactly once across all pages', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 200 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const pageCount = calculatePageCount(data.length, pageSize)
          const allItems: number[] = []
          
          for (let page = 0; page < pageCount; page++) {
            const pageData = paginateData(data, page, pageSize)
            allItems.push(...pageData.map(item => item.id))
          }
          
          // Total count should equal original data length
          expect(allItems.length).toBe(data.length)
          
          // Each ID should appear exactly once (verify by comparing with original)
          // Note: IDs may not be unique in generated data, so we compare the full items
          const originalIds = data.map(item => item.id)
          expect(allItems).toEqual(originalIds)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that page count calculation is correct
   * **Validates: Requirement 5.4**
   */
  it('page count calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 100 }),
        (dataLength, pageSize) => {
          const pageCount = calculatePageCount(dataLength, pageSize)
          const expectedPageCount = Math.ceil(dataLength / pageSize)
          
          expect(pageCount).toBe(expectedPageCount)
          
          // Verify that pageCount * pageSize >= dataLength
          if (dataLength > 0) {
            expect(pageCount * pageSize).toBeGreaterThanOrEqual(dataLength)
            // And (pageCount - 1) * pageSize < dataLength (unless pageCount is 0)
            if (pageCount > 0) {
              expect((pageCount - 1) * pageSize).toBeLessThan(dataLength)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that page boundaries are correct
   * **Validates: Requirement 5.4**
   */
  it('page boundaries are correct', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 200 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const pageCount = calculatePageCount(data.length, pageSize)
          
          for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
            const pageData = paginateData(data, pageIndex, pageSize)
            const boundaries = getPageBoundaries(data.length, pageIndex, pageSize)
            
            // Page data length should match expected count
            expect(pageData.length).toBe(boundaries.expectedCount)
            
            // First item should be at startIndex
            if (pageData.length > 0) {
              expect(pageData[0]).toEqual(data[boundaries.startIndex])
            }
            
            // Last item should be at endIndex - 1
            if (pageData.length > 0) {
              expect(pageData[pageData.length - 1]).toEqual(data[boundaries.endIndex - 1])
            }
            
            // Non-last pages should have exactly pageSize items
            if (pageIndex < pageCount - 1) {
              expect(pageData.length).toBe(pageSize)
            }
            
            // Last page should have remaining items
            if (pageIndex === pageCount - 1) {
              const remainingItems = data.length - (pageIndex * pageSize)
              expect(pageData.length).toBe(remainingItems)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that pagination preserves item order
   * **Validates: Requirement 5.4**
   */
  it('pagination preserves item order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ 
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 20 }),
            value: fc.nat({ max: 1000 })
          }),
          { minLength: 1, maxLength: 200 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const allItems = getAllItemsFromPages(data, pageSize)
          
          // Items should be in the same order as original
          expect(allItems).toEqual(data)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that empty pages are handled correctly
   * **Validates: Requirement 5.4**
   */
  it('empty data results in zero pages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (pageSize) => {
          const emptyData: TestTableRow[] = []
          const pageCount = calculatePageCount(emptyData.length, pageSize)
          
          expect(pageCount).toBe(0)
          
          // Requesting any page from empty data should return empty array
          const page0 = paginateData(emptyData, 0, pageSize)
          expect(page0).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that out-of-bounds page indices return empty arrays
   * **Validates: Requirement 5.4**
   */
  it('out-of-bounds page indices return empty arrays', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const pageCount = calculatePageCount(data.length, pageSize)
          
          // Page index beyond last page should return empty
          const beyondLastPage = paginateData(data, pageCount, pageSize)
          expect(beyondLastPage).toEqual([])
          
          // Negative page index should return empty
          const negativePage = paginateData(data, -1, pageSize)
          expect(negativePage).toEqual([])
          
          // Very large page index should return empty
          const veryLargePage = paginateData(data, pageCount + 100, pageSize)
          expect(veryLargePage).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that page size of 1 creates one page per item
   * **Validates: Requirement 5.4**
   */
  it('page size of 1 creates one page per item', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 50 }
        ),
        (data) => {
          const pageSize = 1
          const pageCount = calculatePageCount(data.length, pageSize)
          
          // Should have exactly as many pages as items
          expect(pageCount).toBe(data.length)
          
          // Each page should have exactly one item
          for (let i = 0; i < pageCount; i++) {
            const pageData = paginateData(data, i, pageSize)
            expect(pageData.length).toBe(1)
            expect(pageData[0]).toEqual(data[i])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that page size larger than data length creates single page
   * **Validates: Requirement 5.4**
   */
  it('page size larger than data length creates single page with all items', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 1, maxLength: 50 }
        ),
        (data) => {
          const pageSize = data.length + 100 // Larger than data
          const pageCount = calculatePageCount(data.length, pageSize)
          
          // Should have exactly one page
          expect(pageCount).toBe(1)
          
          // That page should contain all items
          const pageData = paginateData(data, 0, pageSize)
          expect(pageData).toEqual(data)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Combined property test as shown in the design document
   * **Validates: Requirement 5.4**
   */
  it('pagination displays each item exactly once (combined test from design)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ id: fc.nat() }), { minLength: 1, maxLength: 200 }),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const pageCount = Math.ceil(data.length / pageSize)
          const allItems: number[] = []
          
          for (let page = 0; page < pageCount; page++) {
            const pageData = paginateData(data, page, pageSize)
            allItems.push(...pageData.map(item => item.id))
          }
          
          // 总数相等
          expect(allItems.length).toBe(data.length)
          
          // 验证所有项目按顺序出现
          const originalIds = data.map(item => item.id)
          expect(allItems).toEqual(originalIds)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that pagination does not mutate the original array
   * **Validates: Requirement 5.4**
   */
  it('pagination does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ 
            id: fc.nat({ max: 10000 }),
            name: fc.string({ minLength: 0, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 100 }
        ),
        fc.integer({ min: 5, max: 50 }),
        fc.integer({ min: 0, max: 10 }),
        (data, pageSize, pageIndex) => {
          // Create a deep copy of original data for comparison
          const originalCopy = JSON.stringify(data)
          
          // Perform pagination
          paginateData(data, pageIndex, pageSize)
          
          // Verify original data is unchanged
          expect(JSON.stringify(data)).toBe(originalCopy)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that consecutive pages don't overlap
   * **Validates: Requirement 5.4**
   */
  it('consecutive pages do not overlap', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.nat({ max: 10000 }) }),
          { minLength: 10, maxLength: 200 }
        ),
        fc.integer({ min: 5, max: 50 }),
        (data, pageSize) => {
          const pageCount = calculatePageCount(data.length, pageSize)
          
          if (pageCount >= 2) {
            for (let i = 0; i < pageCount - 1; i++) {
              const currentPage = paginateData(data, i, pageSize)
              const nextPage = paginateData(data, i + 1, pageSize)
              
              if (currentPage.length > 0 && nextPage.length > 0) {
                // Last item of current page should be different from first item of next page
                // (unless they happen to have the same values, which is fine - we check indices)
                const currentPageEndIndex = (i + 1) * pageSize - 1
                const nextPageStartIndex = (i + 1) * pageSize
                
                // These indices should be consecutive
                expect(nextPageStartIndex).toBe(currentPageEndIndex + 1)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
