/**
 * Property Test: 无障碍样式保留
 * Feature: css-refactoring
 * Property 7: 无障碍样式保留
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 * 
 * For any 重构后的样式文件集合，应保留所有无障碍相关样式：
 * - prefers-reduced-motion 媒体查询
 * - prefers-contrast: high 媒体查询
 * - :focus-visible 样式
 * - @media print 打印样式
 */

import * as fs from 'fs';
import * as path from 'path';

import { describe, test, expect } from 'vitest';

// 读取所有样式文件
const stylesDir = path.join(__dirname, '../../styles');
const globalsPath = path.join(__dirname, '../../app/globals.css');

function readAllStyleFiles(): string {
  let content = '';
  
  // 读取 globals.css
  if (fs.existsSync(globalsPath)) {
    content += fs.readFileSync(globalsPath, 'utf-8');
  }
  
  // 读取 styles 目录下的所有 CSS 文件
  if (fs.existsSync(stylesDir)) {
    const files = fs.readdirSync(stylesDir, { recursive: true });
    files.forEach(file => {
      const filePath = path.join(stylesDir, file.toString());
      if (filePath.endsWith('.css') && fs.statSync(filePath).isFile()) {
        content += fs.readFileSync(filePath, 'utf-8');
      }
    });
  }
  
  return content;
}

const allStylesContent = readAllStyleFiles();

describe('Feature: css-refactoring, Property 7: 无障碍样式保留', () => {
  test('Property: 包含 prefers-reduced-motion 媒体查询', () => {
    expect(allStylesContent).toContain('prefers-reduced-motion');
  });

  test('Property: 包含 prefers-contrast: high 媒体查询', () => {
    expect(allStylesContent).toContain('prefers-contrast');
  });

  test('Property: 包含 :focus-visible 样式', () => {
    expect(allStylesContent).toContain(':focus-visible');
  });

  test('Property: 包含 @media print 打印样式', () => {
    expect(allStylesContent).toContain('@media print');
  });

  test('Property: prefers-reduced-motion 禁用动画', () => {
    // 验证 reduce motion 媒体查询包含动画禁用逻辑
    const reduceMotionPattern = /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/;
    expect(allStylesContent).toMatch(reduceMotionPattern);
    
    // 验证包含 animation-duration 或 animation: none 的禁用
    expect(allStylesContent).toMatch(/animation-duration|animation:\s*none/);
  });

  test('Property: focus-visible 有明显的视觉指示', () => {
    // 验证 focus-visible 包含 outline 样式
    expect(allStylesContent).toMatch(/:focus-visible[\s\S]*?outline/);
  });
});
