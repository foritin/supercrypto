/**
 * Property 1: Component Migration Rendering Correctness
 * 
 * For any valid props passed to a migrated shadcn/ui component 
 * (Button, Card, Badge, Skeleton, Input, Textarea, Checkbox), 
 * the component SHALL render without errors and produce valid, accessible HTML output.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 */

import { render, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { describe, it, expect, afterEach } from 'vitest'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

// Feature: frontend-shadcn-migration, Property 1: Component Migration Rendering Correctness
describe('Property 1: Component Migration Rendering Correctness', () => {
  // Clean up after each test to prevent memory leaks
  afterEach(() => {
    cleanup()
  })

  /**
   * Button Component Property Test
   * Validates: Requirement 3.1 - Button component migration
   */
  it('Button renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          variant: fc.constantFrom('primary', 'destructive', 'outline', 'secondary', 'ghost', 'accent', 'glass'),
          size: fc.constantFrom('default', 'sm', 'lg', 'icon'),
          disabled: fc.boolean(),
          children: fc.string({ minLength: 0, maxLength: 100 }),
        }),
        (props) => {
          const { container } = render(
            <Button 
              variant={props.variant} 
              size={props.size} 
              disabled={props.disabled}
            >
              {props.children}
            </Button>
          )
          
          // Verify button element exists
          const button = container.querySelector('button')
          expect(button).toBeInTheDocument()
          
          // Verify button has correct disabled state
          if (props.disabled) {
            expect(button).toBeDisabled()
          } else {
            expect(button).not.toBeDisabled()
          }
          
          // Verify button contains the children text
          expect(button?.textContent).toBe(props.children)
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Card Component Property Test
   * Validates: Requirement 3.2 - Card component migration with glass-morphism styling
   */
  it('Card renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 0, maxLength: 100 }),
          description: fc.string({ minLength: 0, maxLength: 200 }),
          content: fc.string({ minLength: 0, maxLength: 500 }),
          hasHeader: fc.boolean(),
          hasFooter: fc.boolean(),
        }),
        (props) => {
          const { container } = render(
            <Card>
              {props.hasHeader && (
                <CardHeader>
                  <CardTitle>{props.title}</CardTitle>
                  <CardDescription>{props.description}</CardDescription>
                </CardHeader>
              )}
              <CardContent>{props.content}</CardContent>
              {props.hasFooter && (
                <CardFooter>Footer Content</CardFooter>
              )}
            </Card>
          )
          
          // Verify card element exists (it's a div with specific classes)
          const card = container.firstChild as HTMLElement
          expect(card).toBeInTheDocument()
          expect(card.tagName.toLowerCase()).toBe('div')
          
          // Verify content is rendered
          expect(container.textContent).toContain(props.content)
          
          // Verify header is rendered when hasHeader is true
          if (props.hasHeader) {
            expect(container.textContent).toContain(props.title)
            expect(container.textContent).toContain(props.description)
          }
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Badge Component Property Test
   * Validates: Requirement 3.7 - Tag/Badge component migration
   */
  it('Badge renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          variant: fc.constantFrom('default', 'secondary', 'destructive', 'outline'),
          children: fc.string({ minLength: 0, maxLength: 50 }),
        }),
        (props) => {
          const { container } = render(
            <Badge variant={props.variant}>
              {props.children}
            </Badge>
          )
          
          // Verify badge element exists (it's a div)
          const badge = container.firstChild as HTMLElement
          expect(badge).toBeInTheDocument()
          expect(badge.tagName.toLowerCase()).toBe('div')
          
          // Verify badge contains the children text
          expect(badge.textContent).toBe(props.children)
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Skeleton Component Property Test
   * Validates: Requirement 3.8 - Skeleton component migration
   */
  it('Skeleton renders without errors for any valid dimensions', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 10, max: 500 }),
          height: fc.integer({ min: 10, max: 200 }),
          className: fc.constantFrom('', 'rounded-full', 'rounded-lg', 'rounded-xl'),
        }),
        (props) => {
          const { container } = render(
            <Skeleton 
              className={props.className}
              style={{ width: props.width, height: props.height }}
            />
          )
          
          // Verify skeleton element exists
          const skeleton = container.firstChild as HTMLElement
          expect(skeleton).toBeInTheDocument()
          expect(skeleton.tagName.toLowerCase()).toBe('div')
          
          // Verify skeleton has animate-pulse class (for loading animation)
          expect(skeleton.className).toContain('animate-pulse')
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Input Component Property Test
   * Validates: Requirement 4.3 - Input component migration
   */
  it('Input renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('text', 'email', 'password', 'number', 'tel', 'url'),
          placeholder: fc.string({ minLength: 0, maxLength: 100 }),
          disabled: fc.boolean(),
          readOnly: fc.boolean(),
          defaultValue: fc.string({ minLength: 0, maxLength: 100 }),
        }),
        (props) => {
          const { container } = render(
            <Input 
              type={props.type}
              placeholder={props.placeholder}
              disabled={props.disabled}
              readOnly={props.readOnly}
              defaultValue={props.defaultValue}
            />
          )
          
          // Verify input element exists
          const input = container.querySelector('input')
          expect(input).toBeInTheDocument()
          
          // Verify input has correct type
          expect(input?.type).toBe(props.type)
          
          // Verify input has correct disabled state
          if (props.disabled) {
            expect(input).toBeDisabled()
          } else {
            expect(input).not.toBeDisabled()
          }
          
          // Verify input has correct readOnly state
          expect(input?.readOnly).toBe(props.readOnly)
          
          // Verify placeholder is set
          expect(input?.placeholder).toBe(props.placeholder)
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Textarea Component Property Test
   * Validates: Requirement 4.5 - TextArea component migration
   */
  it('Textarea renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          placeholder: fc.string({ minLength: 0, maxLength: 100 }),
          disabled: fc.boolean(),
          readOnly: fc.boolean(),
          rows: fc.integer({ min: 1, max: 20 }),
          defaultValue: fc.string({ minLength: 0, maxLength: 500 }),
        }),
        (props) => {
          const { container } = render(
            <Textarea 
              placeholder={props.placeholder}
              disabled={props.disabled}
              readOnly={props.readOnly}
              rows={props.rows}
              defaultValue={props.defaultValue}
            />
          )
          
          // Verify textarea element exists
          const textarea = container.querySelector('textarea')
          expect(textarea).toBeInTheDocument()
          
          // Verify textarea has correct disabled state
          if (props.disabled) {
            expect(textarea).toBeDisabled()
          } else {
            expect(textarea).not.toBeDisabled()
          }
          
          // Verify textarea has correct readOnly state
          expect(textarea?.readOnly).toBe(props.readOnly)
          
          // Verify placeholder is set
          expect(textarea?.placeholder).toBe(props.placeholder)
          
          // Verify rows attribute
          expect(textarea?.rows).toBe(props.rows)
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Checkbox Component Property Test
   * Validates: Requirement 4.6 - Checkbox component migration
   */
  it('Checkbox renders without errors for any valid props', () => {
    fc.assert(
      fc.property(
        fc.record({
          disabled: fc.boolean(),
          defaultChecked: fc.boolean(),
        }),
        (props) => {
          const { container } = render(
            <Checkbox 
              disabled={props.disabled}
              defaultChecked={props.defaultChecked}
            />
          )
          
          // Verify checkbox element exists (Radix renders a button with role="checkbox")
          const checkbox = container.querySelector('button[role="checkbox"]')
          expect(checkbox).toBeInTheDocument()
          
          // Verify checkbox has correct disabled state
          if (props.disabled) {
            expect(checkbox).toBeDisabled()
          } else {
            expect(checkbox).not.toBeDisabled()
          }
          
          // Verify checkbox has correct checked state
          const checkedState = checkbox?.getAttribute('data-state')
          if (props.defaultChecked) {
            expect(checkedState).toBe('checked')
          } else {
            expect(checkedState).toBe('unchecked')
          }
          
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })
})
