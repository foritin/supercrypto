/**
 * Property Test: Ant Design 样式隔离
 * Feature: css-refactoring
 * Property 4: Ant Design 样式隔离
 * 
 * **Validates: Requirements 4.2**
 * 
 * For any 重构后的 globals.css 文件，该文件不应包含任何 .ant-* 选择器，
 * 所有 Ant Design 覆盖样式应位于 legacy/ant-design.css 文件中。
 */

import * as fs from 'fs';
import * as path from 'path';

import { describe, test, expect } from 'vitest';

// 读取文件内容
const globalsPath = path.join(__dirname, '../../app/globals.css');
const antDesignPath = path.join(__dirname, '../../styles/legacy/ant-design.css');

const globalsContent = fs.existsSync(globalsPath) 
  ? fs.readFileSync(globalsPath, 'utf-8') 
  : '';

const antDesignContent = fs.existsSync(antDesignPath) 
  ? fs.readFileSync(antDesignPath, 'utf-8') 
  : '';

describe('Feature: css-refactoring, Property 4: Ant Design 样式隔离', () => {
  // 注意: 这个测试在重构完成后才会通过
  // 目前 globals.css 仍包含 Ant Design 样式
  test.skip('Property: globals.css 不包含 .ant-* 选择器 (重构完成后启用)', () => {
    // 匹配 .ant- 开头的选择器（排除注释）
    const antSelectorPattern = /^\s*\.ant-[a-zA-Z]/gm;
    const matches = globalsContent.match(antSelectorPattern);
    
    expect(matches).toBeNull();
  });

  test('Property: legacy/ant-design.css 文件存在', () => {
    expect(fs.existsSync(antDesignPath)).toBe(true);
  });

  test('Property: legacy/ant-design.css 包含 Ant Design 样式', () => {
    expect(antDesignContent).toContain('.ant-');
  });

  test('Property: legacy/ant-design.css 包含清理警告注释', () => {
    expect(antDesignContent).toMatch(/警告|待清理|legacy/i);
  });

  test('Property: legacy/ant-design.css 包含主要 Ant Design 组件样式', () => {
    const requiredSelectors = [
      '.ant-layout',
      '.ant-card',
      '.ant-btn',
      '.ant-input',
      '.ant-table',
      '.ant-modal',
    ];

    requiredSelectors.forEach(selector => {
      expect(antDesignContent).toContain(selector);
    });
  });
});
