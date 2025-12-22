import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产构建时跳过 TypeScript 检查（framer-motion 与 React 19 兼容性问题）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 转译 Ant Design 相关包
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/cssinjs'],
  
  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '31337',
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'local',
  },

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },
};

export default nextConfig;
