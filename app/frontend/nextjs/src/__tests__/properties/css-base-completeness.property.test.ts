/**
 * Property Test: 基础样式完整性
 * Feature: css-refactoring
 * Property 3: 基础样式完整性
 * 
 * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
 * 
 * For any 重构后的 base.css 文件，该文件应包含全局重置样式、
 * 滚动条样式、选中文本样式和焦点可见样式。
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// 读取 base.css 文件内容
const basePath = path.join(__dirname, '../../styles/base.css');
const baseContent = fs.existsSync(basePath) 
  ? fs.readFileSync(basePath, 'utf-8') 
  : '';

describe('Feature: css-refactoring, Property 3: 基础样式完整性', () => {
  // 必需的全局重置选择器
  const globalResetSelectors = [
    '*',
    'html',
    'body',
  ];

  // 必需的滚动条样式选择器
  const scrollbarSelectors = [
    '::-webkit-scrollbar',
    '::-webkit-scrollbar-track',
    '::-webkit-scrollbar-thumb',
  ];

  test('Property: 全局重置样式完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...globalResetSelectors),
        (selector) => {
          // 检查选择器是否存在（作为独立选择器或在规则中）
          const pattern = new RegExp(`(^|[\\s,{])${selector.replace('*', '\\*')}\\s*[{,]`, 'm');
          const exists = pattern.test(baseContent) || baseContent.includes(`${selector} {`);
          expect(exists).toBe(true);
          return exists;
        }
      ),
      { numRuns: globalResetSelectors.length }
    );
  });

  test('Property: 滚动条样式完整性', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...scrollbarSelectors),
        (selector) => {
          expect(baseContent).toContain(selector);
          return baseContent.includes(selector);
        }
      ),
      { numRuns: scrollbarSelectors.length }
    );
  });

  test('Property: 选中文本样式存在', () => {
    expect(baseContent).toContain('::selection');
  });

  test('Property: 焦点可见样式存在', () => {
    expect(baseContent).toContain(':focus-visible');
  });

  test('Property: 字体渲染优化样式存在', () => {
    expect(baseContent).toContain('-webkit-font-smoothing');
    expect(baseContent).toContain('-moz-osx-font-smoothing');
  });

  test('Property: body 包含基础样式', () => {
    expect(baseContent).toContain('font-family');
    expect(baseContent).toContain('background');
    expect(baseContent).toContain('color');
  });
});
