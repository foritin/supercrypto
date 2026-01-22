# SuperCrypto - RWA 双币模型投资平台

<div align="center">

![Vyper](https://img.shields.io/badge/Vyper-0.4.0-blue)
![Ape](https://img.shields.io/badge/Ape-Latest-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)
![License](https://img.shields.io/badge/License-MIT-yellow)

**基于真实世界资产的双代币 DeFi 投资平台**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [架构设计](#️-架构设计) • [合约体系](#-合约体系) • [部署指南](#-部署指南)

</div>

---

## 🌟 项目概述

SuperCrypto 是一个 RWA（Real World Assets）代币化投资平台，旨在降低优质固定资产的投资门槛，为加密货币投资者提供稳定、透明的收益渠道。

### 双代币经济模型

| 代币          | 名称         | 说明                                                 |
| ------------- | ------------ | ---------------------------------------------------- |
| **RWA Token** | 权益凭证代币 | 代表真实世界资产（如房产）的权益，通过 USDT 认购获得 |
| **PLT Token** | 平台治理代币 | 通过质押挖矿获取，总量 1 亿枚，用于治理和激励        |

### 收益机制

| 锁定期  | APY | 适用场景 |
| ------- | --- | -------- |
| 3 个月  | 10% | 灵活投资 |
| 6 个月  | 12% | 平衡收益 |
| 12 个月 | 15% | 长期持有 |

---

## ✨ 功能特性

### 🏦 核心功能

| 模块         | 功能                                                  | 状态      |
| ------------ | ----------------------------------------------------- | --------- |
| **钱包连接** | MetaMask 签名登录、多网络切换、账户变更检测           | ✅ 完成   |
| **KYC 认证** | 身份验证、合规审核、链上 + 后端双重记录               | ✅ 完成   |
| **资产浏览** | RWA 资产列表、详情、价格历史                          | ✅ 完成   |
| **认购投资** | 多锁定期选择、收益预览、USDT 支付                     | ✅ 完成   |
| **投资组合** | 持仓查看、收益统计、赎回操作                          | ✅ 完成   |
| **质押挖矿** | RWA Token 质押、PLT 奖励                              | 🚧 开发中 |
| **管理后台** | 资产管理、KYC 审核、**合约监控**                      | ✅ 完成   |
| **开发工具** | Mock 代币铸造转账、快速 KYC、数据重置 (仅 local/test) | ✅ 完成   |

### 🛠️ 开发者工具 (仅 local/test 环境)

| 功能              | 描述                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| **Mock 代币铸造** | Admin 可铸造 MockUSDT/MockUSDC 并转账给指定用户，两步操作：铸造 → 转账 |
| **快速 KYC**      | 一键通过当前账户的 KYC 认证，同时更新链上和数据库                      |
| **数据重置**      | 清除测试数据（KYC 记录、交易记录），需输入确认文字                     |

> ⚠️ 这些功能仅在 Admin 菜单下可见，且仅 local/test 环境可用

### 🔐 安全特性

- ✅ **STO 合规** - ERC1404 证券代币标准，KYC/AML 验证
- ✅ **访问控制** - RBAC 权限管理（user/admin）
- ✅ **重入防护** - 所有外部调用后更新状态
- ✅ **暂停机制** - 紧急情况可暂停合约
- ✅ **多重验证** - 关键操作需 KYC + 钱包签名

---

## 🏗️ 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           系统架构                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                       Frontend (Next.js)                             │  │
│   │   Next.js 15 + React 19 + TypeScript + Ant Design + Wagmi            │  │
│   └───────────────────────────────┬─────────────────────────────────────┘  │
│                                   │                                         │
│                   ┌───────────────┴───────────────┐                        │
│                   │                               │                         │
│                   ▼                               ▼                         │
│   ┌─────────────────────────────┐   ┌───────────────────────────────────┐  │
│   │     Backend (FastAPI)       │   │      Blockchain (Ethereum)        │  │
│   │  Python 3.11+ + Tortoise    │   │   Hardhat / Sepolia / Mainnet     │  │
│   │  PostgreSQL + Redis         │   │                                   │  │
│   └──────────────┬──────────────┘   │   ┌───────────────────────────┐   │  │
│                  │                  │   │    Smart Contracts         │   │  │
│                  │                  │   │    (Vyper 0.4+)            │   │  │
│                  ▼                  │   │                            │   │  │
│   ┌─────────────────────────────┐   │   │  ┌──────────────────────┐  │   │  │
│   │       PostgreSQL            │   │   │  │ KYCManager           │  │   │  │
│   │  - Account                  │   │   │  │ RWATokenSTO          │  │   │  │
│   │  - UserKyc                  │   │   │  │ Subscription         │  │   │  │
│   │  - Asset                    │◄──┼───│  │ Staking              │  │   │  │
│   │  - Subscription             │   │   │  │ PlatformToken        │  │   │  │
│   │  - DeployInfo               │   │   │  │ LiquidityMining      │  │   │  │
│   │  - ContractBinding          │   │   │  └──────────────────────┘  │   │  │
│   │  - AuditLog                 │   │   └───────────────────────────┘   │  │
│   └─────────────────────────────┘   └───────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级       | 技术                             | 说明                 |
| ---------- | -------------------------------- | -------------------- |
| **前端**   | Next.js 15, React 19, TypeScript | App Router + SSR/SSG |
| **UI**     | Ant Design 5.x, Tailwind CSS     | 组件库 + 样式        |
| **Web3**   | Wagmi, viem, MetaMask            | 钱包连接 + 交易      |
| **后端**   | Python 3.11+, FastAPI            | 高性能 API           |
| **ORM**    | Tortoise ORM, Aerich             | 异步 ORM + 迁移      |
| **数据库** | PostgreSQL, Redis                | 持久化 + 缓存        |
| **合约**   | Vyper 0.4+, Ape Framework        | 智能合约开发         |
| **测试链** | Hardhat, Sepolia                 | 本地 + 测试网        |

---

## 📜 合约体系

### 合约列表

| 合约                | 文件                 | 功能                            | 项目分组 |
| ------------------- | -------------------- | ------------------------------- | -------- |
| **KYCManager**      | `KYCManager.vy`      | KYC 验证、投资者管理、合规控制  | common   |
| **MockUSDT**        | `mocks/MockUSDT.vy`  | 测试用 USDT                     | mock     |
| **MockUSDC**        | `mocks/MockUSDC.vy`  | 测试用 USDC                     | mock     |
| **RWATokenSTO**     | `RWATokenSTO.vy`     | RWA 权益代币 (ERC1404 证券代币) | fake     |
| **PlatformToken**   | `PlatformToken.vy`   | PLT 平台代币 (ERC20)            | fake     |
| **Subscription**    | `Subscription.vy`    | 认购管理、收益计算、赎回处理    | fake     |
| **Staking**         | `Staking.vy`         | RWA Token 质押、PLT 奖励分发    | fake     |
| **LiquidityMining** | `LiquidityMining.vy` | 流动性挖矿奖励                  | fake     |

### 项目分组说明

| 分组       | 说明                      | 合约                                                               |
| ---------- | ------------------------- | ------------------------------------------------------------------ |
| **common** | 公共合约，所有项目共享    | KYCManager                                                         |
| **mock**   | 测试用合约，仅 local 环境 | MockUSDT, MockUSDC                                                 |
| **fake**   | Fake 项目业务合约         | RWATokenSTO, PlatformToken, Subscription, Staking, LiquidityMining |

### 合约依赖关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           合约依赖关系                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [common]                                                                  │
│   ┌──────────────┐                                                         │
│   │  KYCManager  │◄─────────────────────────────────────────┐              │
│   └──────────────┘                                          │              │
│          ▲                                                  │              │
│          │                                                  │              │
│   [mock] │                                                  │              │
│   ┌──────────────┐                                          │              │
│   │   MockUSDT   │────────────┐                             │              │
│   └──────────────┘            │                             │              │
│                               │                             │              │
│   [fake]                      ▼                             │              │
│   ┌──────────────┐     ┌──────────────┐                     │              │
│   │ RWATokenSTO  │────>│ Subscription │─────────────────────┤              │
│   └──────────────┘     └──────────────┘                     │              │
│          │                                                  │              │
│          │             ┌──────────────┐                     │              │
│          └────────────>│   Staking    │─────────────────────┤              │
│                        └──────────────┘                     │              │
│   ┌──────────────┐            │                             │              │
│   │PlatformToken │────────────┼─────────────────────────────┘              │
│   └──────────────┘            │                                            │
│          │             ┌──────────────────┐                                │
│          └────────────>│ LiquidityMining  │                                │
│                        └──────────────────┘                                │
│                                                                             │
│   说明：箭头表示依赖关系，合约通过地址相互引用                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 合约交互机制

**合约通过地址相互引用：**

```vyper
# 每个合约存储依赖合约的地址
kycManager: public(address)

# 调用时通过接口调用
assert staticcall IKYCManager(self.kycManager).isVerified(msg.sender)
```

**每个合约都有更新依赖的函数：**

```vyper
@external
def setKYCManager(_newManager: address):
    assert msg.sender == self.owner, "Only owner"
    self.kycManager = _newManager

@external
def setUSDT(_newUsdt: address):
    assert msg.sender == self.owner, "Only owner"
    self.usdt = _newUsdt

@external
def setRWAToken(_newRwaToken: address):
    assert msg.sender == self.owner, "Only owner"
    self.rwaToken = _newRwaToken
```

### 合约管理系统

系统使用两个核心表来管理合约部署和依赖：

**DeployInfo 表：** 记录合约部署信息

| 字段               | 说明                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| `deploy_step`      | 部署阶段 (0-common-kyc, 1-mock-tokens, 2-fake-tokens, 3-fake-business) |
| `contract_name`    | 合约名称                                                               |
| `contract_address` | 合约地址                                                               |
| `project`          | 项目分组 (common/mock/fake)                                            |
| `network`          | 网络 (local/sepolia/mainnet)                                           |
| `is_active`        | 是否为当前活跃版本                                                     |
| `dependencies`     | 构造函数中绑定的依赖地址 (JSON)                                        |

**ContractBinding 表：** 记录合约依赖绑定关系

| 字段               | 说明                                 |
| ------------------ | ------------------------------------ |
| `contract_name`    | 拥有依赖的合约名称 (如 Subscription) |
| `contract_address` | 拥有依赖的合约地址                   |
| `dependency_name`  | 被依赖的合约名称 (如 KYCManager)     |
| `bound_address`    | 当前绑定的依赖合约地址               |
| `set_function`     | 用于更新此依赖的 set 函数名称        |
| `network`          | 网络                                 |
| `last_updated_tx`  | 最后一次更新绑定的交易哈希           |

**依赖检测机制：**

当某个合约（如 KYCManager）重新部署后：

1. `deploy_info` 表新增记录，旧记录 `is_active=false`
2. `contract_binding` 表中的 `bound_address` 仍为旧地址
3. 系统检测到 `bound_address` ≠ 最新 `deploy_info.contract_address`
4. 管理后台显示"需更新"状态（黄色标识）
5. 管理员通过界面确认并调用 `setXXX` 函数更新绑定

---

## 🔄 KYC 流程详解

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KYC 完整流程                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   用户                      后端                        链上 (KYCManager)    │
│    │                         │                              │               │
│    │ 1. 提交 KYC 申请        │                              │               │
│    │ (身份信息+文件)         │                              │               │
│    │ ───────────────────────>│                              │               │
│    │                         │                              │               │
│    │                         │ 2. 存储到 UserKyc 表         │               │
│    │                         │ (status = pending)           │               │
│    │                         │                              │               │
│    │                         │ 3. 管理员审核                │               │
│    │                         │ (approve/reject)             │               │
│    │                         │                              │               │
│    │                         │ 4. 审核通过后                │               │
│    │                         │ ─────────────────────────────>│              │
│    │                         │  调用 addInvestor()          │               │
│    │                         │                              │               │
│    │                         │                              │ 5. 记录投资者 │
│    │                         │                              │ isVerified=✅ │
│    │                         │                              │               │
│    │ 6. 用户认购时           │                              │               │
│    │ ─────────────────────────────────────────────────────>│               │
│    │  Subscription.subscribe()                              │               │
│    │                         │                              │ 7. 检查 KYC   │
│    │                         │                              │ isVerified()  │
│    │                         │                              │               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 关键点说明

| 层级                  | 存储内容                     | 用途               |
| --------------------- | ---------------------------- | ------------------ |
| **后端 (UserKyc)**    | 用户身份信息、文件、审核记录 | 合规留档、人工审核 |
| **链上 (KYCManager)** | 验证状态 (isVerified)        | 合约调用时验证     |

**两者需要同步：** 后端审核通过后，需要调用链上 `addInvestor`

---

## 🚀 快速开始

### 环境要求

- **Python**: 3.11+
- **Node.js**: 18+
- **PostgreSQL**: 14+
- **Redis**: 6+ (可选)

### 项目结构

```
SuperCrypto/
├── app/
│   ├── backend/                 # 后端服务
│   │   ├── contracts/           # Vyper 智能合约
│   │   ├── scripts/             # 部署脚本
│   │   │   ├── 0-common-kyc.py      # 公共合约部署
│   │   │   ├── 1-mock-tokens.py     # Mock 代币部署
│   │   │   ├── 2-fake-tokens.py     # Fake 项目代币
│   │   │   ├── 3-fake-business.py   # Fake 项目业务合约
│   │   │   ├── deploy_project.py    # 一键部署脚本
│   │   │   └── deploy_utils.py      # 部署工具函数
│   │   ├── src/                 # Python 源码
│   │   │   ├── api/             # API 路由
│   │   │   ├── domains/         # 业务领域 (DDD)
│   │   │   ├── models/          # 数据模型
│   │   │   └── shared/          # 共享模块
│   │   ├── ape-config.yaml      # Ape 配置
│   │   └── config.local.yaml    # 本地配置
│   │
│   └── frontend/
│       └── nextjs/              # Next.js 前端应用
│           ├── src/
│           │   ├── app/         # App Router 页面
│           │   ├── components/  # React 组件
│           │   ├── hooks/       # 自定义 Hooks
│           │   ├── services/    # API 服务
│           │   ├── providers/   # Context 提供者
│           │   └── locales/     # 国际化 (模块化)
│           └── package.json
│
├── bmad_docs/                        # BMAD 文档
│   ├── prd.md                   # 产品需求文档
│   ├── architecture.md          # 架构设计
│   ├── epics.md                 # 史诗和故事
│   └── sprint-artifacts/        # Sprint 产物
│
└── hardhat/                     # Hardhat 配置
    └── hardhat.config.ts
```

### 安装步骤

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd SuperCrypto

# 2. 后端安装
cd app/backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

# 3. 前端安装
cd ../frontend/nextjs
npm install

# 4. 启动 Hardhat 节点
cd ../../../hardhat
./hardhat-node.sh start-local

# 5. 一键部署合约 (推荐)
cd ../app/backend
python scripts/deploy_project.py --project fake --network local

# 6. 设置 Admin KYC
ape run setup_admin_kyc --network ethereum:local

# 7. 启动后端
python main.py

# 8. 启动前端 (新终端)
cd ../frontend/nextjs
npm run dev
```

---

## 📦 部署指南

### 部署脚本

| 脚本                 | 部署的合约                             | 项目分组 | 依赖         |
| -------------------- | -------------------------------------- | -------- | ------------ |
| `0-common-kyc.py`    | KYCManager                             | common   | 无           |
| `1-mock-tokens.py`   | MockUSDT, MockUSDC                     | mock     | 无           |
| `2-fake-tokens.py`   | RWATokenSTO, PlatformToken             | fake     | 脚本 0       |
| `3-fake-business.py` | Subscription, Staking, LiquidityMining | fake     | 脚本 0, 1, 2 |
| `deploy_project.py`  | 一键部署项目所有合约                   | -        | -            |
| `setup_admin_kyc.py` | 设置 Admin 链上 KYC                    | -        | 脚本 0       |

### 部署命令

```bash
# 一键部署 fake 项目 (推荐)
python scripts/deploy_project.py --project fake --network local

# 或分步部署
ape run 0-common-kyc --network ethereum:local
ape run 1-mock-tokens --network ethereum:local
ape run 2-fake-tokens --network ethereum:local
ape run 3-fake-business --network ethereum:local

# 测试网 (Sepolia)
python scripts/deploy_project.py --project fake --network sepolia
```

### 部署后管理

部署完成后，访问管理后台 `/admin/contracts` 页面：

1. **查看部署状态** - 按项目分组展示所有合约
2. **检查依赖绑定** - 黄色标识表示需要更新
3. **更新依赖** - 点击确认按钮调用 set 函数
4. **清除部署记录** - 按项目分组清除数据库记录

### 部署记录查询

```sql
-- 查看活跃的部署记录
SELECT project, deploy_step, contract_name, contract_address, is_active
FROM deploy_info
WHERE network = 'local' AND is_active = true
ORDER BY project, deploy_step;

-- 查看依赖绑定状态
SELECT contract_name, dependency_name, bound_address, set_function
FROM contract_binding
WHERE network = 'local';
```

---

## 🧪 测试

### 后端测试

```bash
cd app/backend
pytest tests/ -v
```

### 前端测试

```bash
cd app/frontend/nextjs
npm run test
```

### 合约测试

```bash
cd app/backend
ape test tests/ -v
```

---

## 📊 API 端点

### 认证

| 方法 | 端点                   | 说明             |
| ---- | ---------------------- | ---------------- |
| POST | `/api/v1/auth/token`   | 获取 JWT Token   |
| POST | `/api/v1/auth/refresh` | 刷新 Token       |
| GET  | `/api/v1/auth/me`      | 获取当前用户信息 |

### 资产

| 方法 | 端点                   | 说明             |
| ---- | ---------------------- | ---------------- |
| GET  | `/api/v1/assets`       | 资产列表         |
| GET  | `/api/v1/assets/{id}`  | 资产详情         |
| POST | `/api/v1/admin/assets` | 创建资产 (Admin) |

### 认购

| 方法 | 端点                                | 说明         |
| ---- | ----------------------------------- | ------------ |
| GET  | `/api/v1/subscriptions`             | 用户认购列表 |
| POST | `/api/v1/subscriptions`             | 创建认购     |
| POST | `/api/v1/subscriptions/{id}/redeem` | 赎回         |
| POST | `/api/v1/subscriptions/preview`     | 预览收益     |

### 合约管理 (Admin)

| 方法   | 端点                                      | 说明                   |
| ------ | ----------------------------------------- | ---------------------- |
| GET    | `/api/v1/admin/contracts/status`          | 合约状态（含依赖检测） |
| POST   | `/api/v1/admin/contracts/confirm-binding` | 确认依赖绑定更新       |
| DELETE | `/api/v1/admin/contracts/reset`           | 清除部署记录（按项目） |
| DELETE | `/api/v1/admin/contracts/{project}/reset` | 清除指定项目部署记录   |

### KYC

| 方法 | 端点                       | 说明             |
| ---- | -------------------------- | ---------------- |
| GET  | `/api/v1/kyc/status`       | 用户 KYC 状态    |
| POST | `/api/v1/kyc/apply`        | 提交 KYC 申请    |
| POST | `/api/v1/kyc/admin/review` | 审核 KYC (Admin) |

### 开发者工具 (仅 local/test 环境)

| 方法 | 端点                           | 说明                             |
| ---- | ------------------------------ | -------------------------------- |
| GET  | `/api/v1/dev/reset/info`       | 获取可重置数据统计               |
| POST | `/api/v1/dev/reset`            | 重置测试数据                     |
| GET  | `/api/v1/dev/environment`      | 获取环境信息                     |
| GET  | `/api/v1/dev/token-recipients` | 获取可接收代币的用户列表 (Admin) |

---

## 🔧 配置

### 环境变量

```yaml
# config.local.yaml
environment: "local"
debug: true

db:
  backend: "postgresql"

postgresql:
  host: "localhost"
  port: 5432
  user: "postgres"
  password: "your-password"
  database: "rwa"

crypto:
  mainnet_url: "http://127.0.0.1:8545"
```

### Ape 配置

```yaml
# ape-config.yaml
name: RWA

vyper:
  version: 0.4.0

node:
  ethereum:
    local:
      uri: http://127.0.0.1:8545
```

### 添加新项目

在 `app/backend/src/domains/contract/service.py` 中添加项目配置：

```python
PROJECT_CONFIG = {
    "common": {...},
    "mock": {...},
    "fake": {...},
    # 添加新项目
    "newproject": {
        "label": "新项目名称",
        "description": "项目描述",
        "color": "purple",
        "order": 3,
    },
}
```

然后创建对应的部署脚本 `2-newproject-tokens.py`、`3-newproject-business.py` 等。

---

## 📚 文档

| 文档        | 链接                                                                 | 说明         |
| ----------- | -------------------------------------------------------------------- | ------------ |
| 产品需求    | [bmad_docs/prd.md](./bmad_docs/prd.md)                                         | PRD 完整需求 |
| 架构设计    | [bmad_docs/architecture.md](./bmad_docs/architecture.md)                       | 技术架构决策 |
| Epic 分解   | [bmad_docs/epics.md](./bmad_docs/epics.md)                                     | 故事和任务   |
| UX 设计     | [bmad_docs/ux-design-specification.md](./bmad_docs/ux-design-specification.md) | 界面设计规范 |
| Sprint 状态 | [bmad_docs/sprint-artifacts/](./bmad_docs/sprint-artifacts/)                   | 开发进度追踪 |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## ⚠️ 免责声明

**本项目仅供学习和开发用途。主网部署前请进行完整的安全审计！**

涉及真实资产的代币化需要遵守相关法律法规，请咨询专业法律顾问。

---

## 🔗 相关链接

- [Vyper 文档](https://docs.vyperlang.org/)
- [Ape Framework](https://docs.apeworx.io/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Wagmi 文档](https://wagmi.sh/)
- [Ant Design](https://ant.design/)

---

<div align="center">

**Made with ❤️ by SuperCrypto Team**

⭐ 如果觉得有用，请给个星标！

</div>
