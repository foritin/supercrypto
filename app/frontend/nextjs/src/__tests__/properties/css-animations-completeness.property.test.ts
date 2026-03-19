/**
 * Property Test: 动画定义完整性
 * Feature: css-refactoring
 * Property 2: 动画定义完整性
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
 * 
 * For any 重构后的 animations.css 文件，该文件应包含所有 @keyframes 定义
 * 和对应的动画工具类。
 */

import * as fs from 'fs';
import * as path from 'path';

import * as fc from 'fast-check';
import { describe, test, expect } from 'vitest';

// 读取 animations.css 文件内容
const animationsPath = path.join(__dirname, '../../styles/animations.css');
const animationsContent = fs.existsSync(animationsPath) 
  ? fs.readFileSync(animationsPath, 'utf-8') 
  : '';

describe('Feature: css-refactoring, Property 2: 动画定义完整性', () => {
  // 必需的 @keyframes 定义
  const keyframeAnimations = [
    'fadeInUp',
    'cardFadeInUp',
    'glow',
    'pulse',
    'float',
    'shimmer',
    'buttonBreathe',
    'buttonPulse',
    'neonBreathe',
    'neonPulse',
    'skeleton-shimmer',
    'spin',
    'pulse-glow',
    'fadeInUpStagger',
  ];

  // 必需的动画工具类
  const animationUtilityClasses = [
    '.animate-glow',
    '.animate-pulse',
    '.animate-float',
    '.animate-float-delayed',
    '.fade-in-up',
    '.fade-in-stagger',
    '.stagger-fade-in',
  ];

  // 必需的滚动触发动画类
  const scrollRevealClasses = [
    '.scroll-reveal',
    '.scroll-reveal-left',
    '.scroll-reveal-right',
    '.scroll-reveal-scale',
  ];

  test('Property: @keyframes 动画定义完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...keyframeAnimations),
        (animation) => {
          const pattern = new RegExp(`@keyframes\\s+${animation}\\s*\\{`);
          expect(animationsContent).toMatch(pattern);
          return pattern.test(animationsContent);
        }
      ),
      { numRuns: keyframeAnimations.length }
    );
  });

  test('Property: 动画工具类完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...animationUtilityClasses),
        (className) => {
          expect(animationsContent).toContain(className);
          return animationsContent.includes(className);
        }
      ),
      { numRuns: animationUtilityClasses.length }
    );
  });

  test('Property: 滚动触发动画类完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...scrollRevealClasses),
        (className) => {
          expect(animationsContent).toContain(className);
          return animationsContent.includes(className);
        }
      ),
      { numRuns: scrollRevealClasses.length }
    );
  });

  test('Property: 错落淡入动画包含延迟设置', () => {
    // 验证 stagger 动画包含多个 nth-child 延迟
    expect(animationsContent).toContain('nth-child(1)');
    expect(animationsContent).toContain('nth-child(2)');
    expect(animationsContent).toContain('nth-child(3)');
    expect(animationsContent).toContain('animation-delay');
  });

  test('Property: 滚动动画包含 is-visible 状态', () => {
    expect(animationsContent).toContain('.is-visible');
  });
});
