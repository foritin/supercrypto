/**
 * Property 10: Form Input Component Behavior Equivalence
 * 
 * For any form input (Input, Textarea, Checkbox) with valid props, the migrated shadcn/ui 
 * component SHALL accept the same input values and trigger the same onChange callbacks 
 * as the original Ant Design component.
 * 
 * **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
 * 
 * Requirements:
 * - 4.3: WHEN migrating Input components, THE Form_Handler SHALL replace Ant Design Input with shadcn/ui Input component
 * - 4.4: WHEN migrating InputNumber components, THE Form_Handler SHALL replace Ant Design InputNumber with shadcn/ui Input type="number" with custom formatting
 * - 4.5: WHEN migrating TextArea components, THE Form_Handler SHALL replace Ant Design Input.TextArea with shadcn/ui Textarea component
 * - 4.6: WHEN migrating Checkbox components, THE Form_Handler SHALL replace Ant Design Checkbox with shadcn/ui Checkbox component
 */

import { render, cleanup, fireEvent } from '@testing-library/react'
import fc from 'fast-check'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// Feature: frontend-shadcn-migration, Property 10: Form Input Component Behavior Equivalence
describe('Property 10: Form Input Component Behavior Equivalence', () => {
  // Clean up after each test to prevent memory leaks
  afterEach(() => {
    cleanup()
  })

  /**
   * Input Component Behavior Test
   * Validates: Requirement 4.3 - Input component accepts values and triggers onChange
   */
  describe('Input Component Behavior', () => {
    it('Input accepts any valid string value and displays it correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          (value) => {
            const { container } = render(
              <Input 
                defaultValue={value}
                data-testid="test-input"
              />
            )
            
            const input = container.querySelector('input')
            expect(input).toBeInTheDocument()
            
            // Verify the value is correctly displayed
            expect(input?.value).toBe(value)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Input triggers onChange callback when value changes', () => {
      fc.assert(
        fc.property(
          // Generate non-empty strings to ensure value actually changes from empty default
          fc.string({ minLength: 1, maxLength: 100 }),
          (newValue) => {
            const onChange = vi.fn()
            
            const { container } = render(
              <Input 
                defaultValue=""
                onChange={onChange}
                data-testid="test-input"
              />
            )
            
            const input = container.querySelector('input')
            expect(input).toBeInTheDocument()
            
            // Simulate value change
            fireEvent.change(input!, { target: { value: newValue } })
            
            // Verify onChange was called
            expect(onChange).toHaveBeenCalled()
            
            // Verify the event contains the correct value
            const firstCall = onChange.mock.calls[0]
            if (!firstCall) {
              return
            }
            const event = firstCall[0]
            if (!event) {
              return
            }
            expect(event.target.value).toBe(newValue)
            
            // Verify the new value is reflected in the input
            expect(input?.value).toBe(newValue)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Input type="number" accepts numeric values and triggers onChange callback', () => {
      fc.assert(
        fc.property(
          // Generate non-zero integers to ensure value changes from default "0"
          fc.integer({ min: 1, max: 10000 }),
          (newValue) => {
            const onChange = vi.fn()
            
            const { container } = render(
              <Input 
                type="number"
                defaultValue="0"
                onChange={onChange}
                data-testid="test-number-input"
              />
            )
            
            const input = container.querySelector('input')
            expect(input).toBeInTheDocument()
            expect(input?.type).toBe('number')
            
            // Simulate value change
            fireEvent.change(input!, { target: { value: newValue.toString() } })
            
            // Verify onChange was called
            expect(onChange).toHaveBeenCalled()
            
            // Verify the new value is reflected
            expect(input?.value).toBe(newValue.toString())
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Input type="number" accepts decimal values correctly', () => {
      fc.assert(
        fc.property(
          // Generate decimal values with 2 decimal places
          fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true })
            .map(v => parseFloat(v.toFixed(2))),
          (newValue) => {
            const onChange = vi.fn()
            const newStr = newValue.toFixed(2)
            
            const { container } = render(
              <Input 
                type="number"
                step="0.01"
                defaultValue="0.00"
                onChange={onChange}
                data-testid="test-decimal-input"
              />
            )
            
            const input = container.querySelector('input')
            expect(input).toBeInTheDocument()
            
            // Simulate value change
            fireEvent.change(input!, { target: { value: newStr } })
            
            // Verify onChange was called
            expect(onChange).toHaveBeenCalled()
            
            // Verify the new value is reflected
            expect(input?.value).toBe(newStr)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Input handles controlled value changes correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
          (values) => {
            const onChange = vi.fn()
            let currentValue = values[0]
            
            const { container, rerender } = render(
              <Input 
                value={currentValue}
                onChange={onChange}
                data-testid="controlled-input"
              />
            )
            
            const input = container.querySelector('input')
            expect(input).toBeInTheDocument()
            expect(input?.value).toBe(currentValue)
            
            // Simulate multiple value changes via controlled updates
            for (let i = 1; i < values.length; i++) {
              currentValue = values[i]
              rerender(
                <Input 
                  value={currentValue}
                  onChange={onChange}
                  data-testid="controlled-input"
                />
              )
              expect(input?.value).toBe(currentValue)
            }
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Textarea Component Behavior Test
   * Validates: Requirement 4.5 - Textarea component accepts values and triggers onChange
   */
  describe('Textarea Component Behavior', () => {
    it('Textarea accepts any valid string value and displays it correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 500 }),
          (value) => {
            const { container } = render(
              <Textarea 
                defaultValue={value}
                data-testid="test-textarea"
              />
            )
            
            const textarea = container.querySelector('textarea')
            expect(textarea).toBeInTheDocument()
            
            // Verify the value is correctly displayed
            expect(textarea?.value).toBe(value)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Textarea triggers onChange callback when value changes', () => {
      fc.assert(
        fc.property(
          // Generate non-empty strings to ensure value actually changes
          fc.string({ minLength: 1, maxLength: 500 }),
          (newValue) => {
            const onChange = vi.fn()
            
            const { container } = render(
              <Textarea 
                defaultValue=""
                onChange={onChange}
                data-testid="test-textarea"
              />
            )
            
            const textarea = container.querySelector('textarea')
            expect(textarea).toBeInTheDocument()
            
            // Simulate value change
            fireEvent.change(textarea!, { target: { value: newValue } })
            
            // Verify onChange was called
            expect(onChange).toHaveBeenCalled()
            
            // Verify the event contains the correct value
            const firstCall = onChange.mock.calls[0]
            if (!firstCall) {
              return
            }
            const event = firstCall[0]
            if (!event) {
              return
            }
            expect(event.target.value).toBe(newValue)
            
            // Verify the new value is reflected
            expect(textarea?.value).toBe(newValue)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Textarea accepts multiline text and preserves line breaks', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 10 })
            .map(lines => lines.join('\n')),
          (multilineText) => {
            const onChange = vi.fn()
            
            const { container } = render(
              <Textarea 
                defaultValue=""
                onChange={onChange}
                data-testid="test-multiline-textarea"
              />
            )
            
            const textarea = container.querySelector('textarea')
            expect(textarea).toBeInTheDocument()
            
            // Simulate multiline text input
            fireEvent.change(textarea!, { target: { value: multilineText } })
            
            // Verify onChange was called
            expect(onChange).toHaveBeenCalled()
            
            // Verify the multiline value is reflected correctly
            expect(textarea?.value).toBe(multilineText)
            
            // Verify line breaks are preserved
            const lineCount = multilineText.split('\n').length
            expect(textarea?.value.split('\n').length).toBe(lineCount)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Textarea handles controlled value changes correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 0, maxLength: 200 }), { minLength: 2, maxLength: 10 }),
          (values) => {
            const onChange = vi.fn()
            let currentValue = values[0]
            
            const { container, rerender } = render(
              <Textarea 
                value={currentValue}
                onChange={onChange}
                data-testid="controlled-textarea"
              />
            )
            
            const textarea = container.querySelector('textarea')
            expect(textarea).toBeInTheDocument()
            expect(textarea?.value).toBe(currentValue)
            
            // Simulate multiple value changes via controlled updates
            for (let i = 1; i < values.length; i++) {
              currentValue = values[i]
              rerender(
                <Textarea 
                  value={currentValue}
                  onChange={onChange}
                  data-testid="controlled-textarea"
                />
              )
              expect(textarea?.value).toBe(currentValue)
            }
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Checkbox Component Behavior Test
   * Validates: Requirement 4.6 - Checkbox component accepts checked state and triggers onCheckedChange
   */
  describe('Checkbox Component Behavior', () => {
    it('Checkbox accepts checked state and displays it correctly', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (checked) => {
            const { container } = render(
              <Checkbox 
                defaultChecked={checked}
                data-testid="test-checkbox"
              />
            )
            
            // Radix Checkbox renders as a button with role="checkbox"
            const checkbox = container.querySelector('button[role="checkbox"]')
            expect(checkbox).toBeInTheDocument()
            
            // Verify checked state is correctly displayed
            const state = checkbox?.getAttribute('data-state')
            expect(state).toBe(checked ? 'checked' : 'unchecked')
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Checkbox triggers onCheckedChange callback when clicked', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (initialChecked) => {
            const onCheckedChange = vi.fn()
            
            const { container } = render(
              <Checkbox 
                defaultChecked={initialChecked}
                onCheckedChange={onCheckedChange}
                data-testid="test-checkbox"
              />
            )
            
            const checkbox = container.querySelector('button[role="checkbox"]')
            expect(checkbox).toBeInTheDocument()
            
            // Simulate click to toggle
            fireEvent.click(checkbox!)
            
            // Verify onCheckedChange was called with the opposite value
            expect(onCheckedChange).toHaveBeenCalledWith(!initialChecked)
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Checkbox toggles state correctly on multiple clicks', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialChecked: fc.boolean(),
            clickCount: fc.integer({ min: 1, max: 10 }),
          }),
          (props) => {
            const onCheckedChange = vi.fn()
            
            const { container } = render(
              <Checkbox 
                defaultChecked={props.initialChecked}
                onCheckedChange={onCheckedChange}
                data-testid="test-toggle-checkbox"
              />
            )
            
            const checkbox = container.querySelector('button[role="checkbox"]')
            expect(checkbox).toBeInTheDocument()
            
            // Simulate multiple clicks
            for (let i = 0; i < props.clickCount; i++) {
              fireEvent.click(checkbox!)
            }
            
            // Verify onCheckedChange was called the correct number of times
            expect(onCheckedChange).toHaveBeenCalledTimes(props.clickCount)
            
            // Verify final state is correct (alternates with each click)
            const expectedFinalState = props.clickCount % 2 === 0 
              ? props.initialChecked 
              : !props.initialChecked
            
            const finalState = checkbox?.getAttribute('data-state')
            expect(finalState).toBe(expectedFinalState ? 'checked' : 'unchecked')
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Checkbox handles controlled checked state correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 10 }),
          (checkedStates) => {
            const onCheckedChange = vi.fn()
            const firstState = checkedStates[0]
            if (firstState === undefined) {
              return
            }
            let currentChecked = firstState
            
            const { container, rerender } = render(
              <Checkbox 
                checked={currentChecked}
                onCheckedChange={onCheckedChange}
                data-testid="controlled-checkbox"
              />
            )
            
            const checkbox = container.querySelector('button[role="checkbox"]')
            expect(checkbox).toBeInTheDocument()
            
            // Verify initial state
            expect(checkbox?.getAttribute('data-state')).toBe(currentChecked ? 'checked' : 'unchecked')
            
            // Simulate multiple state changes via controlled updates
            for (let i = 1; i < checkedStates.length; i++) {
              const nextChecked = checkedStates[i]
              if (nextChecked === undefined) {
                continue
              }
              currentChecked = nextChecked
              rerender(
                <Checkbox 
                  checked={currentChecked}
                  onCheckedChange={onCheckedChange}
                  data-testid="controlled-checkbox"
                />
              )
              
              expect(checkbox?.getAttribute('data-state')).toBe(currentChecked ? 'checked' : 'unchecked')
            }
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Disabled Checkbox does not trigger onCheckedChange on click', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (initialChecked) => {
            const onCheckedChange = vi.fn()
            
            const { container } = render(
              <Checkbox 
                defaultChecked={initialChecked}
                disabled={true}
                onCheckedChange={onCheckedChange}
                data-testid="disabled-checkbox"
              />
            )
            
            const checkbox = container.querySelector('button[role="checkbox"]')
            expect(checkbox).toBeInTheDocument()
            expect(checkbox).toBeDisabled()
            
            // Attempt to click disabled checkbox
            fireEvent.click(checkbox!)
            
            // Verify onCheckedChange was NOT called
            expect(onCheckedChange).not.toHaveBeenCalled()
            
            // Verify state remains unchanged
            expect(checkbox?.getAttribute('data-state')).toBe(initialChecked ? 'checked' : 'unchecked')
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Cross-component behavior consistency test
   * Validates: Requirements 4.3, 4.4, 4.5, 4.6 - All form inputs behave consistently
   */
  describe('Cross-Component Behavior Consistency', () => {
    it('All form inputs respect disabled state and prevent interaction', () => {
      fc.assert(
        fc.property(
          fc.record({
            inputValue: fc.string({ minLength: 0, maxLength: 50 }),
            textareaValue: fc.string({ minLength: 0, maxLength: 100 }),
            checkboxChecked: fc.boolean(),
          }),
          (props) => {
            const checkboxOnChange = vi.fn()
            
            const { container } = render(
              <div>
                <Input 
                  defaultValue={props.inputValue}
                  disabled={true}
                  data-testid="disabled-input"
                />
                <Textarea 
                  defaultValue={props.textareaValue}
                  disabled={true}
                  data-testid="disabled-textarea"
                />
                <Checkbox 
                  defaultChecked={props.checkboxChecked}
                  disabled={true}
                  onCheckedChange={checkboxOnChange}
                  data-testid="disabled-checkbox"
                />
              </div>
            )
            
            const input = container.querySelector('input')
            const textarea = container.querySelector('textarea')
            const checkbox = container.querySelector('button[role="checkbox"]')
            
            // Verify all are disabled
            expect(input).toBeDisabled()
            expect(textarea).toBeDisabled()
            expect(checkbox).toBeDisabled()
            
            // Attempt to click checkbox
            fireEvent.click(checkbox!)
            
            // Verify checkbox callback was not triggered
            expect(checkboxOnChange).not.toHaveBeenCalled()
            
            // Verify checkbox state unchanged
            expect(checkbox?.getAttribute('data-state')).toBe(props.checkboxChecked ? 'checked' : 'unchecked')
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('All form inputs maintain value integrity across re-renders', () => {
      fc.assert(
        fc.property(
          fc.record({
            inputValue: fc.string({ minLength: 0, maxLength: 50 }),
            textareaValue: fc.string({ minLength: 0, maxLength: 100 }),
            checkboxChecked: fc.boolean(),
          }),
          (props) => {
            const { container, rerender } = render(
              <div>
                <Input 
                  value={props.inputValue}
                  onChange={() => {}}
                  data-testid="input"
                />
                <Textarea 
                  value={props.textareaValue}
                  onChange={() => {}}
                  data-testid="textarea"
                />
                <Checkbox 
                  checked={props.checkboxChecked}
                  onCheckedChange={() => {}}
                  data-testid="checkbox"
                />
              </div>
            )
            
            // Re-render with same props
            rerender(
              <div>
                <Input 
                  value={props.inputValue}
                  onChange={() => {}}
                  data-testid="input"
                />
                <Textarea 
                  value={props.textareaValue}
                  onChange={() => {}}
                  data-testid="textarea"
                />
                <Checkbox 
                  checked={props.checkboxChecked}
                  onCheckedChange={() => {}}
                  data-testid="checkbox"
                />
              </div>
            )
            
            const input = container.querySelector('input')
            const textarea = container.querySelector('textarea')
            const checkbox = container.querySelector('button[role="checkbox"]')
            
            // Verify values are maintained
            expect(input?.value).toBe(props.inputValue)
            expect(textarea?.value).toBe(props.textareaValue)
            expect(checkbox?.getAttribute('data-state')).toBe(
              props.checkboxChecked ? 'checked' : 'unchecked'
            )
            
            cleanup()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
