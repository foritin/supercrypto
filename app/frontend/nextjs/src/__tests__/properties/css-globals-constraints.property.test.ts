/**
 * Property Test: globals.css 内容约束
 * Feature: css-refactoring
 * Property 5: globals.css 内容约束
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 * 
 * For any 重构后的 globals.css 文件，该文件应只包含以下内容类型：
 * - Tailwind 导入语句
 * - 样式模块导入语句
 * - Tailwind 自定义变体定义
 * - @theme inline 配置
 * - @layer base 基础配置
 */

import * as fs from 'fs';
import * as path from 'path';

import { describe, test, expect } from 'vitest';

// 读取新的 globals.css 文件（重构后的版本）
const globalsNewPath = path.join(__dirname, '../../app/globals.css');
const globalsNewContent = fs.existsSync(globalsNewPath) 
  ? fs.readFileSync(globalsNewPath, 'utf-8') 
  : '';

describe('Feature: css-refactoring, Property 5: globals.css 内容约束', () => {
  test('Property: 包含 Tailwind 导入语句', () => {
    expect(globalsNewContent).toContain('@import "tailwindcss"');
  });

  test('Property: 包含 tailwindcss-animate 插件', () => {
    expect(globalsNewContent).toContain('@plugin "tailwindcss-animate"');
  });

  test('Property: 包含样式模块导入语句', () => {
    expect(globalsNewContent).toContain('@import "../styles/variables.css"');
    expect(globalsNewContent).toContain('@import "../styles/animations.css"');
    expect(globalsNewContent).toContain('@import "../styles/base.css"');
  });

  test('Property: 包含 Tailwind 自定义变体定义', () => {
    expect(globalsNewContent).toContain('@custom-variant dark');
  });

  test('Property: 包含 @theme inline 配置', () => {
    expect(globalsNewContent).toContain('@theme inline');
  });

  test('Property: 包含 @layer base 基础配置', () => {
    expect(globalsNewContent).toContain('@layer base');
  });

  test('Property: 文件行数不超过 120 行', () => {
    const lineCount = globalsNewContent.split('\n').length;
    expect(lineCount).toBeLessThanOrEqual(120);
  });

  test('Property: 不包含直接的样式定义（除了 @layer 和 @theme）', () => {
    // 验证文件只包含允许的内容类型
    // 允许的内容：注释、@import、@plugin、@custom-variant、@theme inline、@layer base
    
    const lines = globalsNewContent.split('\n');
    let inThemeBlock = false;
    let inLayerBlock = false;
    let inMultiLineComment = false;
    let braceCount = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 空行
      if (trimmedLine === '') {
        continue;
      }
      
      // 多行注释开始
      if (trimmedLine.startsWith('/*')) {
        inMultiLineComment = true;
        if (trimmedLine.endsWith('*/')) {
          inMultiLineComment = false;
        }
        continue;
      }
      
      // 多行注释结束
      if (inMultiLineComment) {
        if (trimmedLine.endsWith('*/') || trimmedLine.includes('*/')) {
          inMultiLineComment = false;
        }
        continue;
      }
      
      // 单行注释
      if (trimmedLine.startsWith('//')) {
        continue;
      }
      
      // @import 语句
      if (trimmedLine.startsWith('@import')) {
        continue;
      }
      
      // @plugin 语句
      if (trimmedLine.startsWith('@plugin')) {
        continue;
      }
      
      // @custom-variant 语句
      if (trimmedLine.startsWith('@custom-variant')) {
        continue;
      }
      
      // @theme inline 块开始
      if (trimmedLine.startsWith('@theme inline')) {
        inThemeBlock = true;
        braceCount = (trimmedLine.match(/\{/g) || []).length - (trimmedLine.match(/\}/g) || []).length;
        continue;
      }
      
      // @layer base 块开始
      if (trimmedLine.startsWith('@layer base')) {
        inLayerBlock = true;
        braceCount = (trimmedLine.match(/\{/g) || []).length - (trimmedLine.match(/\}/g) || []).length;
        continue;
      }
      
      // 在 @theme 或 @layer 块内
      if (inThemeBlock || inLayerBlock) {
        braceCount += (trimmedLine.match(/\{/g) || []).length;
        braceCount -= (trimmedLine.match(/\}/g) || []).length;
        
        if (braceCount <= 0) {
          inThemeBlock = false;
          inLayerBlock = false;
          braceCount = 0;
        }
        continue;
      }
      
      // 如果到这里，说明有不允许的内容
      throw new Error(`不允许的内容: "${trimmedLine}"`);
    }
    
    // 如果没有抛出错误，测试通过
    expect(true).toBe(true);
  });
});
