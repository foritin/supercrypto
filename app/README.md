# SuperCrypto — 应用层总览

> `app/` 目录包含 SuperCrypto 平台的两个子项目，共同实现 RWA 代币化投资的完整业务流程。

| 子项目 | 路径 | 说明 |
|--------|------|------|
| **后端** | `backend/` | Python FastAPI 服务，提供 API、业务逻辑、智能合约交互 |
| **前端** | `frontend/nextjs/` | Next.js 16 应用，提供用户界面、Web3 钱包集成 |

---

## 核心业务流程调用链路

以下展示四个核心业务从前端到智能合约的完整调用路径。

### 1. 钱包认证

用户通过 MetaMask 签名完成身份验证，获取 JWT Token。

```
前端 RainbowKit 钱包连接组件
  │
  ├─→ POST /api/v1/public/auth/nonce    ← 获取签名 nonce
  │     └─→ AuthService.get_or_create_nonce()
  │           └─→ Account 模型 (nonce 字段)
  │
  └─→ POST /api/v1/public/auth/token    ← 验证签名，获取 JWT
        └─→ AuthService.verify_and_login()
              └─→ Account 模型 (address 验证)
```

| 层级 | 组件 |
|------|------|
| 前端页面 | RainbowKit 钱包连接 UI |
| API 端点 | `POST /api/v1/public/auth/nonce`、`POST /api/v1/public/auth/token` |
| 后端服务 | `AuthService` (`src/services/auth/`) |
| 数据模型 | `Account` (`src/models/account.py`) |

### 2. KYC 认证

用户提交身份信息，管理员审核通过后同步到链上。

```
前端 KYC 申请页面 (/kyc)
  │
  └─→ POST /api/v1/user/kyc/apply       ← 提交 KYC 申请
        └─→ KycService.submit_application()
              └─→ UserKyc 模型 (status=pending)

管理后台 KYC 审核页面 (/admin)
  │
  └─→ POST /api/v1/admin/kyc/review     ← 管理员审核
        └─→ KycService.review()
              └─→ KYCManager.addInvestor()  ← 链上调用
```

| 层级 | 组件 |
|------|------|
| 前端页面 | KYC 申请页 (`/kyc`)、管理后台 (`/admin`) |
| API 端点 | `POST /api/v1/user/kyc/apply`、`POST /api/v1/admin/kyc/review` |
| 后端服务 | `KycService` (`src/services/kyc/`) |
| 智能合约 | `KYCManager.addInvestor()` (`contracts/common/KYC.vy`) |

### 3. 认购投资

用户选择资产和锁定期，通过 USDT 授权完成认购，获得 RWA Token。

```
前端投资页面 (/invest)
  │
  ├─→ POST /api/v1/user/subscriptions/preview  ← 预览收益
  │     └─→ SubscriptionService.preview()
  │
  └─→ POST /api/v1/user/subscriptions          ← 确认认购
        └─→ SubscriptionService.create()
              ├─→ USDT 授权 (Approve)
              └─→ Subscription 合约 ← 链上认购
```

| 层级 | 组件 |
|------|------|
| 前端页面 | 投资页 (`/invest`)、资产详情 (`/assets`) |
| API 端点 | `POST /api/v1/user/subscriptions`、`POST /api/v1/user/subscriptions/preview` |
| 后端服务 | `SubscriptionService` (`src/services/subscription/`) |
| 智能合约 | `VankeSubscription` (`contracts/projects/vanke/VankeSubscription.vy`) |

### 4. 质押挖矿

用户质押 RWA Token，获得 PLT 平台代币奖励。

```
前端质押页面 (/staking)
  │
  └─→ POST /api/v1/user/staking            ← 质押操作
        └─→ StakingService.stake()
              └─→ Staking 合约 ← 链上质押
                    └─→ PLT Token 奖励分发
```

| 层级 | 组件 |
|------|------|
| 前端页面 | 质押页 (`/staking`) |
| API 端点 | `POST /api/v1/user/staking` |
| 后端服务 | `StakingService` (`src/services/staking/`) |
| 智能合约 | `VankeStaking` (`contracts/projects/vanke/VankeStaking.vy`) |

---

## 智能合约体系

### 合约列表

| 合约 | 文件 | 功能 | 分组 |
|------|------|------|------|
| **KYCManager** | `contracts/common/KYC.vy` | KYC 验证、投资者管理 | common |
| **AddressProvider** | `contracts/common/AddressProvider.vy` | 合约地址注册中心 | common |
| **MockUSDT** | `contracts/stablecoins/USDT.vy` | 测试用 USDT 稳定币 | stablecoins |
| **MockUSDC** | `contracts/stablecoins/USDC.vy` | 测试用 USDC 稳定币 | stablecoins |
| **VankeRWAToken** | `contracts/projects/vanke/VankeRWAToken.vy` | RWA 权益代币 (ERC1404) | vanke |
| **VankePlatformToken** | `contracts/projects/vanke/VankePlatformToken.vy` | PLT 平台代币 (ERC20) | vanke |
| **VankeSubscription** | `contracts/projects/vanke/VankeSubscription.vy` | 认购管理、收益计算 | vanke |
| **VankeStaking** | `contracts/projects/vanke/VankeStaking.vy` | 质押、奖励分发 | vanke |
| **VankeLiquidityMining** | `contracts/projects/vanke/VankeLiquidityMining.vy` | 流动性挖矿 | vanke |

### 依赖关系

```
KYCManager (common)
    ↑
    ├── VankeRWAToken ──→ VankeSubscription
    │                          ↓
    ├── VankePlatformToken ──→ VankeStaking
    │                          ↓
    └──────────────────→ VankeLiquidityMining
```

- **KYCManager** 是所有业务合约的前置依赖，验证投资者资格
- **AddressProvider** 提供合约地址注册和查询
- **MockUSDT/USDC** 仅在 local/test 环境使用

---

## 环境配置概览

| 特性 | local | test | production |
|------|-------|------|------------|
| 区块链网络 | Hardhat 本地节点 | Sepolia 测试网 | 以太坊主网 |
| 稳定币 | Mock USDT/USDC | Mock USDT/USDC | 真实 USDT/USDC |
| Mock 代币铸造 | ✅ | ✅ | ❌ |
| 快速 KYC 审核 | ✅ | ✅ | ❌ |
| 数据重置 | ✅ | ✅ | ❌ |
| 开发者工具 | ✅ | ✅ | ❌ |
| 配置文件 | `config.dev.yaml` | `config.test.yaml` | `config.prod.yaml` |

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [← 返回项目根目录](../README.md) | 项目总览、技术栈、目录结构 |
| [后端开发指南](backend/README.md) | API 路由、服务层、数据模型、测试 |
| [前端开发指南](frontend/nextjs/README.md) | 页面路由、组件、Web3 集成、测试 |
