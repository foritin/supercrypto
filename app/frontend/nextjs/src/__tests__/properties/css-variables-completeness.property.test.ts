/**
 * Property Test: CSS 变量完整性
 * Feature: css-refactoring
 * Property 1: CSS 变量完整性
 * 
 * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 * 
 * For any 重构后的 variables.css 文件，该文件应包含所有必需的变量类别：
 * - 颜色系统变量（--color-primary 等）
 * - 间距系统变量（--spacing-xs 等）
 * - 圆角系统变量（--radius-sm 等）
 * - 过渡动画变量（--transition-fast 等）
 * - Header 布局变量
 * - shadcn/ui HSL 格式变量
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// 读取 variables.css 文件内容
const variablesPath = path.join(__dirname, '../../styles/variables.css');
const variablesContent = fs.existsSync(variablesPath) 
  ? fs.readFileSync(variablesPath, 'utf-8') 
  : '';

describe('Feature: css-refactoring, Property 1: CSS 变量完整性', () => {
  // 必需的颜色系统变量
  const colorVariables = [
    '--color-primary',
    '--color-primary-light',
    '--color-primary-dark',
    '--color-primary-glow',
    '--color-gold',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-info',
  ];

  // 必需的间距系统变量
  const spacingVariables = [
    '--spacing-xs',
    '--spacing-sm',
    '--spacing-md',
    '--spacing-lg',
    '--spacing-xl',
    '--spacing-2xl',
    '--spacing-3xl',
  ];

  // 必需的圆角系统变量
  const radiusVariables = [
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-xl',
    '--radius-2xl',
    '--radius-3xl',
  ];

  // 必需的过渡动画变量
  const transitionVariables = [
    '--transition-fast',
    '--transition-normal',
    '--transition-slow',
    '--transition-bounce',
  ];

  // 必需的 Header 布局变量
  const headerVariables = [
    '--header-height',
    '--header-padding-x',
    '--logo-size',
    '--menu-font-size',
  ];

  // 必需的 shadcn/ui HSL 格式变量
  const shadcnVariables = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--muted',
    '--accent',
    '--destructive',
    '--border',
    '--input',
    '--ring',
  ];

  test('Property: 颜色系统变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...colorVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: colorVariables.length }
    );
  });

  test('Property: 间距系统变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...spacingVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: spacingVariables.length }
    );
  });

  test('Property: 圆角系统变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...radiusVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: radiusVariables.length }
    );
  });

  test('Property: 过渡动画变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...transitionVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: transitionVariables.length }
    );
  });

  test('Property: Header 布局变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...headerVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: headerVariables.length }
    );
  });

  test('Property: shadcn/ui HSL 格式变量完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...shadcnVariables),
        (variable) => {
          expect(variablesContent).toContain(variable);
          return variablesContent.includes(variable);
        }
      ),
      { numRuns: shadcnVariables.length }
    );
  });

  test('Property: 包含 dark 模式变量', () => {
    expect(variablesContent).toContain('.dark');
    expect(variablesContent).toContain('--bg-dark');
    expect(variablesContent).toContain('--bg-card');
    expect(variablesContent).toContain('--text-primary');
  });

  test('Property: 包含 light 模式变量', () => {
    expect(variablesContent).toContain('.light');
  });

  test('Property: 包含响应式断点变量覆盖', () => {
    expect(variablesContent).toContain('@media');
    expect(variablesContent).toMatch(/max-width:\s*768px/);
  });
});
