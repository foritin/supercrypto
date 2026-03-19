/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 修复 OpenCV.js ESM 兼容性问题
 * 参考: https://github.com/TechStark/opencv-js/issues/44
 */
const fs = require('fs');
const path = require('path');

const opencvPath = path.join(__dirname, '../node_modules/@techstark/opencv-js/dist/opencv.js');

function patchOpencv() {
  if (!fs.existsSync(opencvPath)) {
    console.log('⏭️  OpenCV.js not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(opencvPath, 'utf8');
  
  // 检查是否已经打补丁
  if (content.includes('// PATCHED FOR ESM')) {
    console.log('⏭️  OpenCV.js already patched');
    return;
  }

  // 添加 ESM 兼容性修复
  const patch = `// PATCHED FOR ESM
if (typeof globalThis !== 'undefined' && typeof globalThis.Module === 'undefined') {
  globalThis.Module = {};
}
`;

  content = patch + content;
  fs.writeFileSync(opencvPath, content);
  console.log('✅ OpenCV.js patched for ESM compatibility');
}

patchOpencv();
