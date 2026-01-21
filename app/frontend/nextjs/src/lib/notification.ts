/**
 * Notification Service - sonner toast wrapper
 * 
 * This module provides a drop-in replacement API for Ant Design message,
 * wrapping sonner's toast functionality with a compatible interface.
 * 
 * @example
 * // Basic usage
 * notification.success('Operation successful')
 * notification.error('Something went wrong')
 * notification.warning('Please check your input')
 * notification.info('New update available')
 * 
 * // With description
 * notification.success('Success', 'Your changes have been saved')
 * 
 * // Loading state (returns toast id for dismissal)
 * const toastId = notification.loading('Processing...')
 * // Later: notification.dismiss(toastId)
 * 
 * // Dismiss all toasts
 * notification.destroy()
 * 
 * @validates Requirements 6.1, 6.2, 6.3, 6.4, 6.7
 */

import { toast, ExternalToast } from 'sonner'

/**
 * Options for notification methods
 * Compatible with both simple string messages and extended options
 */
export interface NotificationOptions extends ExternalToast {
  /** Optional description text shown below the main message */
  description?: string
}

/**
 * Notification service providing Ant Design message-compatible API
 * using sonner toast under the hood.
 */
export const notification = {
  /**
   * Display a success notification
   * @param message - The main message to display
   * @param descriptionOrOptions - Optional description string or toast options
   * @returns Toast ID for programmatic control
   * 
   * @validates Requirement 6.1: WHEN displaying success messages, 
   * THE Notification_Service SHALL use sonner's toast.success() method
   */
  success: (
    message: string,
    descriptionOrOptions?: string | NotificationOptions
  ): string | number => {
    const options = normalizeOptions(descriptionOrOptions)
    return toast.success(message, options)
  },

  /**
   * Display an error notification
   * @param message - The main message to display
   * @param descriptionOrOptions - Optional description string or toast options
   * @returns Toast ID for programmatic control
   * 
   * @validates Requirement 6.2: WHEN displaying error messages,
   * THE Notification_Service SHALL use sonner's toast.error() method
   */
  error: (
    message: string,
    descriptionOrOptions?: string | NotificationOptions
  ): string | number => {
    const options = normalizeOptions(descriptionOrOptions)
    return toast.error(message, options)
  },

  /**
   * Display a warning notification
   * @param message - The main message to display
   * @param descriptionOrOptions - Optional description string or toast options
   * @returns Toast ID for programmatic control
   * 
   * @validates Requirement 6.3: WHEN displaying warning messages,
   * THE Notification_Service SHALL use sonner's toast.warning() method
   */
  warning: (
    message: string,
    descriptionOrOptions?: string | NotificationOptions
  ): string | number => {
    const options = normalizeOptions(descriptionOrOptions)
    return toast.warning(message, options)
  },

  /**
   * Display an info notification
   * @param message - The main message to display
   * @param descriptionOrOptions - Optional description string or toast options
   * @returns Toast ID for programmatic control
   * 
   * @validates Requirement 6.4: WHEN displaying info messages,
   * THE Notification_Service SHALL use sonner's toast.info() method
   */
  info: (
    message: string,
    descriptionOrOptions?: string | NotificationOptions
  ): string | number => {
    const options = normalizeOptions(descriptionOrOptions)
    return toast.info(message, options)
  },

  /**
   * Display a loading notification
   * Compatible with Ant Design message.loading(content, duration)
   * 
   * @param message - The loading message to display
   * @param durationOrOptions - Duration in seconds (0 for infinite) or toast options
   * @returns Toast ID for programmatic dismissal
   * 
   * @validates Requirement 6.7: Drop-in replacement API
   */
  loading: (
    message: string,
    durationOrOptions?: number | NotificationOptions
  ): string | number => {
    let options: NotificationOptions = {}
    
    if (typeof durationOrOptions === 'number') {
      // Ant Design uses seconds, 0 means infinite
      // sonner uses milliseconds, Infinity for infinite
      options.duration = durationOrOptions === 0 ? Infinity : durationOrOptions * 1000
    } else if (durationOrOptions) {
      options = durationOrOptions
    }
    
    return toast.loading(message, options)
  },

  /**
   * Dismiss a specific toast by ID
   * @param toastId - The ID of the toast to dismiss
   * 
   * @validates Requirement 6.7: Drop-in replacement API
   */
  dismiss: (toastId?: string | number): void => {
    toast.dismiss(toastId)
  },

  /**
   * Dismiss all toasts
   * Compatible with Ant Design message.destroy()
   * 
   * @validates Requirement 6.7: Drop-in replacement API
   */
  destroy: (): void => {
    toast.dismiss()
  },

  /**
   * Display a promise-based notification
   * Shows loading, then success/error based on promise resolution
   * 
   * @param promise - The promise to track
   * @param messages - Messages for loading, success, and error states
   * @returns Toast ID with unwrap method
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  },
}

/**
 * Normalize description string or options object to NotificationOptions
 */
function normalizeOptions(
  descriptionOrOptions?: string | NotificationOptions
): NotificationOptions {
  if (typeof descriptionOrOptions === 'string') {
    return { description: descriptionOrOptions }
  }
  return descriptionOrOptions || {}
}

/**
 * Re-export toast for advanced usage
 * Allows direct access to sonner's toast API when needed
 */
export { toast }

/**
 * Type alias for backward compatibility
 * Allows using `message` as an alias for `notification`
 * 
 * @example
 * import { message } from '@/lib/notification'
 * message.success('Done!')
 * 
 * @validates Requirement 6.7: WHEN replacing Ant Design message calls,
 * THE Notification_Service SHALL provide a drop-in replacement API
 */
export const message = notification
