# SuperCrypto 前端快速启动指南

## 🚀 快速开始

### 前置要求

- Node.js 18.x 或更高版本
- pnpm 8.x 或 npm/yarn
- Git

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

### 环境配置

1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 根据你的环境修改 `.env.local` 文件中的配置

### 启动开发服务器

```bash
# 启动开发服务器 (默认端口 3000)
pnpm dev

# 或
npm run dev
```

访问 http://localhost:3000 查看应用

---

## 📦 构建部署

### 构建生产版本

```bash
# 构建生产版本
pnpm build

# 本地预览生产构建
pnpm start
```

### Docker 部署

```bash
# 构建镜像
docker build -t supercrypto-frontend .

# 运行容器
docker run -p 3000:3000 supercrypto-frontend
```

---

## 🎨 使用数据仪表盘组件

### 基础用法

```tsx
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  return <Dashboard />;
}
```

### 单独使用组件

```tsx
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';

export default function MyPage() {
  return (
    <div className="p-6">
      <GlassCard className="p-6">
        <StatCard
          title="总资产"
          value={125430.50}
          change={{ value: 12.5, trend: 'up' }}
          format="currency"
        />
      </GlassCard>
    </div>
  );
}
```

---

## 🔧 开发指南

### 添加新的统计卡片

1. 在 `src/hooks/useDashboardData.ts` 中添加数据
2. 在 Dashboard 组件中使用 StatCard
3. 根据需要更新类型定义

### 自定义主题

在 `tailwind.config.ts` 中修改主题配置：

```typescript
theme: {
  extend: {
    colors: {
      primary: {
        // 你的自定义颜色
      }
    }
  }
}
```

### 添加动画

使用 Framer Motion：

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  你的内容
</motion.div>
```

---

## 📊 数据集成

### API 数据源

在 `src/hooks/useDashboardData.ts` 中修改 API 调用：

```typescript
const apiService = {
  async getStats() {
    // 调用你的实际 API
    const response = await fetch('/api/stats');
    return response.json();
  }
};
```

### WebSocket 实时数据

使用 `useWebSocket` hook：

```tsx
import { useWebSocket } from '@/hooks/useDashboardData';

const { ws, connected } = useWebSocket('ws://your-websocket-url');
```

---

## 🎯 性能优化建议

1. **懒加载组件**
   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'));
   ```

2. **使用 React.memo**
   ```tsx
   export default React.memo(MyComponent);
   ```

3. **图片优化**
   - 使用 Next.js Image 组件
   - 启用懒加载
   - 使用适当的格式

4. **缓存策略**
   - 使用 React Query 缓存 API 数据
   - 设置适当的 staleTime

---

## 🐛 常见问题

### Q: 页面刷新后数据丢失怎么办？
A: 使用 React Query 的持久化插件或在 localStorage 中保存必要数据

### Q: 动画性能不佳？
A: 确保使用 `will-change` 属性和硬件加速，复杂动画考虑使用 CSS 而非 JavaScript

### Q: 如何添加新的钱包连接？
A: 在 Wagmi 配置中添加新的 connector

---

## 📚 更多资源

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Framer Motion 文档](https://www.framer.com/motion/)
- [Wagmi 文档](https://wagmi.sh/)
- [Ant Design 文档](https://ant.design/docs/react/introduce)

---

## 🤝 贡献

欢迎提交 Pull Request 和 Issue！

---

## 📄 许可证

MIT License