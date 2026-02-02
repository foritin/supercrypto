/**
 * 复制 Human.js 模型文件到 public 目录
 */
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../node_modules/@vladmandic/human/models');
const targetDir = path.join(__dirname, '../public/models');

// 需要复制的模型文件
const requiredModels = [
  'blazeface.json',
  'blazeface.bin',
  'facemesh.json',
  'facemesh.bin',
  'iris.json',
  'iris.bin',
  'emotion.json',
  'emotion.bin',
  'facedetect.json',
  'facedetect.bin',
  'faceres.json',
  'faceres.bin',
];

function copyModels() {
  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ Created models directory:', targetDir);
  }

  // 检查源目录
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Source directory not found:', sourceDir);
    console.log('Please run: npm install @vladmandic/human');
    process.exit(1);
  }

  // 获取所有模型文件
  const allFiles = fs.readdirSync(sourceDir);
  const modelFiles = allFiles.filter(f => f.endsWith('.json') || f.endsWith('.bin'));
  
  let copied = 0;
  let skipped = 0;

  modelFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    // 检查是否已存在且大小相同
    if (fs.existsSync(targetPath)) {
      const sourceStats = fs.statSync(sourcePath);
      const targetStats = fs.statSync(targetPath);
      if (sourceStats.size === targetStats.size) {
        skipped++;
        return;
      }
    }
    
    fs.copyFileSync(sourcePath, targetPath);
    const size = (fs.statSync(targetPath).size / 1024 / 1024).toFixed(2);
    console.log(`📦 Copied: ${file} (${size} MB)`);
    copied++;
  });

  console.log(`\n✅ Done! Copied: ${copied}, Skipped: ${skipped} (already exists)`);
}

copyModels();
