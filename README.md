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

### 🔐 国库多签赎回 (Treasury Multisig Redemption)

采用 **2/3 多签机制** 管理资金流出，确保赎回安全：

| 特性 | 说明 |
|------|------|
| **多签审批** | 赎回请求需至少 2 个签名者审批 |
| **自动执行** | 达到阈值后自动执行转账 |
| **透明可追溯** | 所有操作链上记录，可审计 |
| **紧急控制** | 支持紧急暂停和资金提取 |

**合约**: `TreasuryMultisig.vy` - Vyper 0.4+ 实现，支持重入防护和权限控制

**快速开始**: 查看 [部署指南](docs/deployment/treasury-deployment.md) | [用户指南](docs/user-guide/treasury-redemption.md) | [管理员指南](docs/admin-guide/treasury-management.md)

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
| **TreasuryMultisig** | **国库多签赎回管理** | **common** |
| AddressProvider | 合约地址注册表 | common |
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
│   ├── deployment/             # 部署文档
│   │   └── treasury-deployment.md
│   ├── user-guide/             # 用户指南
│   │   └── treasury-redemption.md
│   ├── admin-guide/            # 管理员指南
│   │   └── treasury-management.md
│   ├── api/                    # API 文档
│   │   └── openapi-treasury.yaml
│   └── runbooks/               # 运维手册
│       ├── treasury-emergency-response.md
│       ├── treasury-monitoring.md
│       └── treasury-maintenance.md
├── hardhat/                    # Hardhat 部署工具
│   ├── contracts/              # 部署合约源码
│   ├── scripts/                # 部署脚本
│   │   ├── deploy_treasury_multisig.py
│   │   ├── verify_contracts.py
│   │   └── fund_treasury.py
│   ├── abi/                    # 合约 ABI
│   └── tests/                  # 合约测试
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

### 国库多签合约部署

```bash
# 1. 配置环境变量
export PRIVATE_KEY="your-private-key"
export RPC_URL="https://rpc.sepolia.org"

# 2. 部署合约
cd hardhat/scripts
python deploy_treasury_multisig.py \
  --network sepolia \
  --signers 0xSigner1... 0xSigner2... 0xSigner3... \
  --threshold 2 \
  --address-provider 0xAddressProvider...

# 3. 验证合约
python verify_contracts.py \
  --network sepolia \
  --address 0xDeployedContract...

# 4. 存入资金
python fund_treasury.py \
  --network sepolia \
  --treasury 0xDeployedContract... \
  --token USDT \
  --amount 100000
```

详细指南请参阅 [部署指南](docs/deployment/treasury-deployment.md)。

---

## 文档导航

### 开发文档

| 文档 | 说明 |
|------|------|
| [App 总览](app/README.md) | 应用层导航，业务流程调用链路，合约体系 |
| [后端开发指南](app/backend/README.md) | 后端技术栈、API 路由、服务层、测试 |
| [前端开发指南](app/frontend/nextjs/README.md) | 前端技术栈、页面路由、Web3 集成、测试 |

### 国库多签 (Treasury Multisig)

| 文档 | 说明 | 目标读者 |
|------|------|----------|
| [部署指南](docs/deployment/treasury-deployment.md) | 合约部署、环境配置、验证步骤 | 运维/开发 |
| [用户指南](docs/user-guide/treasury-redemption.md) | 赎回流程、状态追踪、FAQ | 终端用户 |
| [管理员指南](docs/admin-guide/treasury-management.md) | 多签配置、审批流程、故障排除 | 管理员/签名者 |
| [API 文档](docs/api/openapi-treasury.yaml) | OpenAPI 规范、接口定义 | 开发者 |

### 运维手册 (Runbooks)

| 文档 | 说明 |
|------|------|
| [紧急响应手册](docs/runbooks/treasury-emergency-response.md) | 合约暂停、紧急提款、密钥泄露应对 |
| [监控手册](docs/runbooks/treasury-monitoring.md) | 监控指标、告警规则、日常检查 |
| [维护手册](docs/runbooks/treasury-maintenance.md) | 定期维护、备份恢复、升级迁移 |
