# SuperCrypto 前端

SuperCrypto RWA 代币化投资平台的前端应用，基于 Next.js 16 App Router 构建。

## 技术栈

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | Next.js | 16.0.8 | App Router |
| | React | 19.2.4 | - |
| | TypeScript | 5.x | - |
| **UI** | Tailwind CSS | 4.x | 工具类优先 |
| | shadcn/ui (Radix UI) | - | 无样式底层组件 + 定制主题 |
| | CVA + clsx + tailwind-merge | - | 组件变体 + 条件样式 |
| | Lucide React | - | 图标库 |
| | Framer Motion | 12.x | 页面/组件动画 |
| **状态管理** | Zustand | 4.x | 客户端状态 |
| | TanStack React Query | 5.x | 服务端状态缓存 |
| | TanStack React Table | 8.x | 表格数据管理 |
| **表单** | React Hook Form + Zod | 7.x / 4.x | 表单验证 |
| **Web3** | Wagmi | 3.x | 以太坊交互 |
| | Viem | 2.x | 底层以太坊工具 |
| | RainbowKit | 2.x | 钱包连接 UI |
| | MetaMask SDK | - | MetaMask 集成 |
| | WalletConnect | - | 多钱包支持 |
| **数据可视化** | Recharts | 3.x | 图表 |
| | XY Flow + Dagre | 12.x | 合约依赖图 |
| **国际化** | i18next + react-i18next | 25.x / 16.x | 中英文切换 |
| **HTTP** | Axios | 1.x | API 请求 |
| **通知** | Sonner | 2.x | Toast 通知 |
| **测试** | Vitest | 4.x | 单元测试 |
| | fast-check | 4.x | 属性测试 |
| | Testing Library | - | 组件测试 |
| | Playwright | 1.x | E2E 测试 |
| **开发工具** | Storybook | 8.6.x | 组件文档 |
| | ESLint + Prettier | - | 代码规范 |
| | Husky + lint-staged | - | Git Hooks |

## 目录结构

```
src/
├── app/                  # App Router 页面路由
│   ├── admin/            # 管理后台页面
│   ├── assets/           # 资产列表/详情
│   ├── invest/           # 认购投资
│   ├── kyc/              # KYC 认证
│   ├── portfolio/        # 投资组合
│   ├── staking/          # 质押挖矿
│   ├── projects/         # 项目注册
│   ├── partners/         # 合作伙伴
│   ├── dev-tools/        # 开发者工具
│   ├── faq/              # 常见问题
│   ├── terms/            # 服务条款
│   ├── privacy/          # 隐私政策
│   ├── security/         # 安全说明
│   ├── risk-disclosure/  # 风险披露
│   ├── layout.tsx        # 根布局
│   ├── page.tsx          # 首页
│   └── globals.css       # 全局样式
├── components/           # React 组件
│   ├── ui/               # shadcn/ui 基础组件
│   ├── layout/           # 布局组件
│   ├── admin/            # 管理后台组件
│   ├── asset/            # 资产相关组件
│   ├── auth/             # 认证组件
│   ├── invest/           # 投资组件
│   ├── kyc/              # KYC 组件
│   ├── portfolio/        # 组合组件
│   ├── wallet/           # 钱包组件
│   ├── web3/             # Web3 组件
│   ├── home/             # 首页组件
│   └── ...               # 其他业务组件
├── hooks/                # 自定义 Hooks
├── services/             # API 服务层
├── stores/               # Zustand 状态管理
├── types/                # TypeScript 类型定义
├── lib/                  # 工具函数
├── config/               # 配置（Wagmi 等）
├── constants/            # 常量定义
├── contexts/             # React Context
├── providers/            # Context Providers
├── contracts/            # 合约 ABI
├── locales/              # 国际化（zh-CN、en-US）
├── styles/               # CSS 样式
├── utils/                # 通用工具
└── __tests__/            # 测试文件
    ├── components/       # 组件测试
    ├── integration/      # 集成测试
    └── properties/       # 属性测试（fast-check）
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 环境变量

复制 `.env.development` 或创建 `.env.local`，主要配置项：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1       # 后端 API 地址
NEXT_PUBLIC_RPC_URL=http://localhost:8545               # 以太坊 RPC 节点
NEXT_PUBLIC_CHAIN_ID=31337                              # 链 ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id    # WalletConnect 项目 ID
NEXT_PUBLIC_SUPPORTED_CHAIN_IDS=31337,1,11155111        # 支持的链
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs           # IPFS 网关
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws               # WebSocket 地址
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 页面路由与 API 对应表

| 路由 | 说明 | 对应后端 API |
|------|------|-------------|
| `/` | 首页 | - |
| `/assets` | 资产列表 | `GET /api/v1/public/assets` |
| `/assets/[id]` | 资产详情 | `GET /api/v1/public/assets/{id}` |
| `/invest` | 认购投资 | `POST /api/v1/user/subscriptions`、`POST /api/v1/user/subscriptions/preview` |
| `/kyc` | KYC 认证 | `POST /api/v1/user/kyc/apply`、`GET /api/v1/user/kyc/status` |
| `/portfolio` | 投资组合 | `GET /api/v1/user/subscriptions` |
| `/staking` | 质押挖矿 | `POST /api/v1/user/staking` |
| `/projects` | 项目注册 | `GET /api/v1/public/projects` |
| `/partners` | 合作伙伴 | - |
| `/faq` | 常见问题 | - |
| `/terms` | 服务条款 | - |
| `/privacy` | 隐私政策 | - |
| `/security` | 安全说明 | - |
| `/risk-disclosure` | 风险披露 | - |
| `/dev-tools` | 开发者工具 | `GET /api/v1/dev/environment` |
| `/admin/dashboard` | 管理后台仪表盘 | `GET /api/v1/admin/stats` |
| `/admin/assets` | 资产管理 | `POST /api/v1/admin/assets`、`PUT /api/v1/admin/assets/{id}` |
| `/admin/kyc` | KYC 审核 | `POST /api/v1/admin/kyc/review` |
| `/admin/contracts` | 合约监控 | `GET /api/v1/admin/contracts/status` |
| `/admin/audit-logs` | 审计日志 | `GET /api/v1/admin/audit-logs` |
| `/admin/sessions` | 会话管理 | `GET /api/v1/admin/sessions` |

## Web3 集成

### 架构概览

前端通过 Wagmi + Viem 与以太坊网络交互，RainbowKit 提供钱包连接 UI。

```
用户操作 → RainbowKit (钱包 UI) → Wagmi (React Hooks) → Viem (底层交互) → 以太坊节点
```

### 钱包连接

Wagmi 配置位于 `src/config/wagmi.ts`，Web3 Provider 位于 `src/providers/web3-provider.tsx`。

支持的钱包：
- MetaMask（通过 MetaMask SDK）
- WalletConnect（支持移动端钱包扫码连接）

支持的网络：
- Ethereum Mainnet (Chain ID: 1)
- Sepolia Testnet (Chain ID: 11155111)
- Local Hardhat (Chain ID: 31337)

### 合约交互

合约 ABI 存放在 `src/contracts/` 目录，通过自定义 Hooks 封装交互逻辑：

- `useWallet` — 钱包连接状态管理
- `useBalance` — 代币余额查询
- `useContract` — 通用合约调用
- `useSubscriptionContract` — 认购合约交互
- `useTransaction` — 交易状态追踪

### 状态管理

Web3 相关状态通过 Zustand Store 管理：

- `web3-store` — 钱包连接、网络、账户状态
- `transaction-store` — 交易队列、状态追踪
- `user-store` — 用户信息、认证状态

## 测试

### 单元测试 / 属性测试（Vitest + fast-check）

```bash
# 单次运行所有测试
npm test -- --run

# 运行特定测试文件
npm test -- --run src/__tests__/components/button.test.tsx

# 运行属性测试
npm test -- --run src/__tests__/properties/

# 带覆盖率
npm test -- --run --coverage

# 详细输出
npm test -- --run --reporter=verbose
```

测试目录结构：

- `src/__tests__/components/` — 组件单元测试
- `src/__tests__/integration/` — 集成测试
- `src/__tests__/properties/` — 属性测试（fast-check）

### E2E 测试（Playwright）

```bash
# 安装浏览器
npx playwright install

# 运行所有 E2E 测试
npx playwright test

# 带浏览器界面运行
npx playwright test --headed

# 调试模式
npx playwright test --debug

# 查看测试报告
npx playwright show-report
```

## 其他命令

```bash
npm run build          # 生产构建
npm run lint           # ESLint 检查
npm run lint:fix       # ESLint 自动修复
npm run format         # Prettier 格式化
npm run type-check     # TypeScript 类型检查
npm run storybook      # 启动 Storybook 组件文档
```

## ESLint 约定（2026-03）

为保证历史代码库可持续收敛，当前 lint 策略区分“阻断型”与“提示型”规则：

- 保持阻断（error）：类型安全、未使用变量、hooks 基本规则、导入顺序、a11y 核心规则。
- 降噪关闭（off）：`react-hooks/exhaustive-deps`、`react-hooks/incompatible-library`、`@next/next/no-img-element`。

说明：

- 上述关闭项用于减少历史噪声，避免影响交付节奏；不代表这些问题在业务上无风险。
- 新模块建议继续遵循 hooks 依赖完整性与 `next/image` 最佳实践。
- 若需要逐步恢复更严格检查，可在 `eslint.config.mjs` 中按目录或文件范围回开规则。

推荐在本地提交前执行：

```bash
npm run lint
npm run type-check
```

## 导航

- [← 返回项目根目录](../../../README.md)
- [← 返回 App 目录](../../README.md)
