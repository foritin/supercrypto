/**
 * UI Components - 统一导出
 */

// ============================================
// shadcn/ui Base Components
// ============================================

// Button
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

// Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

// Dialog (Modal replacement)
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

// Sheet (Drawer replacement)
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

// Badge (Tag replacement)
export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

// Skeleton
export { Skeleton } from './skeleton';

// Input
export { Input } from './input';

// Textarea
export { Textarea } from './textarea';

// Checkbox
export { Checkbox } from './checkbox';

// AlertDialog (Popconfirm replacement)
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';

// Label
export { Label } from './label';

// Form (react-hook-form integration)
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './form';

// Calendar
export { Calendar, CalendarDayButton } from './calendar';

// Popover
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';

// DatePicker (react-day-picker integration)
export { DatePicker } from './date-picker';
export type { DatePickerProps } from './date-picker';

// DateRangePicker (react-day-picker integration)
export { DateRangePicker } from './date-range-picker';
export type { DateRangePickerProps, DateRange } from './date-range-picker';

// ============================================
// Custom Components
// ============================================

// Glass Card
export { GlassCard } from './GlassCard';
export type { default as GlassCardProps } from './GlassCard';

// Section Card
export { SectionCard } from './SectionCard';
export type { SectionCardProps } from './SectionCard';

// Info Row
export { InfoRow } from './InfoRow';
export type { InfoRowProps } from './InfoRow';

// Close Button
export { CloseButton } from './CloseButton';
export type { CloseButtonProps } from './CloseButton';

// Ripple Button
export { RippleButton } from './RippleButton';

// Enhanced Toast
export { EnhancedToast } from './EnhancedToast';

// ============================================
// Table Components (@tanstack/react-table)
// ============================================

// DataTable - Full-featured table component
export {
  DataTable,
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
  createSelectionColumn,
} from './data-table';

export type {
  DataTableProps,
  DataTablePaginationProps,
  DataTableSortingProps,
} from './data-table';
