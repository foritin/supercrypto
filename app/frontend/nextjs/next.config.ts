import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // 生产构建时跳过 TypeScript 检查（framer-motion 与 React 19 兼容性问题）
  typescript: {
    ignoreBuildErrors: true,
  },

  // 转译相关包
  transpilePackages: [],

  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '31337',
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || 'development',
  },

  // 图片优化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // 代理 /api/v1 到后端，使媒体文件 URL (/api/v1/user/media/:id) 可直接在 <img>/CSS 中使用
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ];
  },

  // 忽略依赖包中的测试文件，避免 SSR 打包时解析缺失的 devDependencies
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*\/(test|tests)\/.*$/,
        contextRegExp: /thread-stream|pino/,
      })
    );
    return config;
  },
};

export default nextConfig;
