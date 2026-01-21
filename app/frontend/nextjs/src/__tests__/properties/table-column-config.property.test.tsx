/**
 * Property 7: Table Column Configuration Preservation
 * 
 * For any Ant Design Table column configuration, the migrated @tanstack/react-table 
 * column definition SHALL produce equivalent rendering output for the same data.
 * 
 * **Validates: Requirements 5.6**
 * 
 * Requirements:
 * - 5.6: THE Table_Renderer SHALL preserve existing column configurations 
 *        including custom render functions
 */

import { describe, it, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { render, cleanup } from '@testing-library/react'
import React from 'react'
import {
  convertColumn,
  convertColumns,
  getAccessorKey,
  getNestedValue,
  widthToSize,
  alignToCss,
  createSortingFn,
  AntdColumnConfig,
  AntdColumnAlign,
} from '@/lib/table-utils'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Clean up after each test to prevent DOM accumulation
afterEach(() => {
  cleanup()
})

// ============================================
// Test Data Types
// ============================================

interface TestDataRow {
  id: number
  name: string
  value: number
  status: string
  nested?: {
    field: string
  }
}

// ============================================
// Test Helper Components
// ============================================

/**
 * Helper component to render a cell using @tanstack/react-table
 */
function TestTableCell<TData>({ 
  column, 
  data 
}: { 
  column: ColumnDef<TData>
  data: TData[]
}) {
  const table = useReactTable({
    data,
    columns: [column],
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  if (rows.length === 0) return null

  const cell = rows[0].getVisibleCells()[0]
  return (
    <div data-testid="cell-content">
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </div>
  )
}

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate valid Ant Design column alignment
 */
const alignArbitrary = fc.constantFrom<AntdColumnAlign>('left', 'center', 'right')

/**
 * Generate valid column width (number or string)
 */
const widthArbitrary = fc.oneof(
  fc.integer({ min: 50, max: 500 }),
  fc.constantFrom('100px', '150px', '200px', '50%', '100%')
)

/**
 * Generate a simple Ant Design column config
 */
const simpleColumnConfigArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 20 }),
  dataIndex: fc.constantFrom('id', 'name', 'value', 'status'),
  key: fc.string({ minLength: 1, maxLength: 10 }),
})

/**
 * Generate test data rows
 */
const testDataRowArbitrary = fc.record({
  id: fc.nat({ max: 10000 }),
  name: fc.string({ minLength: 0, maxLength: 50 }),
  value: fc.nat({ max: 10000 }),
  status: fc.constantFrom('active', 'inactive', 'pending'),
})

// ============================================
// Property Tests
// ============================================

// Feature: frontend-shadcn-migration, Property 7: Table Column Configuration Preservation
describe('Property 7: Table Column Configuration Preservation', () => {
  /**
   * Test that column title/header is preserved
   * **Validates: Requirement 5.6**
   */
  it('column title/header is preserved during conversion', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('id', 'name', 'value', 'status'),
        (title, dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title,
            dataIndex,
            key: dataIndex,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Header should be preserved
          expect(tanstackColumn.header).toBe(title)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that column title as function is preserved
   * **Validates: Requirement 5.6**
   */
  it('column title as function is preserved during conversion', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('id', 'name', 'value', 'status'),
        (titleText, dataIndex) => {
          const titleFn = () => titleText
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: titleFn,
            dataIndex,
            key: dataIndex,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Header should be a function that returns the title
          expect(typeof tanstackColumn.header).toBe('function')
          if (typeof tanstackColumn.header === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = (tanstackColumn.header as () => string)()
            expect(result).toBe(titleText)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that column dataIndex/accessorKey is preserved
   * **Validates: Requirement 5.6**
   */
  it('column dataIndex/accessorKey is preserved during conversion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('id', 'name', 'value', 'status'),
        (dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Accessor key should match dataIndex
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((tanstackColumn as any).accessorKey).toBe(dataIndex)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that nested dataIndex is converted to accessorFn
   * **Validates: Requirement 5.6**
   */
  it('nested dataIndex is converted to accessorFn', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 3 }),
        (dataIndexPath) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Nested Column',
            dataIndex: dataIndexPath,
            key: 'nested',
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Should have accessorFn for nested paths
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect(typeof (tanstackColumn as any).accessorFn).toBe('function')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that column width/size is preserved
   * **Validates: Requirement 5.6**
   */
  it('column width/size is preserved during conversion', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 500 }),
        fc.constantFrom('id', 'name', 'value', 'status'),
        (width, dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            width,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Size should match width
          expect(tanstackColumn.size).toBe(width)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that string width is converted to numeric size
   * **Validates: Requirement 5.6**
   */
  it('string width is converted to numeric size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 500 }),
        fc.constantFrom('id', 'name', 'value', 'status'),
        (widthNum, dataIndex) => {
          const width = `${widthNum}px`
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            width,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Size should be the numeric part of the width
          expect(tanstackColumn.size).toBe(widthNum)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that custom render functions produce equivalent output
   * **Validates: Requirement 5.6**
   */
  it('custom render functions produce equivalent output for same data', () => {
    fc.assert(
      fc.property(
        testDataRowArbitrary,
        (row) => {
          // Clean up before each property test iteration
          cleanup()
          
          // Define a custom render function
          const renderFn = (value: string, record: TestDataRow) => 
            `${value} (${record.id})`

          const antdColumn: AntdColumnConfig<TestDataRow, string> = {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: renderFn,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Render the cell using the converted column
          const { getByTestId } = render(
            <TestTableCell column={tanstackColumn} data={[row]} />
          )

          // The rendered content should match what the original render function would produce
          const expectedOutput = renderFn(row.name, row)
          expect(getByTestId('cell-content').textContent).toBe(expectedOutput)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting configuration is preserved (sorter: true)
   * **Validates: Requirement 5.6**
   */
  it('sorting configuration is preserved when sorter is true', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('id', 'name', 'value', 'status'),
        (dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            sorter: true,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Sorting should be enabled
          expect(tanstackColumn.enableSorting).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that sorting configuration is preserved (sorter: false)
   * **Validates: Requirement 5.6**
   */
  it('sorting configuration is preserved when sorter is false', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('id', 'name', 'value', 'status'),
        (dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            sorter: false,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Sorting should be disabled
          expect(tanstackColumn.enableSorting).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that custom sorter function is preserved
   * **Validates: Requirement 5.6**
   */
  it('custom sorter function is preserved during conversion', () => {
    fc.assert(
      fc.property(
        fc.array(testDataRowArbitrary, { minLength: 2, maxLength: 10 }),
        (data) => {
          // Custom sorter that sorts by value descending
          const customSorter = (a: TestDataRow, b: TestDataRow) => b.value - a.value

          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            sorter: customSorter,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Sorting should be enabled
          expect(tanstackColumn.enableSorting).toBe(true)
          
          // sortingFn should be defined
          expect(tanstackColumn.sortingFn).toBeDefined()

          // Test that the sorting function works correctly
          if (typeof tanstackColumn.sortingFn === 'function' && data.length >= 2) {
            const rowA = { original: data[0] }
            const rowB = { original: data[1] }
            const result = tanstackColumn.sortingFn(rowA as never, rowB as never, 'value')
            const expected = customSorter(data[0], data[1])
            expect(result).toBe(expected)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that column alignment is preserved
   * **Validates: Requirement 5.6**
   */
  it('column alignment is preserved in meta', () => {
    fc.assert(
      fc.property(
        alignArbitrary,
        fc.constantFrom('id', 'name', 'value', 'status'),
        (align, dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            align,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Alignment should be preserved in meta
          expect(tanstackColumn.meta).toBeDefined()
          expect((tanstackColumn.meta as { align?: AntdColumnAlign }).align).toBe(align)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that column className is preserved in meta
   * **Validates: Requirement 5.6**
   */
  it('column className is preserved in meta', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.constantFrom('id', 'name', 'value', 'status'),
        (className, dataIndex) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            title: 'Test Column',
            dataIndex,
            key: dataIndex,
            className,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // className should be preserved in meta
          expect(tanstackColumn.meta).toBeDefined()
          expect((tanstackColumn.meta as { className?: string }).className).toBe(className)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that original config is preserved in meta
   * **Validates: Requirement 5.6**
   */
  it('original Ant Design config is preserved in meta', () => {
    fc.assert(
      fc.property(
        simpleColumnConfigArbitrary,
        (config) => {
          const antdColumn: AntdColumnConfig<TestDataRow> = {
            ...config,
          }

          const tanstackColumn = convertColumn(antdColumn)

          // Original config should be preserved in meta
          expect(tanstackColumn.meta).toBeDefined()
          expect((tanstackColumn.meta as { originalConfig?: AntdColumnConfig<TestDataRow> }).originalConfig).toEqual(antdColumn)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that multiple columns are converted correctly
   * **Validates: Requirement 5.6**
   */
  it('multiple columns are converted with all configurations preserved', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 20 }),
            dataIndex: fc.constantFrom('id', 'name', 'value', 'status'),
            width: fc.integer({ min: 50, max: 300 }),
            sorter: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (columnConfigs) => {
          const antdColumns: AntdColumnConfig<TestDataRow>[] = columnConfigs.map((config, index) => ({
            ...config,
            key: `col-${index}`,
          }))

          const tanstackColumns = convertColumns(antdColumns)

          // Same number of columns
          expect(tanstackColumns.length).toBe(antdColumns.length)

          // Each column should have preserved properties
          tanstackColumns.forEach((col, index) => {
            const original = antdColumns[index]
            expect(col.header).toBe(original.title)
            expect(col.size).toBe(original.width)
            expect(col.enableSorting).toBe(original.sorter === true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that hidden columns are filtered out
   * **Validates: Requirement 5.6**
   */
  it('hidden columns are filtered out during conversion', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 20 }),
            dataIndex: fc.constantFrom('id', 'name', 'value', 'status'),
            hidden: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (columnConfigs) => {
          const antdColumns: AntdColumnConfig<TestDataRow>[] = columnConfigs.map((config, index) => ({
            ...config,
            key: `col-${index}`,
          }))

          const tanstackColumns = convertColumns(antdColumns)

          // Only non-hidden columns should be converted
          const visibleCount = antdColumns.filter(col => !col.hidden).length
          expect(tanstackColumns.length).toBe(visibleCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================
// Utility Function Tests
// ============================================

describe('Table Utils - getAccessorKey', () => {
  /**
   * Test that string dataIndex is returned as-is
   */
  it('returns string dataIndex as-is', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (dataIndex) => {
          const result = getAccessorKey(dataIndex)
          expect(result).toBe(dataIndex)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that array dataIndex is joined with dots
   */
  it('joins array dataIndex with dots', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 4 }),
        (dataIndexArray) => {
          const result = getAccessorKey(dataIndexArray)
          expect(result).toBe(dataIndexArray.join('.'))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that undefined dataIndex returns undefined
   */
  it('returns undefined for undefined dataIndex', () => {
    const result = getAccessorKey(undefined)
    expect(result).toBeUndefined()
  })
})

describe('Table Utils - getNestedValue', () => {
  /**
   * Test that nested values are retrieved correctly
   */
  it('retrieves nested values correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        (fieldValue) => {
          const obj = { nested: { field: fieldValue } }
          const result = getNestedValue(obj, 'nested.field')
          expect(result).toBe(fieldValue)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that top-level values are retrieved correctly
   */
  it('retrieves top-level values correctly', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        (id) => {
          const obj = { id, name: 'test' }
          const result = getNestedValue(obj, 'id')
          expect(result).toBe(id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that missing paths return undefined
   */
  it('returns undefined for missing paths', () => {
    fc.assert(
      fc.property(
        fc.record({ id: fc.nat(), name: fc.string() }),
        (obj) => {
          const result = getNestedValue(obj, 'nonexistent.path')
          expect(result).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Table Utils - widthToSize', () => {
  /**
   * Test that numeric width is returned as-is
   */
  it('returns numeric width as-is', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (width) => {
          const result = widthToSize(width)
          expect(result).toBe(width)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that string width with px is parsed correctly
   */
  it('parses string width with px correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (width) => {
          const result = widthToSize(`${width}px`)
          expect(result).toBe(width)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that undefined width returns undefined
   */
  it('returns undefined for undefined width', () => {
    const result = widthToSize(undefined)
    expect(result).toBeUndefined()
  })
})

describe('Table Utils - alignToCss', () => {
  /**
   * Test that alignment is converted to correct CSS class
   */
  it('converts alignment to correct CSS class', () => {
    fc.assert(
      fc.property(
        alignArbitrary,
        (align) => {
          const result = alignToCss(align)
          
          switch (align) {
            case 'left':
              expect(result).toBe('text-left')
              break
            case 'center':
              expect(result).toBe('text-center')
              break
            case 'right':
              expect(result).toBe('text-right')
              break
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that undefined alignment defaults to text-left
   */
  it('defaults to text-left for undefined alignment', () => {
    const result = alignToCss(undefined)
    expect(result).toBe('text-left')
  })
})

describe('Table Utils - createSortingFn', () => {
  /**
   * Test that sorter: false returns undefined
   */
  it('returns undefined for sorter: false', () => {
    const result = createSortingFn<TestDataRow>(false, 'id')
    expect(result).toBeUndefined()
  })

  /**
   * Test that sorter: true creates a default sorting function
   */
  it('creates default sorting function for sorter: true', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('id', 'name', 'value', 'status'),
        (dataIndex) => {
          const result = createSortingFn<TestDataRow>(true, dataIndex)
          expect(typeof result).toBe('function')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that custom sorter function is wrapped correctly
   */
  it('wraps custom sorter function correctly', () => {
    fc.assert(
      fc.property(
        testDataRowArbitrary,
        testDataRowArbitrary,
        (rowA, rowB) => {
          const customSorter = (a: TestDataRow, b: TestDataRow) => a.value - b.value
          const sortingFn = createSortingFn<TestDataRow>(customSorter, 'value')
          
          expect(sortingFn).toBeDefined()
          if (sortingFn) {
            const result = sortingFn({ original: rowA }, { original: rowB })
            const expected = customSorter(rowA, rowB)
            expect(result).toBe(expected)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
