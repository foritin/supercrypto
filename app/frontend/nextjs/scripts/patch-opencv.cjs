/**
 * 修复 OpenCV.js ESM 兼容性问题
 * 参考: https://github.com/TechStark/opencv-js/issues/44
 */
const fs = require('fs');
const path = require('path');

const opencvPath = path.join(__dirname, '../node_modules/@techstark/opencv-js/dist/opencv.js');

function patchOpenCV() {
  console.log('🔧 Patching OpenCV.js for ESM compatibility...');
  
  if (!fs.existsSync(opencvPath)) {
    console.warn('⚠️  OpenCV.js not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(opencvPath, 'utf8');
  
  // 检查是否已经 patch 过
  if (content.includes('// ESM_PATCHED')) {
    console.log('✅ OpenCV.js already patched');
    return;
  }

  // 修复 UMD 模块导出问题
  // 原始代码: if(typeof exports==="object"&&typeof module==="object")module.exports=factory();
  // 修复后: 添加 ESM 兼容性检查
  
  const originalPattern = /if\s*\(\s*typeof\s+exports\s*===?\s*["']object["']\s*&&\s*typeof\s+module\s*===?\s*["']object["']\s*\)/;
  
  if (originalPattern.test(content)) {
    content = content.replace(
      originalPattern,
      'if(typeof exports==="object"&&typeof module==="object"&&typeof module.exports!=="undefined")'
    );
    
    // 添加标记
    content = '// ESM_PATCHED\n' + content;
    
    fs.writeFileSync(opencvPath, content, 'utf8');
    console.log('✅ OpenCV.js patched successfully');
  } else {
    console.log('⚠️  OpenCV.js pattern not found, may already be compatible');
  }
}

patchOpenCV();
