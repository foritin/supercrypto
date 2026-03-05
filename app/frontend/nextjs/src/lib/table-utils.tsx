/**
 * Table Utilities for Ant Design to @tanstack/react-table Migration
 * 
 * This module provides utility functions to help convert Ant Design Table
 * column configurations to @tanstack/react-table ColumnDef format.
 * 
 * **Validates: Requirements 5.6** - Preserve existing column configurations
 * including custom render functions
 */

import type { 
  ColumnDef, 
  CellContext, 
  HeaderContext,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'

// Type helper for column definitions with accessor
type ColumnDefWithAccessor<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  accessorKey?: keyof TData & string
  accessorFn?: (row: TData) => TValue
}

// ============================================
// Ant Design Column Types (for reference)
// ============================================

/**
 * Ant Design column alignment options
 */
export type AntdColumnAlign = 'left' | 'center' | 'right'

/**
 * Ant Design column fixed position options
 */
export type AntdColumnFixed = boolean | 'left' | 'right'

/**
 * Ant Design sorter configuration
 */
export type AntdSorter<TData> = 
  | boolean 
  | ((a: TData, b: TData) => number)
  | { compare?: (a: TData, b: TData) => number; multiple?: number }

/**
 * Ant Design column render function signature
 */
export type AntdRenderFn<TData, TValue = unknown> = (
  value: TValue,
  record: TData,
  index: number
) => ReactNode

/**
 * Ant Design column configuration interface
 * Represents the common properties used in Ant Design Table columns
 */
export interface AntdColumnConfig<TData, TValue = unknown> {
  /** Column title displayed in header */
  title?: ReactNode | (() => ReactNode)
  /** Data field key for accessing row data */
  dataIndex?: string | string[]
  /** Unique key for the column */
  key?: string
  /** Custom render function for cell content */
  render?: AntdRenderFn<TData, TValue>
  /** Column width in pixels or percentage */
  width?: number | string
  /** Text alignment */
  align?: AntdColumnAlign
  /** Fixed column position */
  fixed?: AntdColumnFixed
  /** Enable sorting */
  sorter?: AntdSorter<TData>
  /** Default sort order */
  defaultSortOrder?: 'ascend' | 'descend'
  /** Custom className for the column */
  className?: string
  /** Whether the column is hidden */
  hidden?: boolean
  /** Ellipsis overflow handling */
  ellipsis?: boolean | { showTitle?: boolean }
  /** Column filters */
  filters?: Array<{ text: ReactNode; value: string | number | boolean }>
  /** Filter function */
  onFilter?: (value: string | number | boolean, record: TData) => boolean
  /** Nested children columns */
  children?: AntdColumnConfig<TData>[]
}

// ============================================
// Conversion Options
// ============================================

/**
 * Options for column conversion
 */
export interface ConversionOptions {
  /** Whether to enable sorting by default for columns with sorter */
  enableSortingByDefault?: boolean
  /** Whether to preserve width as size */
  preserveWidth?: boolean
  /** Custom cell wrapper for styling */
  cellWrapper?: (content: ReactNode, align?: AntdColumnAlign) => ReactNode
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get the accessor key from Ant Design dataIndex
 * Handles both string and array formats
 */
export function getAccessorKey(dataIndex?: string | string[]): string | undefined {
  if (!dataIndex) return undefined
  if (Array.isArray(dataIndex)) {
    return dataIndex.join('.')
  }
  return dataIndex
}

/**
 * Get nested value from an object using dot notation or array path
 */
export function getNestedValue<T>(obj: T, path: string | string[]): unknown {
  const keys = Array.isArray(path) ? path : path.split('.')
  let result: unknown = obj
  
  for (const key of keys) {
    if (result === null || result === undefined) return undefined
    result = (result as Record<string, unknown>)[key]
  }
  
  return result
}

/**
 * Convert Ant Design alignment to CSS text-align class
 */
export function alignToCss(align?: AntdColumnAlign): string {
  switch (align) {
    case 'center':
      return 'text-center'
    case 'right':
      return 'text-right'
    default:
      return 'text-left'
  }
}

/**
 * Convert Ant Design width to @tanstack/react-table size
 */
export function widthToSize(width?: number | string): number | undefined {
  if (typeof width === 'number') return width
  if (typeof width === 'string') {
    const parsed = parseInt(width, 10)
    if (!isNaN(parsed)) return parsed
  }
  return undefined
}

/**
 * Create a sorting function from Ant Design sorter config
 */
export function createSortingFn<TData>(
  sorter: AntdSorter<TData>,
  dataIndex?: string | string[]
): ((rowA: { original: TData }, rowB: { original: TData }) => number) | undefined {
  if (sorter === false) return undefined
  
  if (typeof sorter === 'function') {
    return (rowA, rowB) => sorter(rowA.original, rowB.original)
  }
  
  if (typeof sorter === 'object' && sorter.compare) {
    return (rowA, rowB) => sorter.compare!(rowA.original, rowB.original)
  }
  
  // Default sorting based on dataIndex
  if (sorter === true && dataIndex) {
    return (rowA, rowB) => {
      const a = getNestedValue(rowA.original, dataIndex)
      const b = getNestedValue(rowB.original, dataIndex)
      
      if (a === b) return 0
      if (a === null || a === undefined) return 1
      if (b === null || b === undefined) return -1
      
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b)
      }
      
      return a < b ? -1 : 1
    }
  }
  
  return undefined
}

// ============================================
// Main Conversion Function
// ============================================

/**
 * Convert a single Ant Design column config to @tanstack/react-table ColumnDef
 * 
 * @param antdColumn - Ant Design column configuration
 * @param options - Conversion options
 * @returns @tanstack/react-table ColumnDef
 * 
 * @example
 * ```typescript
 * const antdColumn = {
 *   title: 'Name',
 *   dataIndex: 'name',
 *   key: 'name',
 *   render: (name, record) => <span>{name} ({record.symbol})</span>,
 *   sorter: true,
 *   width: 200,
 * }
 * 
 * const tanstackColumn = convertColumn(antdColumn)
 * ```
 */
export function convertColumn<TData, TValue = unknown>(
  antdColumn: AntdColumnConfig<TData, TValue>,
  options: ConversionOptions = {}
): ColumnDef<TData, TValue> {
  const {
    title,
    dataIndex,
    key,
    render,
    width,
    align,
    sorter,
    className,
    hidden,
  } = antdColumn

  const {
    enableSortingByDefault = true,
    preserveWidth = true,
    cellWrapper,
  } = options

  const accessorKey = getAccessorKey(dataIndex)
  const columnId = key || accessorKey || `column-${Math.random().toString(36).substr(2, 9)}`

  // Build the column definition
  const columnDef: ColumnDef<TData, TValue> = {
    id: columnId,
  }

  // Set accessor - use type assertion for accessor properties
  if (accessorKey) {
    if (accessorKey.includes('.')) {
      // Use accessor function for nested paths
      (columnDef as ColumnDefWithAccessor<TData, TValue>).accessorFn = (row: TData) => 
        getNestedValue(row, accessorKey) as TValue
    } else {
      (columnDef as ColumnDefWithAccessor<TData, TValue>).accessorKey = accessorKey as keyof TData & string
    }
  }

  // Set header
  if (title !== undefined) {
    if (typeof title === 'function') {
      columnDef.header = () => title()
    } else {
      columnDef.header = title as string
    }
  }

  // Set cell renderer
  if (render) {
    columnDef.cell = ({ getValue, row }: CellContext<TData, TValue>) => {
      const value = getValue()
      const rowIndex = row.index
      const content = render(value, row.original, rowIndex)
      
      // Apply alignment wrapper if needed
      if (cellWrapper && align) {
        return cellWrapper(content, align)
      }
      
      // Apply alignment class
      if (align && align !== 'left') {
        return (
          <div className={alignToCss(align)}>
            {content}
          </div>
        )
      }
      
      return content
    }
  } else if (align && align !== 'left') {
    // Apply alignment even without custom render
    columnDef.cell = ({ getValue }: CellContext<TData, TValue>) => {
      const value = getValue()
      return (
        <div className={alignToCss(align)}>
          {value as ReactNode}
        </div>
      )
    }
  }

  // Set size/width
  if (preserveWidth && width !== undefined) {
    const size = widthToSize(width)
    if (size) {
      columnDef.size = size
    }
  }

  // Set sorting
  if (sorter !== undefined) {
    columnDef.enableSorting = sorter !== false && enableSortingByDefault
    
    const sortingFn = createSortingFn(sorter, dataIndex)
    if (sortingFn) {
      columnDef.sortingFn = sortingFn
    }
  } else {
    columnDef.enableSorting = false
  }

  // Set visibility
  if (hidden) {
    columnDef.enableHiding = true
  }

  // Set meta for additional properties
  columnDef.meta = {
    className,
    align,
    originalConfig: antdColumn,
  }

  return columnDef
}

/**
 * Convert an array of Ant Design column configs to @tanstack/react-table ColumnDefs
 * 
 * @param antdColumns - Array of Ant Design column configurations
 * @param options - Conversion options
 * @returns Array of @tanstack/react-table ColumnDefs
 * 
 * @example
 * ```typescript
 * const antdColumns: ColumnsType<AssetListItem> = [
 *   { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
 *   { title: 'Name', dataIndex: 'name', key: 'name', render: (name) => <strong>{name}</strong> },
 *   { title: 'Status', dataIndex: 'status', key: 'status', sorter: true },
 * ]
 * 
 * const tanstackColumns = convertColumns(antdColumns)
 * ```
 */
export function convertColumns<TData, TValue = unknown>(
  antdColumns: AntdColumnConfig<TData, TValue>[],
  options: ConversionOptions = {}
): ColumnDef<TData, TValue>[] {
  return antdColumns
    .filter(col => !col.hidden)
    .map(col => convertColumn(col, options))
}

// ============================================
// Helper Functions for Common Patterns
// ============================================

/**
 * Create a simple text column
 */
export function createTextColumn<TData>(
  accessorKey: keyof TData & string,
  header: string,
  options?: {
    width?: number
    align?: AntdColumnAlign
    enableSorting?: boolean
  }
): ColumnDef<TData> {
  const columnDef: ColumnDef<TData> = {
    id: accessorKey,
    header,
    enableSorting: options?.enableSorting ?? false,
    ...(options?.width !== undefined ? { size: options.width } : {}),
  }
  
  // Set accessor key
  ;(columnDef as ColumnDefWithAccessor<TData>).accessorKey = accessorKey
  
  // Set cell with alignment if needed
  if (options?.align && options.align !== 'left') {
    columnDef.cell = ({ getValue }) => (
      <div className={alignToCss(options.align)}>
        {getValue() as ReactNode}
      </div>
    )
  }
  
  return columnDef
}

/**
 * Create a column with custom cell renderer
 */
export function createCustomColumn<TData, TValue = unknown>(
  id: string,
  header: string,
  cell: (info: CellContext<TData, TValue>) => ReactNode,
  options?: {
    accessorKey?: keyof TData & string
    accessorFn?: (row: TData) => TValue
    width?: number
    enableSorting?: boolean
  }
): ColumnDef<TData, TValue> {
  const columnDef: ColumnDef<TData, TValue> = {
    id,
    header,
    cell,
    enableSorting: options?.enableSorting ?? false,
    ...(options?.width !== undefined ? { size: options.width } : {}),
  }

  if (options?.accessorKey) {
    (columnDef as ColumnDefWithAccessor<TData, TValue>).accessorKey = options.accessorKey as keyof TData & string
  } else if (options?.accessorFn) {
    (columnDef as ColumnDefWithAccessor<TData, TValue>).accessorFn = options.accessorFn
  }

  return columnDef
}

/**
 * Create an actions column (typically the last column with buttons)
 */
export function createActionsColumn<TData>(
  renderActions: (row: TData) => ReactNode,
  options?: {
    header?: string
    width?: number
  }
): ColumnDef<TData> {
  return {
    id: 'actions',
    header: options?.header ?? '操作',
    cell: ({ row }) => renderActions(row.original),
    enableSorting: false,
    enableHiding: false,
    ...(options?.width !== undefined ? { size: options.width } : {}),
  }
}

/**
 * Create a column that displays a formatted date
 */
export function createDateColumn<TData>(
  accessorKey: keyof TData & string,
  header: string,
  options?: {
    width?: number
    format?: (date: Date) => string
    emptyText?: string
  }
): ColumnDef<TData> {
  const formatDate = options?.format ?? ((date: Date) => date.toLocaleString())
  const emptyText = options?.emptyText ?? '-'

  const columnDef: ColumnDef<TData> = {
    id: accessorKey,
    header,
    enableSorting: true,
    ...(options?.width !== undefined ? { size: options.width } : {}),
    cell: ({ getValue }) => {
      const value = getValue()
      if (!value) return emptyText
      
      const date = value instanceof Date ? value : new Date(value as string)
      return isNaN(date.getTime()) ? emptyText : formatDate(date)
    },
  }
  
  ;(columnDef as ColumnDefWithAccessor<TData>).accessorKey = accessorKey
  
  return columnDef
}

/**
 * Create a column that displays a number with formatting
 */
export function createNumberColumn<TData>(
  accessorKey: keyof TData & string,
  header: string,
  options?: {
    width?: number
    align?: AntdColumnAlign
    format?: (value: number) => string
    prefix?: string
    suffix?: string
  }
): ColumnDef<TData> {
  const formatNumber = options?.format ?? ((n: number) => n.toString())
  const prefix = options?.prefix ?? ''
  const suffix = options?.suffix ?? ''
  const align = options?.align ?? 'right'

  const columnDef: ColumnDef<TData> = {
    id: accessorKey,
    header,
    enableSorting: true,
    ...(options?.width !== undefined ? { size: options.width } : {}),
    cell: ({ getValue }) => {
      const value = getValue() as number
      const formatted = `${prefix}${formatNumber(value)}${suffix}`
      
      return (
        <div className={alignToCss(align)}>
          {formatted}
        </div>
      )
    },
  }
  
  ;(columnDef as ColumnDefWithAccessor<TData>).accessorKey = accessorKey
  
  return columnDef
}

// ============================================
// Type Exports
// ============================================

export type {
  ColumnDef,
  CellContext,
  HeaderContext,
}
