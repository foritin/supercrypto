/**
 * Property 1: 缩放值范围不变量
 *
 * For any sequence of zoom operations (zoom in +0.25 or zoom out -0.25),
 * the ImageViewerModal's zoom value SHALL always remain within [0.5, 4.0].
 *
 * ∀ ops ∈ ZoomOperationSequence:
 *   applyZoomSequence(initialZoom=1, ops) ∈ [0.5, 4.0]
 *
 * **Validates: Requirements 4.1**
 *
 * Requirements:
 * - 4.1: ImageViewerModal 保留缩放（0.5x-4x）功能
 *
 * Note: This test extracts the pure zoom clamping logic from the component
 * and verifies it with fast-check without rendering React components.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Pure function that simulates the zoom logic from ImageViewerModal
// Zoom out: setZoom((z) => Math.max(0.5, z - 0.25))
// Zoom in:  setZoom((z) => Math.min(4, z + 0.25))
type ZoomOperation = 'in' | 'out';

function applyZoom(currentZoom: number, operation: ZoomOperation): number {
  if (operation === 'in') {
    return Math.min(4, currentZoom + 0.25);
  } else {
    return Math.max(0.5, currentZoom - 0.25);
  }
}

function applyZoomSequence(initialZoom: number, operations: ZoomOperation[]): number {
  return operations.reduce((zoom, op) => applyZoom(zoom, op), initialZoom);
}

// Generators
const zoomOperationArb: fc.Arbitrary<ZoomOperation> = fc.constantFrom('in', 'out');

const zoomOperationSequenceArb: fc.Arbitrary<ZoomOperation[]> = fc.array(zoomOperationArb, {
  minLength: 1,
  maxLength: 200,
});

// Feature: sheet-modal-dismiss-fix, Property 1: 缩放值范围不变量
describe('Property 1: 缩放值范围不变量', () => {
  /**
   * **Validates: Requirements 4.1**
   * 属性: 对于任意缩放操作序列，zoom 值始终在 [0.5, 4.0] 范围内
   */
  it('property: zoom value always stays within [0.5, 4.0] after any sequence of operations', () => {
    fc.assert(
      fc.property(zoomOperationSequenceArb, (operations) => {
        const INITIAL_ZOOM = 1;
        let zoom = INITIAL_ZOOM;

        for (const op of operations) {
          zoom = applyZoom(zoom, op);
          // Check invariant after every single operation
          expect(zoom).toBeGreaterThanOrEqual(0.5);
          expect(zoom).toBeLessThanOrEqual(4.0);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   * 属性: 从任意有效初始缩放值开始，zoom 值始终在 [0.5, 4.0] 范围内
   */
  it('property: zoom stays in range regardless of starting value within [0.5, 4.0]', () => {
    // Generate initial zoom values that are valid multiples of 0.25 within [0.5, 4.0]
    const validInitialZoomArb = fc
      .integer({ min: 2, max: 16 }) // 2*0.25=0.5 to 16*0.25=4.0
      .map((n) => n * 0.25);

    fc.assert(
      fc.property(validInitialZoomArb, zoomOperationSequenceArb, (initialZoom, operations) => {
        const finalZoom = applyZoomSequence(initialZoom, operations);
        expect(finalZoom).toBeGreaterThanOrEqual(0.5);
        expect(finalZoom).toBeLessThanOrEqual(4.0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   * 属性: 连续缩小操作不会使 zoom 低于 0.5（下界保护）
   */
  it('property: repeated zoom-out never goes below 0.5', () => {
    const manyZoomOutsArb = fc
      .integer({ min: 1, max: 100 })
      .map((n) => Array.from({ length: n }, (): ZoomOperation => 'out'));

    fc.assert(
      fc.property(manyZoomOutsArb, (operations) => {
        const finalZoom = applyZoomSequence(1, operations);
        expect(finalZoom).toBeGreaterThanOrEqual(0.5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.1**
   * 属性: 连续放大操作不会使 zoom 超过 4.0（上界保护）
   */
  it('property: repeated zoom-in never exceeds 4.0', () => {
    const manyZoomInsArb = fc
      .integer({ min: 1, max: 100 })
      .map((n) => Array.from({ length: n }, (): ZoomOperation => 'in'));

    fc.assert(
      fc.property(manyZoomInsArb, (operations) => {
        const finalZoom = applyZoomSequence(1, operations);
        expect(finalZoom).toBeLessThanOrEqual(4.0);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 2: 图片导航索引不变量
 *
 * For any image list (length >= 1) and any sequence of navigation operations
 * (prev / next), the currentIndex SHALL always remain within [0, images.length - 1],
 * and navigation SHALL wrap circularly (last → first, first → last).
 *
 * ∀ listLen ∈ [1, ∞), ∀ ops ∈ NavigationSequence:
 *   applyNavigation(initialIndex, listLen, ops) ∈ [0, listLen - 1]
 *
 * **Validates: Requirements 4.3**
 *
 * Requirements:
 * - 4.3: ImageViewerModal 保留图片切换导航功能
 *
 * Note: This test extracts the pure circular navigation logic from the component
 * and verifies it with fast-check without rendering React components.
 *
 * Source logic from enhanced-document-tab.tsx:
 *   handlePrev: setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
 *   handleNext: setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
 */

// Feature: sheet-modal-dismiss-fix, Property 2: 图片导航索引不变量
describe('Property 2: 图片导航索引不变量', () => {
  // Pure function that simulates the navigation logic from ImageViewerModal
  type NavOperation = 'prev' | 'next';

  function navigate(currentIndex: number, listLength: number, operation: NavOperation): number {
    if (operation === 'prev') {
      return currentIndex > 0 ? currentIndex - 1 : listLength - 1;
    } else {
      return currentIndex < listLength - 1 ? currentIndex + 1 : 0;
    }
  }

  function applyNavigationSequence(
    initialIndex: number,
    listLength: number,
    operations: NavOperation[],
  ): number {
    return operations.reduce((index, op) => navigate(index, listLength, op), initialIndex);
  }

  // Generators
  const navOperationArb: fc.Arbitrary<NavOperation> = fc.constantFrom('prev', 'next');

  const navOperationSequenceArb: fc.Arbitrary<NavOperation[]> = fc.array(navOperationArb, {
    minLength: 1,
    maxLength: 200,
  });

  // Image list length >= 1 (must have at least one image)
  const listLengthArb = fc.integer({ min: 1, max: 50 });

  /**
   * **Validates: Requirements 4.3**
   * 属性: 对于任意导航操作序列，currentIndex 始终在 [0, images.length - 1] 范围内
   */
  it('property: currentIndex always stays within [0, images.length - 1] after any navigation sequence', () => {
    fc.assert(
      fc.property(listLengthArb, navOperationSequenceArb, (listLength, operations) => {
        const initialIndex = 0;
        let currentIndex = initialIndex;

        for (const op of operations) {
          currentIndex = navigate(currentIndex, listLength, op);
          // Check invariant after every single operation
          expect(currentIndex).toBeGreaterThanOrEqual(0);
          expect(currentIndex).toBeLessThan(listLength);
          // Also verify it's an integer
          expect(Number.isInteger(currentIndex)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   * 属性: 从任意有效初始索引开始，currentIndex 始终在有效范围内
   */
  it('property: currentIndex stays in range regardless of starting index', () => {
    fc.assert(
      fc.property(
        listLengthArb.chain((len) =>
          fc.tuple(
            fc.constant(len),
            fc.integer({ min: 0, max: len - 1 }), // valid initial index
            navOperationSequenceArb,
          ),
        ),
        ([listLength, initialIndex, operations]) => {
          const finalIndex = applyNavigationSequence(initialIndex, listLength, operations);
          expect(finalIndex).toBeGreaterThanOrEqual(0);
          expect(finalIndex).toBeLessThan(listLength);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   * 属性: 'next' 操作在最后一张图片时循环到第一张（索引 0）
   */
  it('property: next at last index wraps to 0', () => {
    fc.assert(
      fc.property(listLengthArb, (listLength) => {
        const lastIndex = listLength - 1;
        const result = navigate(lastIndex, listLength, 'next');
        expect(result).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   * 属性: 'prev' 操作在第一张图片时循环到最后一张
   */
  it('property: prev at index 0 wraps to last index', () => {
    fc.assert(
      fc.property(listLengthArb, (listLength) => {
        const result = navigate(0, listLength, 'prev');
        expect(result).toBe(listLength - 1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   * 属性: N 次 'next' 操作后回到起点（完整循环）
   */
  it('property: navigating next N times (where N = list length) returns to start', () => {
    fc.assert(
      fc.property(
        listLengthArb.chain((len) =>
          fc.tuple(
            fc.constant(len),
            fc.integer({ min: 0, max: len - 1 }),
          ),
        ),
        ([listLength, startIndex]) => {
          const fullCycleOps: NavOperation[] = Array.from({ length: listLength }, () => 'next');
          const result = applyNavigationSequence(startIndex, listLength, fullCycleOps);
          expect(result).toBe(startIndex);
        },
      ),
      { numRuns: 100 },
    );
  });
});
