/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 复制 Human.js 模型文件到 public 目录
 * 用于本地部署模型文件，提升加载速度
 */
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../node_modules/@vladmandic/human/models');
const targetDir = path.join(__dirname, '../public/models');

function copyModels() {
  console.log('📦 Copying Human.js models...');
  
  // 检查源目录
  if (!fs.existsSync(sourceDir)) {
    console.warn('⚠️  Source directory not found:', sourceDir);
    console.warn('   Run `npm install` first');
    return;
  }

  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let copied = 0;
  let skipped = 0;

  // 复制所有模型文件
  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    if (!file.endsWith('.json') && !file.endsWith('.bin')) continue;
    
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    // 检查是否已存在且大小相同
    if (fs.existsSync(targetPath)) {
      const sourceSize = fs.statSync(sourcePath).size;
      const targetSize = fs.statSync(targetPath).size;
      if (sourceSize === targetSize) {
        skipped++;
        continue;
      }
    }
    
    fs.copyFileSync(sourcePath, targetPath);
    const size = (fs.statSync(targetPath).size / 1024 / 1024).toFixed(2);
    console.log(`   ✓ ${file} (${size} MB)`);
    copied++;
  }

  console.log(`✅ Models ready: ${copied} copied, ${skipped} skipped`);
  console.log(`   Location: ${targetDir}`);
}

copyModels();
