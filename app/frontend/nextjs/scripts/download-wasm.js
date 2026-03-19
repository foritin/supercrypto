/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 下载 TensorFlow.js WASM 文件到 public 目录
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '../public/wasm');

// TensorFlow.js 版本 (与 @vladmandic/human 兼容)
const TFJS_VERSION = '4.17.0';

// 需要下载的 WASM 文件
const wasmFiles = [
  'tfjs-backend-wasm.wasm',
  'tfjs-backend-wasm-simd.wasm',
  'tfjs-backend-wasm-threaded-simd.wasm',
];

// CDN 源列表（按优先级）
const CDN_SOURCES = [
  `https://unpkg.com/@tensorflow/tfjs-backend-wasm@${TFJS_VERSION}/dist/`,
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${TFJS_VERSION}/dist/`,
];

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(targetPath);
        return downloadFile(response.headers.location, targetPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(targetPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      reject(err);
    });
  });
}

async function downloadWasmFiles() {
  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('✅ Created wasm directory:', targetDir);
  }

  for (const wasmFile of wasmFiles) {
    const targetPath = path.join(targetDir, wasmFile);
    
    // 检查是否已存在
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (stats.size > 100000) { // > 100KB 认为有效
        console.log(`⏭️  Skip: ${wasmFile} (already exists)`);
        continue;
      }
    }
    
    let downloaded = false;
    for (const cdn of CDN_SOURCES) {
      const url = cdn + wasmFile;
      console.log(`⬇️  Downloading: ${wasmFile} from ${cdn.split('/')[2]}...`);
      
      try {
        await downloadFile(url, targetPath);
        const size = (fs.statSync(targetPath).size / 1024 / 1024).toFixed(2);
        console.log(`✅ Downloaded: ${wasmFile} (${size} MB)`);
        downloaded = true;
        break;
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}, trying next CDN...`);
      }
    }
    
    if (!downloaded) {
      console.error(`❌ Failed to download: ${wasmFile} from all CDNs`);
    }
  }

  console.log('\n✅ WASM files download complete!');
}

downloadWasmFiles().catch(console.error);
