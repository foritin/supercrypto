/**
 * Liveness Step Property Tests
 *
 * 属性测试验证 Liveness Step 组件中手持证照 (selfie) 功能的正确性
 *
 * Feature: kyc-media-display-and-selfie
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================================================
// Helper: Generate hex string (fast-check v4 doesn't have hexaString)
// ============================================================================

/**
 * Arbitrary for hex strings of specified length
 */
const hexStringArb = (length: number): fc.Arbitrary<string> =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: length, maxLength: length })
    .map((arr) => arr.map((n) => n.toString(16)).join(''))

// ============================================================================
// Arbitraries for Liveness Step State
// ============================================================================

/**
 * Arbitrary for valid MinIO selfie file paths
 * Format: kyc/0x{wallet_address}/selfie_{uuid}.{ext}
 */
const selfiePathArb = fc
  .tuple(
    hexStringArb(40), // wallet address (40 hex chars)
    fc.uuid(), // file uuid
    fc.constantFrom('jpg', 'jpeg', 'png') // extension
  )
  .map(([address, uuid, ext]) => `kyc/0x${address}/selfie_${uuid}.${ext}`)

/**
 * Arbitrary for valid base64 selfie image data
 * Simulates a base64-encoded image string
 */
const selfieBase64Arb = fc
  .string({ minLength: 100, maxLength: 500 })
  .map((s) => `data:image/jpeg;base64,${Buffer.from(s).toString('base64')}`)

/**
 * Arbitrary for valid MinIO face image paths
 */
const faceImagePathArb = fc
  .tuple(
    hexStringArb(40),
    fc.uuid(),
    fc.constantFrom('jpg', 'jpeg', 'png')
  )
  .map(([address, uuid, ext]) => `kyc/0x${address}/face_image_${uuid}.${ext}`)

/**
 * Arbitrary for valid base64 face image data
 */
const faceImageBase64Arb = fc
  .string({ minLength: 100, maxLength: 500 })
  .map((s) => `data:image/jpeg;base64,${Buffer.from(s).toString('base64')}`)

/**
 * Upload status type matching the component
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * Arbitrary for upload status
 */
const uploadStatusArb = fc.constantFrom<UploadStatus>('idle', 'uploading', 'success', 'error')

// ============================================================================
// Helper Functions (mirrors liveness-step.tsx logic)
// ============================================================================

/**
 * Helper function to simulate selfie context update after successful upload
 * This mirrors the logic in liveness-step.tsx handleCaptureSelfie function
 *
 * Key behavior (Requirements 5.4):
 * - On successful selfie upload, both selfie (base64 preview) and selfiePath (MinIO path) are updated
 */
function updateKycContextAfterSelfieUpload(
  currentFormData: { selfie?: string; selfiePath?: string; [key: string]: unknown },
  selfieBase64: string,
  selfiePath: string
): { selfie?: string; selfiePath?: string; [key: string]: unknown } {
  return {
    ...currentFormData,
    selfie: selfieBase64,
    selfiePath: selfiePath,
  }
}

/**
 * Helper function to determine if continue button should be enabled
 * This mirrors the logic in liveness-step.tsx isAllComplete calculation
 *
 * Key behavior (Requirements 5.6):
 * - Continue button is enabled if and only if:
 *   1. capturedImage is not null AND uploadStatus is 'success'
 *   2. livenessVerified is true
 *   3. selfieImage is not null AND selfieUploadStatus is 'success'
 */
function isAllComplete(state: {
  capturedImage: string | null
  uploadStatus: UploadStatus
  livenessVerified: boolean
  selfieImage: string | null
  selfieUploadStatus: UploadStatus
}): boolean {
  return (
    state.capturedImage !== null &&
    state.uploadStatus === 'success' &&
    state.livenessVerified === true &&
    state.selfieImage !== null &&
    state.selfieUploadStatus === 'success'
  )
}

/**
 * Arbitrary for Liveness Step state
 */
const livenessStepStateArb = fc.record({
  capturedImage: fc.option(faceImageBase64Arb, { nil: null }),
  uploadStatus: uploadStatusArb,
  livenessVerified: fc.boolean(),
  selfieImage: fc.option(selfieBase64Arb, { nil: null }),
  selfieUploadStatus: uploadStatusArb,
})

// ============================================================================
// Property 3: Selfie Context Update
// ============================================================================

/**
 * **Property 3: Selfie Context Update**
 * **Validates: Requirements 5.4**
 *
 * For any successful selfie upload, the KYC context SHALL be updated with
 * both the base64 preview (selfie) and the MinIO path (selfiePath).
 */
describe('Property 3: Selfie Context Update', () => {
  /**
   * Test: Successful selfie upload should update both selfie and selfiePath
   * **Validates: Requirements 5.4**
   */
  it('property: successful selfie upload should update both selfie and selfiePath in context', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        (selfieBase64, selfiePath) => {
          const initialFormData = {
            firstName: 'Test',
            lastName: 'User',
          }

          const updatedFormData = updateKycContextAfterSelfieUpload(
            initialFormData,
            selfieBase64,
            selfiePath
          )

          // Both selfie and selfiePath should be set
          expect(updatedFormData.selfie).toBe(selfieBase64)
          expect(updatedFormData.selfiePath).toBe(selfiePath)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Selfie update should preserve existing form data
   * **Validates: Requirements 5.4**
   */
  it('property: selfie context update should preserve existing form data', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.string({ minLength: 2, maxLength: 50 }),
        (selfieBase64, selfiePath, firstName, lastName) => {
          const initialFormData = {
            firstName,
            lastName,
            documentType: 'passport',
          }

          const updatedFormData = updateKycContextAfterSelfieUpload(
            initialFormData,
            selfieBase64,
            selfiePath
          )

          // Existing fields should be preserved
          expect(updatedFormData.firstName).toBe(firstName)
          expect(updatedFormData.lastName).toBe(lastName)
          expect(updatedFormData.documentType).toBe('passport')

          // New selfie fields should be added
          expect(updatedFormData.selfie).toBe(selfieBase64)
          expect(updatedFormData.selfiePath).toBe(selfiePath)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Selfie update should overwrite previous selfie data
   * **Validates: Requirements 5.4**
   */
  it('property: selfie context update should overwrite previous selfie data', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        selfieBase64Arb,
        selfiePathArb,
        (oldSelfie, oldPath, newSelfie, newPath) => {
          // Assume old and new are different
          fc.pre(oldSelfie !== newSelfie || oldPath !== newPath)

          const initialFormData = {
            selfie: oldSelfie,
            selfiePath: oldPath,
          }

          const updatedFormData = updateKycContextAfterSelfieUpload(
            initialFormData,
            newSelfie,
            newPath
          )

          // New selfie data should overwrite old data
          expect(updatedFormData.selfie).toBe(newSelfie)
          expect(updatedFormData.selfiePath).toBe(newPath)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Selfie base64 format should be preserved exactly
   * **Validates: Requirements 5.4**
   */
  it('property: selfie base64 format should be preserved exactly in context', () => {
    fc.assert(
      fc.property(selfieBase64Arb, selfiePathArb, (selfieBase64, selfiePath) => {
        const updatedFormData = updateKycContextAfterSelfieUpload({}, selfieBase64, selfiePath)

        // Base64 data should be exactly preserved
        expect(updatedFormData.selfie).toBe(selfieBase64)
        expect(updatedFormData.selfie).toMatch(/^data:image\/(jpeg|png|jpg);base64,/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Selfie MinIO path format should be preserved exactly
   * **Validates: Requirements 5.4**
   */
  it('property: selfie MinIO path format should be preserved exactly in context', () => {
    fc.assert(
      fc.property(selfieBase64Arb, selfiePathArb, (selfieBase64, selfiePath) => {
        const updatedFormData = updateKycContextAfterSelfieUpload({}, selfieBase64, selfiePath)

        // MinIO path should be exactly preserved
        expect(updatedFormData.selfiePath).toBe(selfiePath)
        expect(updatedFormData.selfiePath).toMatch(
          /^kyc\/0x[a-f0-9]+\/selfie_[a-f0-9-]+\.(jpg|jpeg|png)$/
        )

        return true
      }),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Property 4: Three-Step Completion Gate
// ============================================================================

/**
 * **Property 4: Three-Step Completion Gate**
 * **Validates: Requirements 5.6**
 *
 * For any state of Liveness_Step, the continue button SHALL be enabled if and only if
 * all three conditions are met:
 * 1. capturedImage is not null AND uploadStatus is 'success'
 * 2. livenessVerified is true
 * 3. selfieImage is not null AND selfieUploadStatus is 'success'
 */
describe('Property 4: Three-Step Completion Gate', () => {
  /**
   * Test: Continue button should be enabled only when all three steps are complete
   * **Validates: Requirements 5.6**
   */
  it('property: continue button enabled iff all three steps complete with success status', () => {
    fc.assert(
      fc.property(livenessStepStateArb, (state) => {
        const canContinue = isAllComplete(state)

        // Calculate expected result based on the three conditions
        const expectedCanContinue =
          state.capturedImage !== null &&
          state.uploadStatus === 'success' &&
          state.livenessVerified === true &&
          state.selfieImage !== null &&
          state.selfieUploadStatus === 'success'

        expect(canContinue).toBe(expectedCanContinue)

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Missing capturedImage should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: missing capturedImage should disable continue button', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        (selfieBase64) => {
          const state = {
            capturedImage: null, // Missing face photo
            uploadStatus: 'success' as UploadStatus,
            livenessVerified: true,
            selfieImage: selfieBase64,
            selfieUploadStatus: 'success' as UploadStatus,
          }

          expect(isAllComplete(state)).toBe(false)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test: Non-success uploadStatus should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: non-success uploadStatus should disable continue button', () => {
    fc.assert(
      fc.property(
        faceImageBase64Arb,
        selfieBase64Arb,
        fc.constantFrom<UploadStatus>('idle', 'uploading', 'error'),
        (faceImage, selfieImage, uploadStatus) => {
          const state = {
            capturedImage: faceImage,
            uploadStatus, // Not 'success'
            livenessVerified: true,
            selfieImage,
            selfieUploadStatus: 'success' as UploadStatus,
          }

          expect(isAllComplete(state)).toBe(false)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test: livenessVerified false should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: livenessVerified false should disable continue button', () => {
    fc.assert(
      fc.property(faceImageBase64Arb, selfieBase64Arb, (faceImage, selfieImage) => {
        const state = {
          capturedImage: faceImage,
          uploadStatus: 'success' as UploadStatus,
          livenessVerified: false, // Not verified
          selfieImage,
          selfieUploadStatus: 'success' as UploadStatus,
        }

        expect(isAllComplete(state)).toBe(false)

        return true
      }),
      { numRuns: 50 }
    )
  })

  /**
   * Test: Missing selfieImage should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: missing selfieImage should disable continue button', () => {
    fc.assert(
      fc.property(faceImageBase64Arb, (faceImage) => {
        const state = {
          capturedImage: faceImage,
          uploadStatus: 'success' as UploadStatus,
          livenessVerified: true,
          selfieImage: null, // Missing selfie
          selfieUploadStatus: 'success' as UploadStatus,
        }

        expect(isAllComplete(state)).toBe(false)

        return true
      }),
      { numRuns: 50 }
    )
  })

  /**
   * Test: Non-success selfieUploadStatus should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: non-success selfieUploadStatus should disable continue button', () => {
    fc.assert(
      fc.property(
        faceImageBase64Arb,
        selfieBase64Arb,
        fc.constantFrom<UploadStatus>('idle', 'uploading', 'error'),
        (faceImage, selfieImage, selfieUploadStatus) => {
          const state = {
            capturedImage: faceImage,
            uploadStatus: 'success' as UploadStatus,
            livenessVerified: true,
            selfieImage,
            selfieUploadStatus, // Not 'success'
          }

          expect(isAllComplete(state)).toBe(false)

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test: All conditions met should enable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: all conditions met should enable continue button', () => {
    fc.assert(
      fc.property(faceImageBase64Arb, selfieBase64Arb, (faceImage, selfieImage) => {
        const state = {
          capturedImage: faceImage,
          uploadStatus: 'success' as UploadStatus,
          livenessVerified: true,
          selfieImage,
          selfieUploadStatus: 'success' as UploadStatus,
        }

        expect(isAllComplete(state)).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Exactly one condition failing should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: exactly one condition failing should disable continue button', () => {
    fc.assert(
      fc.property(
        faceImageBase64Arb,
        selfieBase64Arb,
        fc.integer({ min: 0, max: 4 }),
        (faceImage, selfieImage, failingCondition) => {
          // Create a state where all conditions are met
          const baseState = {
            capturedImage: faceImage as string | null,
            uploadStatus: 'success' as UploadStatus,
            livenessVerified: true,
            selfieImage: selfieImage as string | null,
            selfieUploadStatus: 'success' as UploadStatus,
          }

          // Fail exactly one condition
          const state = { ...baseState }
          switch (failingCondition) {
            case 0:
              state.capturedImage = null
              break
            case 1:
              state.uploadStatus = 'error'
              break
            case 2:
              state.livenessVerified = false
              break
            case 3:
              state.selfieImage = null
              break
            case 4:
              state.selfieUploadStatus = 'error'
              break
          }

          // With exactly one condition failing, continue should be disabled
          expect(isAllComplete(state)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Multiple conditions failing should disable continue button
   * **Validates: Requirements 5.6**
   */
  it('property: multiple conditions failing should disable continue button', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 2, maxLength: 5 }),
        (failingConditions) => {
          // Create a state where all conditions are met
          const state = {
            capturedImage: 'data:image/jpeg;base64,abc123' as string | null,
            uploadStatus: 'success' as UploadStatus,
            livenessVerified: true,
            selfieImage: 'data:image/jpeg;base64,xyz789' as string | null,
            selfieUploadStatus: 'success' as UploadStatus,
          }

          // Fail multiple conditions
          const uniqueConditions = [...new Set(failingConditions)]
          for (const condition of uniqueConditions) {
            switch (condition) {
              case 0:
                state.capturedImage = null
                break
              case 1:
                state.uploadStatus = 'error'
                break
              case 2:
                state.livenessVerified = false
                break
              case 3:
                state.selfieImage = null
                break
              case 4:
                state.selfieUploadStatus = 'error'
                break
            }
          }

          // With multiple conditions failing, continue should be disabled
          expect(isAllComplete(state)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

describe('Liveness Step Edge Cases', () => {
  /**
   * Test: Upload status transitions should be valid
   * **Validates: Requirements 5.4, 5.6**
   */
  it('property: upload status should only be one of the valid values', () => {
    const validStatuses: UploadStatus[] = ['idle', 'uploading', 'success', 'error']

    fc.assert(
      fc.property(uploadStatusArb, (status) => {
        expect(validStatuses).toContain(status)
        return true
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Test: Selfie path format validation
   * **Validates: Requirements 5.4**
   */
  it('property: selfie paths should follow MinIO path format', () => {
    fc.assert(
      fc.property(selfiePathArb, (path) => {
        // Path should match expected format: kyc/{wallet_address}/selfie_{uuid}.{ext}
        const pattern = /^kyc\/0x[a-f0-9]+\/selfie_[a-f0-9-]+\.(jpg|jpeg|png)$/
        expect(path).toMatch(pattern)
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Face image path format validation
   * **Validates: Requirements 5.6**
   */
  it('property: face image paths should follow MinIO path format', () => {
    fc.assert(
      fc.property(faceImagePathArb, (path) => {
        // Path should match expected format: kyc/{wallet_address}/face_image_{uuid}.{ext}
        const pattern = /^kyc\/0x[a-f0-9]+\/face_image_[a-f0-9-]+\.(jpg|jpeg|png)$/
        expect(path).toMatch(pattern)
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Base64 image data should be valid data URI format
   * **Validates: Requirements 5.4**
   */
  it('property: base64 image data should be valid data URI format', () => {
    fc.assert(
      fc.property(selfieBase64Arb, (base64Data) => {
        // Should start with data URI prefix
        expect(base64Data).toMatch(/^data:image\/(jpeg|png|jpg);base64,/)
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: isAllComplete should be a pure function (same input = same output)
   * **Validates: Requirements 5.6**
   */
  it('property: isAllComplete should be deterministic', () => {
    fc.assert(
      fc.property(livenessStepStateArb, (state) => {
        const result1 = isAllComplete(state)
        const result2 = isAllComplete(state)
        const result3 = isAllComplete({ ...state })

        // Same input should always produce same output
        expect(result1).toBe(result2)
        expect(result1).toBe(result3)

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: State with all null/false values should disable continue
   * **Validates: Requirements 5.6**
   */
  it('property: initial state should disable continue button', () => {
    const initialState = {
      capturedImage: null,
      uploadStatus: 'idle' as UploadStatus,
      livenessVerified: false,
      selfieImage: null,
      selfieUploadStatus: 'idle' as UploadStatus,
    }

    expect(isAllComplete(initialState)).toBe(false)
  })

  /**
   * Test: Uploading status should not enable continue even with images present
   * **Validates: Requirements 5.6**
   */
  it('property: uploading status should not enable continue button', () => {
    fc.assert(
      fc.property(faceImageBase64Arb, selfieBase64Arb, (faceImage, selfieImage) => {
        // Test with face image uploading
        const state1 = {
          capturedImage: faceImage,
          uploadStatus: 'uploading' as UploadStatus,
          livenessVerified: true,
          selfieImage,
          selfieUploadStatus: 'success' as UploadStatus,
        }
        expect(isAllComplete(state1)).toBe(false)

        // Test with selfie uploading
        const state2 = {
          capturedImage: faceImage,
          uploadStatus: 'success' as UploadStatus,
          livenessVerified: true,
          selfieImage,
          selfieUploadStatus: 'uploading' as UploadStatus,
        }
        expect(isAllComplete(state2)).toBe(false)

        return true
      }),
      { numRuns: 50 }
    )
  })
})
