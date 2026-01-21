"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Skeleton } from "./skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

// ============================================
// Table Base Components
// ============================================

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-white/10 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// ============================================
// DataTable Props Interface
// ============================================

export interface DataTablePaginationProps {
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export interface DataTableSortingProps {
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (column: string, order: 'asc' | 'desc') => void
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pagination?: DataTablePaginationProps
  sorting?: DataTableSortingProps
  loading?: boolean
  emptyMessage?: string
  enableRowSelection?: boolean
  onRowSelectionChange?: (selectedRows: TData[]) => void
}

// ============================================
// Loading Skeleton Component
// ============================================

interface DataTableSkeletonProps {
  columns: number
  rows?: number
}

function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-6 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ============================================
// Empty State Component
// ============================================

interface DataTableEmptyProps {
  columns: number
  message?: string
}

function DataTableEmpty({ columns, message = "暂无数据" }: DataTableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <span>{message}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ============================================
// Pagination Component
// ============================================

interface DataTablePaginationControlsProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>
  pagination?: DataTablePaginationProps
}

function DataTablePaginationControls<TData>({ 
  table, 
  pagination 
}: DataTablePaginationControlsProps<TData>) {
  const pageIndex = pagination?.pageIndex ?? table.getState().pagination.pageIndex
  const pageSize = pagination?.pageSize ?? table.getState().pagination.pageSize
  const pageCount = pagination?.pageCount ?? table.getPageCount()

  const handlePageChange = (page: number) => {
    if (pagination?.onPageChange) {
      pagination.onPageChange(page)
    } else {
      table.setPageIndex(page)
    }
  }

  const handlePageSizeChange = (size: number) => {
    if (pagination?.onPageSizeChange) {
      pagination.onPageSizeChange(size)
    } else {
      table.setPageSize(size)
    }
  }

  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < pageCount - 1

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">每页显示</p>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => handlePageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={String(pageSize)} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">条</p>
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm text-muted-foreground">
          第 {pageIndex + 1} / {pageCount} 页
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">跳转到第一页</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">跳转到最后一页</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Sortable Header Component
// ============================================

interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
    getCanSort: () => boolean
  }
  title: string
  externalSorting?: DataTableSortingProps
  columnId?: string
}

function SortableHeader({ 
  column, 
  title, 
  externalSorting,
  columnId 
}: SortableHeaderProps) {
  if (!column.getCanSort()) {
    return <span>{title}</span>
  }

  const handleSort = () => {
    if (externalSorting && columnId) {
      const currentOrder = externalSorting.sortBy === columnId ? externalSorting.sortOrder : null
      const newOrder = currentOrder === 'asc' ? 'desc' : 'asc'
      externalSorting.onSortChange(columnId, newOrder)
    } else {
      const isSorted = column.getIsSorted()
      column.toggleSorting(isSorted === 'asc')
    }
  }

  const getSortIcon = () => {
    const sorted = externalSorting && columnId 
      ? (externalSorting.sortBy === columnId ? externalSorting.sortOrder : false)
      : column.getIsSorted()

    if (sorted === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    if (sorted === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSort}
      className="-ml-4 h-8 data-[state=open]:bg-accent"
    >
      {title}
      {getSortIcon()}
    </Button>
  )
}

// ============================================
// Selection Column Helper
// ============================================

export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全选"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="选择行"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
}

// ============================================
// Main DataTable Component
// ============================================

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  sorting: externalSorting,
  loading = false,
  emptyMessage = "暂无数据",
  enableRowSelection = false,
  onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Prepare columns with selection if enabled
  const tableColumns = React.useMemo(() => {
    if (enableRowSelection) {
      const hasSelectionColumn = columns.some(col => col.id === 'select')
      if (!hasSelectionColumn) {
        return [createSelectionColumn<TData>(), ...columns]
      }
    }
    return columns
  }, [columns, enableRowSelection])

  // Convert external sorting to internal format
  const sortingState = React.useMemo<SortingState>(() => {
    if (externalSorting?.sortBy) {
      return [{ id: externalSorting.sortBy, desc: externalSorting.sortOrder === 'desc' }]
    }
    return internalSorting
  }, [externalSorting, internalSorting])

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: externalSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: externalSorting ? undefined : setInternalSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting: sortingState,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(pagination && {
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    },
    ...(pagination && {
      pageCount: pagination.pageCount,
      manualPagination: true,
    }),
    ...(externalSorting && {
      manualSorting: true,
    }),
    enableRowSelection,
  })

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, table])

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-white/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <DataTableSkeleton columns={tableColumns.length} />
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <DataTableEmpty columns={tableColumns.length} message={emptyMessage} />
            )}
          </TableBody>
        </Table>
      </div>
      {(pagination || !loading) && data.length > 0 && (
        <DataTablePaginationControls table={table} pagination={pagination} />
      )}
    </div>
  )
}

// ============================================
// Exports
// ============================================

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SortableHeader,
  DataTableSkeleton,
  DataTableEmpty,
  DataTablePaginationControls,
}
