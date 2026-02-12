/**
 * Property 4: Form Validation Error Display
 * 
 * For any form with invalid input data according to its zod schema, the Form_Handler 
 * SHALL display appropriate error messages via FormMessage components and prevent form submission.
 * 
 * **Validates: Requirements 4.7, 4.8**
 * 
 * Requirements:
 * - 4.7: WHEN form validation fails, THE Form_Handler SHALL display error messages using shadcn/ui FormMessage component
 * - 4.8: IF a form submission fails due to validation, THEN THE Form_Handler SHALL highlight invalid fields and prevent submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createAssetSchema } from '@/lib/validations/asset'
import { kycApplySchema } from '@/lib/validations/kyc'
import { priceUpdateSchema } from '@/lib/validations/price'

// Test form component that uses react-hook-form with zod validation
interface TestFormProps {
  schema: z.ZodObject<z.ZodRawShape>
  defaultValues: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => void
  fields: Array<{
    name: string
    label: string
    type?: string
  }>
}

function TestForm({ 
  schema, 
  defaultValues, 
  onSubmit, 
  fields 
}: TestFormProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} data-testid="test-form">
        {fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input 
                    {...formField} 
                    type={field.type || 'text'}
                    value={typeof formField.value === 'string' || typeof formField.value === 'number' ? formField.value : ''}
                    onChange={(e) => {
                      const value = field.type === 'number' 
                        ? (e.target.value === '' ? undefined : Number(e.target.value))
                        : e.target.value
                      formField.onChange(value)
                    }}
                    data-testid={`input-${field.name}`}
                  />
                </FormControl>
                <FormMessage data-testid={`error-${field.name}`} />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" data-testid="submit-button">Submit</Button>
      </form>
    </Form>
  )
}

// Feature: frontend-shadcn-migration, Property 4: Form Validation Error Display
describe('Property 4: Form Validation Error Display', () => {
  /**
   * Test that invalid asset form data produces validation errors
   * **Validates: Requirements 4.7, 4.8**
   */
  describe('Asset Form Validation', () => {
    const assetFields = [
      { name: 'name', label: 'Asset Name' },
      { name: 'symbol', label: 'Symbol' },
      { name: 'total_supply', label: 'Total Supply', type: 'number' },
      { name: 'apy_3m', label: 'APY 3M', type: 'number' },
    ]

    it('displays error messages for invalid asset form data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate invalid names (empty or too long)
            name: fc.oneof(
              fc.constant(''), // Empty - should fail
              fc.string({ minLength: 101, maxLength: 150 }) // Too long - should fail
            ),
            // Generate invalid symbols (empty, too long, or lowercase)
            symbol: fc.oneof(
              fc.constant(''), // Empty - should fail
              fc.string({ minLength: 11, maxLength: 20 }), // Too long - should fail
              fc.string({ minLength: 1, maxLength: 5 }).map(s => s.toLowerCase()) // Lowercase - should fail
            ),
          }),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={createAssetSchema}
                defaultValues={{
                  name: invalidData.name,
                  symbol: invalidData.symbol,
                  asset_type: 'real_estate',
                  total_supply: 0,
                  min_subscription: 0,
                  apy_3m: 0,
                  apy_6m: 0,
                  apy_12m: 0,
                }}
                onSubmit={onSubmit}
                fields={assetFields}
              />
            )

            // Click submit to trigger validation
            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            // Wait for validation errors to appear
            await waitFor(() => {
              // Check that at least one error message is displayed
              const errorMessages = container.querySelectorAll('[data-testid^="error-"]')
              const hasErrors = Array.from(errorMessages).some(el => el.textContent !== '')
              expect(hasErrors).toBe(true)
            })

            // Verify form submission was prevented
            expect(onSubmit).not.toHaveBeenCalled()

            unmount()
          }
        ),
        { numRuns: 10 }
      )
    }, 15000)

    it('prevents form submission when asset validation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate negative numbers for fields that require non-negative
            total_supply: fc.integer({ min: -1000, max: -1 }),
            apy_3m: fc.oneof(
              fc.integer({ min: -100, max: -1 }), // Negative - should fail
              fc.integer({ min: 101, max: 200 }) // Over 100% - should fail
            ),
          }),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={createAssetSchema}
                defaultValues={{
                  name: 'Valid Name',
                  symbol: 'VALID',
                  asset_type: 'real_estate',
                  total_supply: invalidData.total_supply,
                  min_subscription: 0,
                  apy_3m: invalidData.apy_3m,
                  apy_6m: 0,
                  apy_12m: 0,
                }}
                onSubmit={onSubmit}
                fields={assetFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Verify form submission was prevented
              expect(onSubmit).not.toHaveBeenCalled()
            })

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that invalid KYC form data produces validation errors
   * **Validates: Requirements 4.7, 4.8**
   */
  describe('KYC Form Validation', () => {
    const kycFields = [
      { name: 'full_name', label: 'Full Name' },
      { name: 'id_number', label: 'ID Number' },
      { name: 'country', label: 'Country' },
    ]

    it('displays error messages for invalid KYC form data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate empty strings for required fields
            full_name: fc.constant(''),
            id_number: fc.constant(''),
            country: fc.constant(''),
          }),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={kycApplySchema}
                defaultValues={{
                  full_name: invalidData.full_name,
                  id_type: 'passport',
                  id_number: invalidData.id_number,
                  country: invalidData.country,
                  is_accredited: false,
                }}
                onSubmit={onSubmit}
                fields={kycFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Check that error messages are displayed for empty required fields
              const errorMessages = container.querySelectorAll('[data-testid^="error-"]')
              const hasErrors = Array.from(errorMessages).some(el => el.textContent !== '')
              expect(hasErrors).toBe(true)
            })

            // Verify form submission was prevented
            expect(onSubmit).not.toHaveBeenCalled()

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('prevents form submission when KYC validation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // At least one required field is empty
            full_name: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 50 })),
            id_number: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
            country: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 30 })),
          }).filter(data => 
            // Ensure at least one field is empty (invalid)
            data.full_name === '' || data.id_number === '' || data.country === ''
          ),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={kycApplySchema}
                defaultValues={{
                  full_name: invalidData.full_name,
                  id_type: 'passport',
                  id_number: invalidData.id_number,
                  country: invalidData.country,
                  is_accredited: false,
                }}
                onSubmit={onSubmit}
                fields={kycFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              expect(onSubmit).not.toHaveBeenCalled()
            })

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that invalid price form data produces validation errors
   * **Validates: Requirements 4.7, 4.8**
   */
  describe('Price Form Validation', () => {
    const priceFields = [
      { name: 'price', label: 'Price', type: 'number' },
    ]

    it('displays error messages for invalid price form data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate invalid prices (negative or zero)
            price: fc.oneof(
              fc.integer({ min: -1000, max: -1 }), // Negative - should fail
              fc.constant(0) // Zero - should fail (price must be > 0)
            ),
          }),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={priceUpdateSchema}
                defaultValues={{
                  price: invalidData.price,
                  source: 'manual',
                }}
                onSubmit={onSubmit}
                fields={priceFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Check that error message is displayed for invalid price
              const errorMessages = container.querySelectorAll('[data-testid^="error-"]')
              const hasErrors = Array.from(errorMessages).some(el => el.textContent !== '')
              expect(hasErrors).toBe(true)
            })

            // Verify form submission was prevented
            expect(onSubmit).not.toHaveBeenCalled()

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('prevents form submission when price validation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: -1000, max: 0 }), // Invalid prices
          async (invalidPrice) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={priceUpdateSchema}
                defaultValues={{
                  price: invalidPrice,
                  source: 'manual',
                }}
                onSubmit={onSubmit}
                fields={priceFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              expect(onSubmit).not.toHaveBeenCalled()
            })

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that FormMessage component displays error messages correctly
   * **Validates: Requirement 4.7**
   */
  describe('FormMessage Error Display', () => {
    // Simple schema for testing error message display
    const simpleSchema = z.object({
      required_field: z.string().min(1, 'This field is required'),
      min_length_field: z.string().min(5, 'Must be at least 5 characters'),
      max_length_field: z.string().max(10, 'Must be at most 10 characters'),
    })

    const simpleFields = [
      { name: 'required_field', label: 'Required Field' },
      { name: 'min_length_field', label: 'Min Length Field' },
      { name: 'max_length_field', label: 'Max Length Field' },
    ]

    it('FormMessage displays appropriate error text for validation failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            required_field: fc.constant(''), // Empty - triggers "required" error
            min_length_field: fc.string({ minLength: 1, maxLength: 4 }), // Too short
            max_length_field: fc.string({ minLength: 11, maxLength: 20 }), // Too long
          }),
          async (invalidData) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={simpleSchema}
                defaultValues={invalidData}
                onSubmit={onSubmit}
                fields={simpleFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Check for specific error messages
              const allText = container.textContent || ''
              
              // At least one of these error messages should be present
              const hasRequiredError = allText.includes('This field is required')
              const hasMinLengthError = allText.includes('Must be at least 5 characters')
              const hasMaxLengthError = allText.includes('Must be at most 10 characters')
              
              expect(hasRequiredError || hasMinLengthError || hasMaxLengthError).toBe(true)
            })

            expect(onSubmit).not.toHaveBeenCalled()

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that invalid fields are highlighted (aria-invalid attribute)
   * **Validates: Requirement 4.8**
   */
  describe('Invalid Field Highlighting', () => {
    const highlightSchema = z.object({
      test_field: z.string().min(1, 'Field is required'),
    })

    const highlightFields = [
      { name: 'test_field', label: 'Test Field' },
    ]

    it('invalid fields have aria-invalid attribute set to true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(''), // Always empty to trigger validation error
          async () => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={highlightSchema}
                defaultValues={{ test_field: '' }}
                onSubmit={onSubmit}
                fields={highlightFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Check that the input has aria-invalid="true"
              const input = form.getByTestId('input-test_field')
              expect(input.getAttribute('aria-invalid')).toBe('true')
            })

            expect(onSubmit).not.toHaveBeenCalled()

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that valid form data allows submission
   * This is a sanity check to ensure the form works correctly with valid data
   * **Validates: Requirements 4.7, 4.8**
   */
  describe('Valid Form Submission', () => {
    const validSchema = z.object({
      name: z.string().min(1, 'Name is required'),
    })

    const validFields = [
      { name: 'name', label: 'Name' },
    ]

    it('valid form data allows submission without errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid non-empty strings that are not just whitespace
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (validName) => {
            const onSubmit = vi.fn()
            
            const { unmount, container } = render(
              <TestForm
                schema={validSchema}
                defaultValues={{ name: validName }}
                onSubmit={onSubmit}
                fields={validFields}
              />
            )

            const form = within(container)
            const submitButton = form.getByTestId('submit-button')
            await userEvent.click(submitButton)

            await waitFor(() => {
              // Verify form submission was called with valid data
              expect(onSubmit).toHaveBeenCalledTimes(1)
              // Check that the first argument contains the expected name
              expect(onSubmit.mock.calls[0][0]).toEqual({ name: validName })
            })

            // Verify no error messages are displayed
            const errorMessages = container.querySelectorAll('[data-testid^="error-"]')
            const hasErrors = Array.from(errorMessages).some(el => el.textContent !== '')
            expect(hasErrors).toBe(false)

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
