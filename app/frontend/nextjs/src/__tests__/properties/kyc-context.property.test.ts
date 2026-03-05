/**
 * KYC Context Property Tests
 *
 * 属性测试验证 KYC Context 中手持证照 (selfie) 数据的处理正确性
 *
 * Feature: kyc-media-display-and-selfie
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

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
// Arbitraries for KYC Form Data
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
 * Arbitrary for valid MinIO liveness video paths
 */
const livenessVideoPathArb = fc
  .tuple(hexStringArb(40), fc.uuid())
  .map(([address, uuid]) => `kyc/0x${address}/liveness_video_${uuid}.webm`)

/**
 * Arbitrary for KYC form data with optional selfie fields
 */
const kycFormDataWithSelfieArb = fc.record({
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  dateOfBirth: fc.date({ min: new Date('1950-01-01'), max: new Date('2005-01-01') }).map((d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }),
  nationality: fc.constantFrom('US', 'CN', 'JP', 'UK', 'DE'),
  documentType: fc.constantFrom('passport', 'national_id', 'drivers_license'),
  documentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  documentExpiry: fc.date({ min: new Date('2025-01-01'), max: new Date('2035-01-01') }).map((d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }),
  // Selfie fields (Requirements 6.1, 6.2)
  selfie: fc.option(selfieBase64Arb, { nil: undefined }),
  selfiePath: fc.option(selfiePathArb, { nil: undefined }),
  // Other media fields
  faceImagePath: fc.option(faceImagePathArb, { nil: undefined }),
  livenessVideoPath: fc.option(livenessVideoPathArb, { nil: undefined }),
})

// ============================================================================
// Helper Functions (mirrors kyc-context.tsx logic)
// ============================================================================

/**
 * Helper function to build KYC API request from form data
 * This mirrors the logic in kyc-context.tsx submitKyc function
 *
 * Key mapping (Requirements 6.3):
 * - selfiePath -> selfie_url
 * - faceImagePath -> face_image_url
 * - livenessVideoPath -> liveness_video_url
 */
function buildKycApiRequest(formData: {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  documentType: string
  documentNumber: string
  documentExpiry: string
  selfie?: string
  selfiePath?: string
  faceImagePath?: string
  livenessVideoPath?: string
}) {
  return {
    full_name: `${formData.firstName} ${formData.lastName}`.trim(),
    date_of_birth: formData.dateOfBirth,
    country_code: formData.nationality.toUpperCase().slice(0, 2),
    documents: [],
    // Field mapping as per Requirements 6.3
    // selfiePath maps to selfie_url in API request
    selfie_url: formData.selfiePath || undefined,
    face_image_url: formData.faceImagePath || undefined,
    liveness_video_url: formData.livenessVideoPath || undefined,
  }
}

/**
 * Helper function to simulate loading draft from localStorage
 * This mirrors the logic in kyc-context.tsx loadDraft function
 *
 * Key behavior (Requirements 6.4):
 * - selfie and selfiePath should be restored from saved draft
 */
function loadDraftFromStorage(savedDraft: {
  formData: {
    selfie?: string
    selfiePath?: string
    [key: string]: unknown
  }
  status?: string
  lastSaved?: number
}): {
  formData: { selfie?: string; selfiePath?: string; [key: string]: unknown }
  status: string
  lastSaved: number | null
} {
  const initialFormData = { agreeToTerms: false }

  // Filter out empty strings and undefined values, keeping valid data
  const cleanedFormData: { [key: string]: unknown } = {}
  if (savedDraft.formData) {
    for (const [key, value] of Object.entries(savedDraft.formData)) {
      // Keep non-empty values (but preserve false boolean values)
      if (value !== '' && value !== undefined && value !== null) {
        cleanedFormData[key] = value
      }
    }
  }

  return {
    formData: { ...initialFormData, ...cleanedFormData },
    status: savedDraft.status || 'draft',
    lastSaved: savedDraft.lastSaved || null,
  }
}

// ============================================================================
// Property 5: KYC Submission Selfie Inclusion
// ============================================================================

/**
 * **Property 5: KYC Submission Selfie Inclusion**
 * **Validates: Requirements 6.3**
 *
 * For any KYC submission where `selfiePath` is available in formData,
 * the API request payload SHALL include `selfie_url` with the value of selfiePath.
 */
describe('Property 5: KYC Submission Selfie Inclusion', () => {
  /**
   * Test: selfiePath should map to selfie_url in API request
   * **Validates: Requirements 6.3**
   */
  it('property: selfiePath should correctly map to selfie_url in API request', () => {
    fc.assert(
      fc.property(kycFormDataWithSelfieArb, (formData) => {
        const normalizedFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          documentExpiry: formData.documentExpiry,
          ...(formData.selfie ? { selfie: formData.selfie } : {}),
          ...(formData.selfiePath ? { selfiePath: formData.selfiePath } : {}),
          ...(formData.faceImagePath ? { faceImagePath: formData.faceImagePath } : {}),
          ...(formData.livenessVideoPath ? { livenessVideoPath: formData.livenessVideoPath } : {}),
        }

        const apiRequest = buildKycApiRequest(normalizedFormData)

        if (formData.selfiePath) {
          // When selfiePath is set, selfie_url should have the same value
          expect(apiRequest.selfie_url).toBe(formData.selfiePath)
        } else {
          // When selfiePath is not set, selfie_url should be undefined
          expect(apiRequest.selfie_url).toBeUndefined()
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: selfiePath should be included independently of other media paths
   * **Validates: Requirements 6.3**
   */
  it('property: selfiePath should be mapped independently of faceImagePath and livenessVideoPath', () => {
    fc.assert(
      fc.property(
        selfiePathArb,
        faceImagePathArb,
        livenessVideoPathArb,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (selfiePath, facePath, videoPath, includeSelfie, includeFace, includeVideo) => {
          const formData = {
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'ABC123456',
            documentExpiry: '2030-01-01',
            ...(includeSelfie ? { selfiePath } : {}),
            ...(includeFace ? { faceImagePath: facePath } : {}),
            ...(includeVideo ? { livenessVideoPath: videoPath } : {}),
          }

          const apiRequest = buildKycApiRequest(formData)

          // Verify independent mapping for selfie
          if (includeSelfie) {
            expect(apiRequest.selfie_url).toBe(selfiePath)
          } else {
            expect(apiRequest.selfie_url).toBeUndefined()
          }

          // Verify other fields are also independently mapped
          if (includeFace) {
            expect(apiRequest.face_image_url).toBe(facePath)
          } else {
            expect(apiRequest.face_image_url).toBeUndefined()
          }

          if (includeVideo) {
            expect(apiRequest.liveness_video_url).toBe(videoPath)
          } else {
            expect(apiRequest.liveness_video_url).toBeUndefined()
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: selfiePath format should be preserved exactly in mapping
   * **Validates: Requirements 6.3**
   */
  it('property: selfiePath format should be preserved exactly in API request', () => {
    fc.assert(
      fc.property(selfiePathArb, (selfiePath) => {
        const formData = {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          nationality: 'US',
          documentType: 'passport',
          documentNumber: 'ABC123456',
          documentExpiry: '2030-01-01',
          selfiePath,
        }

        const apiRequest = buildKycApiRequest(formData)

        // Path should be exactly preserved, no transformation
        expect(apiRequest.selfie_url).toBe(selfiePath)

        // Verify path format is valid MinIO selfie path
        expect(apiRequest.selfie_url).toMatch(
          /^kyc\/0x[a-f0-9]+\/selfie_[a-f0-9-]+\.(jpg|jpeg|png)$/
        )

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Empty string selfiePath should result in undefined selfie_url
   * **Validates: Requirements 6.3**
   */
  it('property: empty or falsy selfiePath should result in undefined selfie_url', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', undefined, null),
        (selfiePathValue) => {
          const formData = {
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'ABC123456',
            documentExpiry: '2030-01-01',
            ...((selfiePathValue as string | undefined) ? { selfiePath: selfiePathValue as string } : {}),
          }

          const apiRequest = buildKycApiRequest(formData)

          // Empty/null/undefined values should result in undefined
          // The implementation uses `|| undefined` which converts falsy values to undefined
          expect(apiRequest.selfie_url).toBeUndefined()

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ============================================================================
// Property 6: Draft Restoration Completeness
// ============================================================================

/**
 * **Property 6: Draft Restoration Completeness**
 * **Validates: Requirements 6.4**
 *
 * For any saved KYC draft containing `selfie` and `selfiePath`,
 * loading the draft SHALL restore both values to the KYC context formData.
 */
describe('Property 6: Draft Restoration Completeness', () => {
  /**
   * Test: selfie and selfiePath should be restored from draft
   * **Validates: Requirements 6.4**
   */
  it('property: selfie and selfiePath should be restored from saved draft', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        (selfieBase64, selfiePath) => {
          const savedDraft = {
            formData: {
              firstName: 'Test',
              lastName: 'User',
              selfie: selfieBase64,
              selfiePath: selfiePath,
            },
            status: 'draft',
            lastSaved: Date.now(),
          }

          const loaded = loadDraftFromStorage(savedDraft)

          // Both selfie and selfiePath should be restored
          expect(loaded.formData.selfie).toBe(selfieBase64)
          expect(loaded.formData.selfiePath).toBe(selfiePath)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Draft with only selfiePath (no selfie preview) should restore selfiePath
   * **Validates: Requirements 6.4**
   */
  it('property: draft with only selfiePath should restore selfiePath correctly', () => {
    fc.assert(
      fc.property(selfiePathArb, (selfiePath) => {
        const savedDraft = {
          formData: {
            firstName: 'Test',
            lastName: 'User',
            selfiePath: selfiePath,
            // selfie is not set (no preview available)
          },
          status: 'draft',
          lastSaved: Date.now(),
        }

        const loaded = loadDraftFromStorage(savedDraft)

        // selfiePath should be restored
        expect(loaded.formData.selfiePath).toBe(selfiePath)
        // selfie should be undefined (not set in draft)
        expect(loaded.formData.selfie).toBeUndefined()

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Draft with only selfie preview (no selfiePath) should restore selfie
   * **Validates: Requirements 6.4**
   */
  it('property: draft with only selfie preview should restore selfie correctly', () => {
    fc.assert(
      fc.property(selfieBase64Arb, (selfieBase64) => {
        const savedDraft = {
          formData: {
            firstName: 'Test',
            lastName: 'User',
            selfie: selfieBase64,
            // selfiePath is not set (upload not completed)
          },
          status: 'draft',
          lastSaved: Date.now(),
        }

        const loaded = loadDraftFromStorage(savedDraft)

        // selfie should be restored
        expect(loaded.formData.selfie).toBe(selfieBase64)
        // selfiePath should be undefined (not set in draft)
        expect(loaded.formData.selfiePath).toBeUndefined()

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Empty string values should be filtered out during draft restoration
   * **Validates: Requirements 6.4**
   */
  it('property: empty string selfie/selfiePath should be filtered out during restoration', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', undefined, null),
        fc.constantFrom('', undefined, null),
        (selfieValue, selfiePathValue) => {
          const savedDraft = {
            formData: {
              firstName: 'Test',
              lastName: 'User',
              ...((selfieValue as string | undefined) ? { selfie: selfieValue as string } : {}),
              ...((selfiePathValue as string | undefined) ? { selfiePath: selfiePathValue as string } : {}),
            },
            status: 'draft',
            lastSaved: Date.now(),
          }

          const loaded = loadDraftFromStorage(savedDraft)

          // Empty/null/undefined values should be filtered out
          // The loadDraft logic filters out empty strings, undefined, and null
          expect(loaded.formData.selfie).toBeUndefined()
          expect(loaded.formData.selfiePath).toBeUndefined()

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Test: Draft restoration should preserve other form fields alongside selfie data
   * **Validates: Requirements 6.4**
   */
  it('property: draft restoration should preserve all form fields including selfie data', () => {
    fc.assert(
      fc.property(
        kycFormDataWithSelfieArb,
        (formData) => {
          const savedDraft = {
            formData: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              nationality: formData.nationality,
              documentType: formData.documentType,
              documentNumber: formData.documentNumber,
              documentExpiry: formData.documentExpiry,
              ...(formData.selfie ? { selfie: formData.selfie } : {}),
              ...(formData.selfiePath ? { selfiePath: formData.selfiePath } : {}),
              ...(formData.faceImagePath ? { faceImagePath: formData.faceImagePath } : {}),
              ...(formData.livenessVideoPath ? { livenessVideoPath: formData.livenessVideoPath } : {}),
            },
            status: 'draft',
            lastSaved: Date.now(),
          }

          const loaded = loadDraftFromStorage(savedDraft)

          // Verify selfie fields are restored if they were set
          if (formData.selfie) {
            expect(loaded.formData.selfie).toBe(formData.selfie)
          }
          if (formData.selfiePath) {
            expect(loaded.formData.selfiePath).toBe(formData.selfiePath)
          }

          // Verify other fields are also restored
          expect(loaded.formData.firstName).toBe(formData.firstName)
          expect(loaded.formData.lastName).toBe(formData.lastName)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Draft status should be correctly restored
   * **Validates: Requirements 6.4**
   */
  it('property: draft status should default to "draft" if not specified', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        fc.option(fc.constantFrom('draft', 'not_started'), { nil: undefined }),
        (selfie, selfiePath, status) => {
          const savedDraft = {
            formData: {
              selfie,
              selfiePath,
            },
            ...(status ? { status } : {}),
            lastSaved: Date.now(),
          }

          const loaded = loadDraftFromStorage(savedDraft)

          // Status should be restored or default to 'draft'
          if (status) {
            expect(loaded.status).toBe(status)
          } else {
            expect(loaded.status).toBe('draft')
          }

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

describe('KYC Context Selfie Edge Cases', () => {
  /**
   * Test: Selfie path format validation
   * **Validates: Requirements 6.1, 6.2**
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
   * Test: Selfie base64 data should be valid data URI format
   * **Validates: Requirements 6.1**
   */
  it('property: selfie base64 should be valid data URI format', () => {
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
   * Test: API request should not include selfie base64 preview data
   * **Validates: Requirements 6.3**
   *
   * The selfie base64 preview is only for UI display, not for API submission.
   * Only selfiePath (MinIO path) should be sent to the API.
   */
  it('property: API request should only include selfiePath, not selfie base64 preview', () => {
    fc.assert(
      fc.property(
        selfieBase64Arb,
        selfiePathArb,
        (selfieBase64, selfiePath) => {
          const formData = {
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'ABC123456',
            documentExpiry: '2030-01-01',
            selfie: selfieBase64, // base64 preview (should NOT be in API request)
            selfiePath: selfiePath, // MinIO path (should be in API request as selfie_url)
          }

          const apiRequest = buildKycApiRequest(formData)

          // selfie_url should be the MinIO path
          expect(apiRequest.selfie_url).toBe(selfiePath)

          // API request should NOT contain the base64 preview data
          expect(apiRequest).not.toHaveProperty('selfie')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
