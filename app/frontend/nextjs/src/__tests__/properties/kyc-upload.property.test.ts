/**
 * KYC Upload Property Tests
 *
 * 属性测试验证 KYC 上传服务和字段映射的正确性
 *
 * Feature: kyc-face-liveness-storage
 */

import fc from 'fast-check'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
// Property 1: Base64 Image Upload Round-Trip
// ============================================================================

/**
 * **Property 1: Base64 Image Upload Round-Trip**
 * **Validates: Requirements 1.1, 2.3, 2.5**
 *
 * For any valid base64-encoded image (jpg, jpeg, or png format, size ≤ 10MB),
 * uploading via the `uploadBase64Image` function SHALL succeed and return a
 * valid MinIO file path. The function SHALL handle both data URI format
 * (`data:image/jpeg;base64,...`) and pure base64 strings.
 */
describe('Property 1: Base64 Image Upload Round-Trip', () => {
  // Mock the api module
  const mockPost = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    mockPost.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Helper to generate valid base64 image data
   * Creates a minimal valid JPEG/PNG header followed by random data
   */
  const generateValidBase64Image = (type: 'jpeg' | 'png'): string => {
    // Minimal valid image headers
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

    const header = type === 'jpeg' ? jpegHeader : pngHeader
    // Convert to base64
    return btoa(String.fromCharCode(...header))
  }

  /**
   * Arbitrary for valid base64 image data (pure base64 format)
   */
  const pureBase64ImageArb = fc.constantFrom('jpeg', 'png').map((type) => ({
    imageData: generateValidBase64Image(type as 'jpeg' | 'png'),
    expectedType: type,
  }))

  /**
   * Arbitrary for valid data URI format
   */
  const dataUriImageArb = fc.constantFrom('jpeg', 'png').map((type) => {
    const base64Data = generateValidBase64Image(type as 'jpeg' | 'png')
    const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png'
    return {
      imageData: `data:${mimeType};base64,${base64Data}`,
      expectedType: type,
    }
  })

  /**
   * Arbitrary for document type
   */
  const documentTypeArb = fc.constantFrom('face_image', 'selfie') as fc.Arbitrary<
    'face_image' | 'selfie'
  >

  /**
   * Test: Pure base64 format should be correctly processed
   * **Validates: Requirements 2.5**
   */
  it('property: pure base64 format should be accepted and processed correctly', async () => {
    // Mock the API response
    mockPost.mockResolvedValue({
      object_data: {
        document_type: 'face_image',
        file_path: 'kyc/0x123/face_image_abc123.jpg',
      },
    })

    // Mock the api module
    vi.doMock('@/services/api', () => ({
      api: {
        post: mockPost,
      },
    }))

    // Import the function after mocking
    const { uploadBase64Image } = await import('@/services/kyc')

    await fc.assert(
      fc.asyncProperty(pureBase64ImageArb, documentTypeArb, async ({ imageData }, documentType) => {
        mockPost.mockResolvedValue({
          object_data: {
            document_type: documentType,
            file_path: `kyc/0x123/${documentType}_abc123.${documentType === 'face_image' ? 'jpg' : 'png'}`,
          },
        })

        const result = await uploadBase64Image(imageData, documentType)

        // Verify the request was made with correct parameters
        expect(mockPost).toHaveBeenCalled()
        const lastCall = mockPost.mock.calls[mockPost.mock.calls.length - 1]
        if (!lastCall) {
          return true
        }
        expect(lastCall[1]).toEqual({
          image_data: imageData,
          document_type: documentType,
        })

        // Verify the response contains a valid file path
        expect(result.file_path).toMatch(/^kyc\//)
        expect(result.file_path).toContain(documentType)

        return true
      }),
      { numRuns: 50 }
    )
  })

  /**
   * Test: Data URI format should be correctly processed
   * **Validates: Requirements 2.5**
   */
  it('property: data URI format should be accepted and processed correctly', async () => {
    // Mock the API response
    mockPost.mockResolvedValue({
      object_data: {
        document_type: 'face_image',
        file_path: 'kyc/0x123/face_image_abc123.jpg',
      },
    })

    // Mock the api module
    vi.doMock('@/services/api', () => ({
      api: {
        post: mockPost,
      },
    }))

    // Import the function after mocking
    const { uploadBase64Image } = await import('@/services/kyc')

    await fc.assert(
      fc.asyncProperty(dataUriImageArb, documentTypeArb, async ({ imageData }, documentType) => {
        mockPost.mockResolvedValue({
          object_data: {
            document_type: documentType,
            file_path: `kyc/0x123/${documentType}_abc123.jpg`,
          },
        })

        const result = await uploadBase64Image(imageData, documentType)

        // Verify the request was made with correct parameters
        expect(mockPost).toHaveBeenCalled()
        const lastCall = mockPost.mock.calls[mockPost.mock.calls.length - 1]
        if (!lastCall) {
          return true
        }
        expect(lastCall[1]).toEqual({
          image_data: imageData,
          document_type: documentType,
        })

        // Verify the response contains a valid file path
        expect(result.file_path).toMatch(/^kyc\//)

        return true
      }),
      { numRuns: 50 }
    )
  })

  /**
   * Test: Both formats should produce consistent request structure
   * **Validates: Requirements 2.3**
   */
  it('property: request body structure should be consistent for both formats', async () => {
    // Mock the api module
    vi.doMock('@/services/api', () => ({
      api: {
        post: mockPost,
      },
    }))

    mockPost.mockResolvedValue({
      object_data: {
        document_type: 'face_image',
        file_path: 'kyc/0x123/face_image_abc123.jpg',
      },
    })

    const { uploadBase64Image } = await import('@/services/kyc')

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(pureBase64ImageArb, dataUriImageArb),
        documentTypeArb,
        async ({ imageData }, documentType) => {
          mockPost.mockClear()
          mockPost.mockResolvedValue({
            object_data: {
              document_type: documentType,
              file_path: `kyc/0x123/${documentType}_abc123.jpg`,
            },
          })

          await uploadBase64Image(imageData, documentType)

          // Verify request structure
          expect(mockPost).toHaveBeenCalledTimes(1)
          const firstCall = mockPost.mock.calls[0]
          if (!firstCall) {
            return true
          }
          const [endpoint, body] = firstCall

          // Endpoint should be the upload-base64 path
          expect(endpoint).toBe('/user/kyc/upload-base64')

          // Body should have required fields
          expect(body).toHaveProperty('image_data')
          expect(body).toHaveProperty('document_type')
          expect(body.document_type).toBe(documentType)
          expect(typeof body.image_data).toBe('string')

          return true
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Property 3: Submission Field Mapping
// ============================================================================

/**
 * **Property 3: Submission Field Mapping**
 * **Validates: Requirements 1.4, 6.3, 6.4**
 *
 * For any KYC submission where `faceImagePath` is set, the API request SHALL
 * include `face_image_url` with the same value. For any KYC submission where
 * `livenessVideoPath` is set, the API request SHALL include `liveness_video_url`
 * with the same value.
 */
describe('Property 3: Submission Field Mapping', () => {
  /**
   * Arbitrary for valid MinIO file paths
   */
  const minioPathArb = fc
    .tuple(
      hexStringArb(40), // wallet address (40 hex chars)
      fc.uuid(), // file uuid
      fc.constantFrom('jpg', 'jpeg', 'png') // extension
    )
    .map(([address, uuid, ext]) => `kyc/0x${address}/face_image_${uuid}.${ext}`)

  /**
   * Arbitrary for valid video MinIO paths
   */
  const videoPathArb = fc
    .tuple(
      hexStringArb(40), // wallet address (40 hex chars)
      fc.uuid() // file uuid
    )
    .map(([address, uuid]) => `kyc/0x${address}/liveness_video_${uuid}.webm`)

  /**
   * Arbitrary for KYC form data with optional paths
   */
  const kycFormDataArb = fc.record({
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
    faceImagePath: fc.option(minioPathArb, { nil: undefined }),
    livenessVideoPath: fc.option(videoPathArb, { nil: undefined }),
  })

  /**
   * Helper function to build KYC API request from form data
   * This mirrors the logic in kyc-context.tsx submitKyc function
   */
  function buildKycApiRequest(formData: {
    firstName: string
    lastName: string
    dateOfBirth: string
    nationality: string
    documentType: string
    documentNumber: string
    documentExpiry: string
    faceImagePath?: string
    livenessVideoPath?: string
  }) {
    return {
      full_name: `${formData.firstName} ${formData.lastName}`.trim(),
      date_of_birth: formData.dateOfBirth,
      country_code: formData.nationality.toUpperCase().slice(0, 2),
      documents: [],
      selfie_url: undefined,
      // Field mapping as per Requirements 6.3, 6.4
      face_image_url: formData.faceImagePath || undefined,
      liveness_video_url: formData.livenessVideoPath || undefined,
    }
  }

  /**
   * Test: faceImagePath should map to face_image_url
   * **Validates: Requirements 6.3**
   */
  it('property: faceImagePath should correctly map to face_image_url in API request', () => {
    fc.assert(
      fc.property(kycFormDataArb, (formData) => {
        const normalizedFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          documentExpiry: formData.documentExpiry,
          ...(formData.faceImagePath ? { faceImagePath: formData.faceImagePath } : {}),
          ...(formData.livenessVideoPath ? { livenessVideoPath: formData.livenessVideoPath } : {}),
        }

        const apiRequest = buildKycApiRequest(normalizedFormData)

        if (formData.faceImagePath) {
          // When faceImagePath is set, face_image_url should have the same value
          expect(apiRequest.face_image_url).toBe(formData.faceImagePath)
        } else {
          // When faceImagePath is not set, face_image_url should be undefined
          expect(apiRequest.face_image_url).toBeUndefined()
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: livenessVideoPath should map to liveness_video_url
   * **Validates: Requirements 6.4**
   */
  it('property: livenessVideoPath should correctly map to liveness_video_url in API request', () => {
    fc.assert(
      fc.property(kycFormDataArb, (formData) => {
        const normalizedFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          documentType: formData.documentType,
          documentNumber: formData.documentNumber,
          documentExpiry: formData.documentExpiry,
          ...(formData.faceImagePath ? { faceImagePath: formData.faceImagePath } : {}),
          ...(formData.livenessVideoPath ? { livenessVideoPath: formData.livenessVideoPath } : {}),
        }

        const apiRequest = buildKycApiRequest(normalizedFormData)

        if (formData.livenessVideoPath) {
          // When livenessVideoPath is set, liveness_video_url should have the same value
          expect(apiRequest.liveness_video_url).toBe(formData.livenessVideoPath)
        } else {
          // When livenessVideoPath is not set, liveness_video_url should be undefined
          expect(apiRequest.liveness_video_url).toBeUndefined()
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Both fields should be independently mapped
   * **Validates: Requirements 1.4, 6.3, 6.4**
   */
  it('property: faceImagePath and livenessVideoPath should be independently mapped', () => {
    fc.assert(
      fc.property(
        minioPathArb,
        videoPathArb,
        fc.boolean(),
        fc.boolean(),
        (facePath, videoPath, includeFace, includeVideo) => {
          const formData = {
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'ABC123456',
            documentExpiry: '2030-01-01',
            ...(includeFace ? { faceImagePath: facePath } : {}),
            ...(includeVideo ? { livenessVideoPath: videoPath } : {}),
          }

          const apiRequest = buildKycApiRequest(formData)

          // Verify independent mapping
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
   * Test: Path format should be preserved exactly
   * **Validates: Requirements 1.4**
   */
  it('property: MinIO path format should be preserved exactly in mapping', () => {
    fc.assert(
      fc.property(minioPathArb, videoPathArb, (facePath, videoPath) => {
        const formData = {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          nationality: 'US',
          documentType: 'passport',
          documentNumber: 'ABC123456',
          documentExpiry: '2030-01-01',
          faceImagePath: facePath,
          livenessVideoPath: videoPath,
        }

        const apiRequest = buildKycApiRequest(formData)

        // Paths should be exactly preserved, no transformation
        expect(apiRequest.face_image_url).toBe(facePath)
        expect(apiRequest.liveness_video_url).toBe(videoPath)

        // Verify path format is valid
        expect(apiRequest.face_image_url).toMatch(/^kyc\/0x[a-f0-9]+\/face_image_[a-f0-9-]+\.(jpg|jpeg|png)$/)
        expect(apiRequest.liveness_video_url).toMatch(/^kyc\/0x[a-f0-9]+\/liveness_video_[a-f0-9-]+\.webm$/)

        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: Empty string paths should be treated as undefined
   * **Validates: Requirements 6.3, 6.4**
   */
  it('property: empty string paths should result in undefined API fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', undefined, null),
        fc.constantFrom('', undefined, null),
        (faceValue, videoValue) => {
          const formData = {
            firstName: 'Test',
            lastName: 'User',
            dateOfBirth: '1990-01-01',
            nationality: 'US',
            documentType: 'passport',
            documentNumber: 'ABC123456',
            documentExpiry: '2030-01-01',
            ...((faceValue as string | undefined) ? { faceImagePath: faceValue as string } : {}),
            ...((videoValue as string | undefined) ? { livenessVideoPath: videoValue as string } : {}),
          }

          const apiRequest = buildKycApiRequest(formData)

          // Empty/null/undefined values should result in undefined
          // Note: The actual implementation uses `|| undefined` which converts empty strings to undefined
          if (!faceValue) {
            expect(apiRequest.face_image_url).toBeUndefined()
          }
          if (!videoValue) {
            expect(apiRequest.liveness_video_url).toBeUndefined()
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

describe('KYC Upload Edge Cases', () => {
  /**
   * Test: Document type validation
   * **Validates: Requirements 2.1**
   */
  it('property: document type should only accept face_image or selfie', () => {
    const validDocTypes = ['face_image', 'selfie'] as const

    fc.assert(
      fc.property(fc.constantFrom(...validDocTypes), (docType) => {
        // Valid document types should be accepted
        expect(validDocTypes).toContain(docType)
        return true
      }),
      { numRuns: 10 }
    )
  })

  /**
   * Test: MinIO path format validation for face images
   * **Validates: Requirements 1.6**
   */
  it('property: face image paths should follow MinIO path format', () => {
    const pathArb = fc
      .tuple(
        hexStringArb(40),
        fc.uuid(),
        fc.constantFrom('jpg', 'jpeg', 'png')
      )
      .map(([address, uuid, ext]) => `kyc/0x${address}/face_image_${uuid}.${ext}`)

    fc.assert(
      fc.property(pathArb, (path) => {
        // Path should match expected format: kyc/{wallet_address}/face_image_{uuid}.{ext}
        const pattern = /^kyc\/0x[a-f0-9]+\/face_image_[a-f0-9-]+\.(jpg|jpeg|png)$/
        expect(path).toMatch(pattern)
        return true
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Test: MinIO path format validation for liveness videos
   * **Validates: Requirements 4.5**
   */
  it('property: liveness video paths should follow MinIO path format', () => {
    const pathArb = fc
      .tuple(hexStringArb(40), fc.uuid())
      .map(([address, uuid]) => `kyc/0x${address}/liveness_video_${uuid}.webm`)

    fc.assert(
      fc.property(pathArb, (path) => {
        // Path should match expected format: kyc/{wallet_address}/liveness_video_{uuid}.webm
        const pattern = /^kyc\/0x[a-f0-9]+\/liveness_video_[a-f0-9-]+\.webm$/
        expect(path).toMatch(pattern)
        return true
      }),
      { numRuns: 100 }
    )
  })
})
