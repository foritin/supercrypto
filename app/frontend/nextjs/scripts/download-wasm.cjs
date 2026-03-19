/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 下载 TensorFlow.js WASM 后端文件
 * 用于本地部署 WASM 文件，提升加载速度
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '../public/wasm');

// 需要下载的 WASM 文件
const wasmFiles = [
  'tfjs-backend-wasm.wasm',
  'tfjs-backend-wasm-simd.wasm',
  'tfjs-backend-wasm-threaded-simd.wasm',
];

// CDN 源列表（按优先级排序）
const cdnSources = [
  'https://unpkg.com/@vladmandic/human/assets/',
  'https://cdn.jsdelivr.net/npm/@vladmandic/human/assets/',
];

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        downloadFile(response.headers.location, targetPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(targetPath, () => {});
      reject(err);
    });
  });
}

async function downloadWithFallback(filename, targetPath) {
  for (const source of cdnSources) {
    const url = source + filename;
    try {
      await downloadFile(url, targetPath);
      return true;
    } catch (err) {
      console.log(`   ⚠ Failed from ${source}: ${err.message}`);
    }
  }
  return false;
}

async function downloadWasm() {
  console.log('📦 Downloading TensorFlow.js WASM files...');
  
  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of wasmFiles) {
    const targetPath = path.join(targetDir, filename);
    
    // 检查是否已存在
    if (fs.existsSync(targetPath)) {
      const size = fs.statSync(targetPath).size;
      if (size > 1000) { // 文件大于 1KB 认为有效
        skipped++;
        continue;
      }
    }
    
    console.log(`   ⏳ Downloading ${filename}...`);
    const success = await downloadWithFallback(filename, targetPath);
    
    if (success) {
      const size = (fs.statSync(targetPath).size / 1024 / 1024).toFixed(2);
      console.log(`   ✓ ${filename} (${size} MB)`);
      downloaded++;
    } else {
      console.log(`   ✗ ${filename} - Failed to download`);
      failed++;
    }
  }

  if (failed > 0) {
    console.log(`⚠️  WASM download incomplete: ${downloaded} downloaded, ${failed} failed, ${skipped} skipped`);
    console.log('   The engine will fall back to WebGL backend');
  } else {
    console.log(`✅ WASM ready: ${downloaded} downloaded, ${skipped} skipped`);
  }
  console.log(`   Location: ${targetDir}`);
}

downloadWasm().catch(err => {
  console.error('❌ WASM download error:', err.message);
  process.exit(0); // 不中断 npm install
});
