# SuperCrypto

> RWA（Real World Assets）代币化投资平台 —— 通过区块链技术降低优质固定资产的投资门槛，为加密货币投资者提供稳定、透明的收益渠道。

---

## 核心业务

### 双代币经济模型

| 代币 | 名称 | 说明 |
|------|------|------|
| **RWA Token** | 权益凭证代币 | 代表真实世界资产（如房产）的权益，通过 USDT 认购获得 |
| **PLT Token** | 平台治理代币 | 通过质押挖矿获取，总量 1 亿枚，用于治理和激励 |

### 主要功能模块

- **钱包认证** — MetaMask 签名登录，多网络切换
- **KYC 认证** — 身份验证 + 管理员审核 + 链上记录
- **认购投资** — 选择资产 → 选择锁定期 → USDT 授权 → 获得 RWA Token
- **质押挖矿** — 质押 RWA Token → 获得 PLT 奖励
- **投资组合** — 持仓查看、收益统计、赎回操作
- **管理后台** — 资产管理、KYC 审核、合约监控

### 收益机制

| 锁定期 | APY |
|--------|-----|
| 3 个月 | 10% |
| 6 个月 | 12% |
| 12 个月 | 15% |

---

## 技术栈

### 后端

| 分类 | 技术 |
|------|------|
| 语言 | Python 3.13+ |
| 框架 | FastAPI + Uvicorn |
| ORM | Tortoise ORM + Aerich 迁移 |
| 数据库 | PostgreSQL (asyncpg) |
| 缓存 | Redis |
| 认证 | PyJWT + python-jose |
| Web3 | web3.py 7.x |
| 智能合约 | Vyper 0.4+ (Ape Framework) |
| 工具库 | falib (自研) |
| 日志 | Loguru |
| 测试 | pytest + hypothesis |

### 前端

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 16 + React 19 + TypeScript |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand + TanStack React Query |
| Web3 | Wagmi + Viem + RainbowKit |
| 表单 | React Hook Form + Zod |
| 动画 | Framer Motion + React Spring |
| 图表 | Recharts + Ant Design Plots |
| 国际化 | i18next |
| 测试 | Vitest + fast-check + Playwright |

### 智能合约

| 合约 | 功能 | 分组 |
|------|------|------|
| KYCManager | KYC 验证、投资者管理 | common |
| MockUSDT/USDC | 测试用稳定币 | mock |
| RWATokenSTO | RWA 权益代币 (ERC1404) | fake |
| PlatformToken | PLT 平台代币 (ERC20) | fake |
| Subscription | 认购管理、收益计算 | fake |
| Staking | 质押、奖励分发 | fake |
| LiquidityMining | 流动性挖矿 | fake |

---

## 项目结构

```
SuperCrypto/
├── app/
│   ├── backend/                # Python FastAPI 后端
│   │   ├── src/
│   │   │   ├── api/            # API 路由 (public/user/admin/dev)
│   │   │   ├── models/         # Tortoise ORM 数据模型
│   │   │   ├── services/       # 业务逻辑服务层
│   │   │   ├── shared/         # 共享模块 (安全、Schema、工具)
│   │   │   └── tasks/          # 异步任务
│   │   ├── contracts/          # Vyper 智能合约
│   │   ├── migrations/         # 数据库迁移文件
│   │   ├── scripts/            # 部署/管理脚本
│   │   └── test/               # 测试文件
│   └── frontend/
│       └── nextjs/             # Next.js 16 前端
│           ├── src/
│           │   ├── app/        # App Router 页面
│           │   ├── components/ # React 组件
│           │   ├── hooks/      # 自定义 Hooks
│           │   ├── services/   # API 服务层
│           │   ├── stores/     # Zustand 状态管理
│           │   ├── types/      # TypeScript 类型定义
│           │   ├── lib/        # 工具函数
│           │   ├── locales/    # 国际化 (zh-CN, en-US)
│           │   ├── config/     # 配置
│           │   ├── constants/  # 常量定义
│           │   ├── contexts/   # React Context
│           │   ├── providers/  # Context Providers
│           │   ├── styles/     # CSS 样式
│           │   └── __tests__/  # 测试文件
│           └── e2e/            # E2E 测试 (Playwright)
├── docs/                       # 项目文档
└── .kiro/
    └── specs/                  # Spec 文件
```

---

## 快速开始

### 后端

```bash
cd app/backend
source .venv/bin/activate
PYTHONPATH=. python -m uvicorn main:app --reload
```

详细指南请参阅 [后端 README](app/backend/README.md)。

### 前端

```bash
cd app/frontend/nextjs
npm install
npm run dev
```

详细指南请参阅 [前端 README](app/frontend/nextjs/README.md)。

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [App 总览](app/README.md) | 应用层导航，业务流程调用链路，合约体系 |
| [后端开发指南](app/backend/README.md) | 后端技术栈、API 路由、服务层、测试 |
| [前端开发指南](app/frontend/nextjs/README.md) | 前端技术栈、页面路由、Web3 集成、测试 |
