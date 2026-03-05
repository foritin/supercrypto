/**
 * Property 8: Notification Type Mapping
 * 
 * For any notification call (success, error, warning, info), the sonner toast 
 * SHALL display with the correct visual style corresponding to the notification type.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 * 
 * Requirements:
 * - 6.1: WHEN displaying success messages, THE Notification_Service SHALL use sonner's toast.success() method
 * - 6.2: WHEN displaying error messages, THE Notification_Service SHALL use sonner's toast.error() method
 * - 6.3: WHEN displaying warning messages, THE Notification_Service SHALL use sonner's toast.warning() method
 * - 6.4: WHEN displaying info messages, THE Notification_Service SHALL use sonner's toast.info() method
 */

import fc from 'fast-check'
import { toast } from 'sonner'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { notification } from '@/lib/notification'

// Mock sonner toast methods
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(() => 'toast-id-success'),
    error: vi.fn(() => 'toast-id-error'),
    warning: vi.fn(() => 'toast-id-warning'),
    info: vi.fn(() => 'toast-id-info'),
    loading: vi.fn(() => 'toast-id-loading'),
    dismiss: vi.fn(),
  },
}))

// Feature: frontend-shadcn-migration, Property 8: Notification Type Mapping
describe('Property 8: Notification Type Mapping', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test that notification.success() calls toast.success() with correct arguments
   * **Validates: Requirement 6.1**
   */
  it('notification.success() calls toast.success() with correct message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          vi.clearAllMocks()
          
          notification.success(message)
          
          expect(toast.success).toHaveBeenCalledTimes(1)
          expect(toast.success).toHaveBeenCalledWith(message, expect.anything())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification.error() calls toast.error() with correct arguments
   * **Validates: Requirement 6.2**
   */
  it('notification.error() calls toast.error() with correct message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          vi.clearAllMocks()
          
          notification.error(message)
          
          expect(toast.error).toHaveBeenCalledTimes(1)
          expect(toast.error).toHaveBeenCalledWith(message, expect.anything())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification.warning() calls toast.warning() with correct arguments
   * **Validates: Requirement 6.3**
   */
  it('notification.warning() calls toast.warning() with correct message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          vi.clearAllMocks()
          
          notification.warning(message)
          
          expect(toast.warning).toHaveBeenCalledTimes(1)
          expect(toast.warning).toHaveBeenCalledWith(message, expect.anything())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification.info() calls toast.info() with correct arguments
   * **Validates: Requirement 6.4**
   */
  it('notification.info() calls toast.info() with correct message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          vi.clearAllMocks()
          
          notification.info(message)
          
          expect(toast.info).toHaveBeenCalledTimes(1)
          expect(toast.info).toHaveBeenCalledWith(message, expect.anything())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that all notification types map to their corresponding toast methods
   * This is the combined property test as shown in the design document
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('notification calls produce correct toast types for all notification methods', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('success', 'error', 'warning', 'info') as fc.Arbitrary<'success' | 'error' | 'warning' | 'info'>,
        fc.string({ minLength: 1, maxLength: 200 }),
        (type, message) => {
          vi.clearAllMocks()
          
          // Call the notification method
          notification[type](message)
          
          // Verify the correct toast method was called
          expect(toast[type]).toHaveBeenCalledTimes(1)
          expect(toast[type]).toHaveBeenCalledWith(message, expect.anything())
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification methods with description pass it correctly
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('notification calls with description pass description in options', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('success', 'error', 'warning', 'info') as fc.Arbitrary<'success' | 'error' | 'warning' | 'info'>,
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (type, message, description) => {
          vi.clearAllMocks()
          
          // Call the notification method with description
          notification[type](message, description)
          
          // Verify the correct toast method was called with description in options
          expect(toast[type]).toHaveBeenCalledTimes(1)
          expect(toast[type]).toHaveBeenCalledWith(message, { description })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification methods return a toast ID
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('notification methods return toast ID for programmatic control', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('success', 'error', 'warning', 'info') as fc.Arbitrary<'success' | 'error' | 'warning' | 'info'>,
        fc.string({ minLength: 1, maxLength: 100 }),
        (type, message) => {
          vi.clearAllMocks()
          
          // Call the notification method and capture return value
          const toastId = notification[type](message)
          
          // Verify a toast ID is returned
          expect(toastId).toBeDefined()
          expect(typeof toastId === 'string' || typeof toastId === 'number').toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that each notification type only calls its corresponding toast method
   * (i.e., success doesn't call error, warning, or info)
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('notification methods only call their corresponding toast method', () => {
    const notificationTypes = ['success', 'error', 'warning', 'info'] as const
    
    fc.assert(
      fc.property(
        fc.constantFrom(...notificationTypes),
        fc.string({ minLength: 1, maxLength: 100 }),
        (type, message) => {
          vi.clearAllMocks()
          
          // Call the notification method
          notification[type](message)
          
          // Verify only the correct toast method was called
          for (const otherType of notificationTypes) {
            if (otherType === type) {
              expect(toast[otherType]).toHaveBeenCalledTimes(1)
            } else {
              expect(toast[otherType]).not.toHaveBeenCalled()
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test that notification methods handle empty options correctly
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('notification methods handle undefined options correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('success', 'error', 'warning', 'info') as fc.Arbitrary<'success' | 'error' | 'warning' | 'info'>,
        fc.string({ minLength: 1, maxLength: 100 }),
        (type, message) => {
          vi.clearAllMocks()
          
          // Call without options
          notification[type](message)
          
          // Verify toast was called with empty options object
          expect(toast[type]).toHaveBeenCalledWith(message, {})
        }
      ),
      { numRuns: 100 }
    )
  })
})
