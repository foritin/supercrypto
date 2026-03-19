# SuperCrypto 后端

> RWA 代币化投资平台后端服务，基于 FastAPI 构建的异步 Web3 API

## 技术栈

| 分类 | 技术 | 说明 |
|------|------|------|
| 语言 | Python 3.13+ | 异步优先 |
| Web 框架 | FastAPI + Uvicorn | 高性能异步框架 |
| ORM | Tortoise ORM | 异步 ORM |
| 数据库迁移 | Aerich | Tortoise ORM 迁移工具 |
| 数据库 | PostgreSQL (asyncpg) | 主数据库 |
| 缓存 | Redis | 缓存 / 消息 |
| 工具库 | falib (自研) | 配置管理 / 日志 / 适配器 |
| 日志 | Loguru | 结构化日志 |
| 区块链交互 | Web3.py | 链上读写 |
| 智能合约 | Vyper 0.4+ | 合约编写 |
| 合约框架 | Ape Framework | 编译 / 部署 / 测试 |
| 认证 | PyJWT | JWT 令牌 |
| 测试 | pytest + hypothesis | 单元测试 + 属性测试 |

## 目录结构

```
app/backend/
├── main.py                 # FastAPI 应用入口
├── config.dev.yaml         # 开发环境配置
├── config.prod.yaml        # 生产环境配置
├── pyproject.toml          # 项目依赖定义
├── ape-config.yaml         # Ape Framework 配置
├── src/
│   ├── api/                # API 路由层
│   │   └── v1/
│   │       ├── public/     # 公开接口（无需认证）
│   │       ├── user/       # 用户接口（需 JWT）
│   │       ├── admin/      # 管理员接口（需 Admin 权限）
│   │       └── dev/        # 开发工具（仅 dev/test 环境）
│   ├── models/             # Tortoise ORM 数据模型
│   ├── services/           # 业务逻辑层
│   │   ├── account/        # 账户管理
│   │   ├── auth/           # 认证服务
│   │   ├── kyc/            # KYC 认证
│   │   ├── asset/          # 资产管理
│   │   ├── subscription/   # 认购投资
│   │   ├── staking/        # 质押挖矿
│   │   ├── contract/       # 合约管理
│   │   ├── transaction/    # 交易记录
│   │   ├── audit/          # 审计日志
│   │   ├── admin/          # 管理后台
│   │   ├── project_registry/ # 项目注册
│   │   └── dev/            # 开发工具
│   ├── shared/             # 公共模块
│   │   ├── common/         # 通用工具（适配器、异常、指标）
│   │   ├── constants/      # 常量定义
│   │   ├── decorators/     # 装饰器
│   │   ├── middleware/     # 中间件（认证、审计、日志）
│   │   ├── schemas/        # Pydantic 数据模式
│   │   ├── security/       # 安全模块（JWT、加密、RBAC）
│   │   └── services/       # 共享服务
│   └── tasks/              # 定时任务
│       ├── contract_task.py    # 合约同步任务
│       └── kyc_sync_task.py    # KYC 链上同步任务
├── contracts/              # Vyper 智能合约
│   ├── common/             # 公共合约（KYCManager）
│   ├── interfaces/         # 合约接口
│   ├── projects/           # 项目业务合约
│   └── stablecoins/        # 稳定币合约（Mock）
├── migrations/             # Aerich 数据库迁移文件
│   └── models/
├── scripts/                # 部署和运维脚本
└── test/                   # 测试文件
    ├── api/                # API 集成测试
    ├── conftest.py         # 测试配置和 fixtures
    ├── test_*_service.py   # 服务层单元测试
    └── test_*_properties.py # 属性测试（hypothesis）
```

## 快速开始

### 环境要求

- Python 3.13+
- PostgreSQL
- Redis

### 安装

```bash
cd app/backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate

# 安装依赖
uv pip install -e ".[dev]"
```

### 配置

编辑 `config.dev.yaml`，配置数据库和 Redis 连接：

```yaml
environment: dev
debug: true
app_name: SuperCrypto

postgres:
  host: localhost
  port: 5432
  database: rwa
  user: postgres
  password: your_password
  models: src.models

redis:
  host: localhost
  port: 6379
  db: 0
```

### 数据库迁移

```bash
source .venv/bin/activate

# 执行迁移
PYTHONPATH=. aerich upgrade
```

### 启动服务

```bash
source .venv/bin/activate
python main.py
```

服务启动后访问：

- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

## API 路由结构

API 采用四层路由结构，按认证级别组织：

```
/api/v1/
├── /public/*     公开接口（无需认证）
├── /user/*       用户接口（需要 JWT）
├── /admin/*      管理员接口（需要 JWT + Admin 权限）
└── /dev/*        开发工具（仅 dev/test 环境）
```

### Public 层 `/api/v1/public/`

| 模块 | 说明 |
|------|------|
| auth | 获取 nonce、钱包签名登录 |
| assets | 资产列表、资产详情 |
| contracts | 合约地址查询 |
| chains | 链信息查询 |
| constants | 常量定义 |
| kyc | KYC 状态查询 |
| staking | 质押配置查询 |
| subscriptions | 认购预览 |

### User 层 `/api/v1/user/`

| 模块 | 说明 |
|------|------|
| auth | 当前用户信息 |
| kyc | 提交 KYC 申请 |
| subscriptions | 认购 V1/V2（pending、receipt、confirm、列表） |
| staking | 创建质押、我的质押列表 |
| transactions_audit | 用户交易审计记录 |

### Admin 层 `/api/v1/admin/`

| 模块 | 说明 |
|------|------|
| assets | 资产 CRUD、合约绑定 |
| contracts | 合约注册、部署管理 |
| kyc | KYC 审核 |
| accounts | 账户管理 |
| audit | 审计日志 |
| stats | 统计数据 |
| transactions | 交易管理 |
| transactions_audit | 交易审计 |
| auth | 管理员认证 |

### Dev 层 `/api/v1/dev/`

| 模块 | 说明 |
|------|------|
| tools | 环境信息、数据重置 |
| kyc | KYC 快速审批（测试用） |

## 服务层模块

| 模块 | 职责 | 关键方法 |
|------|------|---------|
| auth | 钱包签名认证、JWT 生成 | `get_nonce()`, `verify_signature()`, `generate_token()` |
| account | 账户创建与管理 | `get_or_create_account()`, `get_account_by_address()` |
| kyc | KYC 申请、审核、链上同步 | `apply_kyc()`, `review_kyc()`, `sync_to_chain()` |
| asset | 资产 CRUD、合约绑定 | `create_asset()`, `bind_contracts()`, `get_asset_detail()` |
| subscription | 认购投资、收益计算 | `create_subscription()`, `preview_earnings()` |
| staking | 质押挖矿、奖励分发 | `create_staking()`, `calculate_rewards()` |
| contract | 合约部署追踪、依赖同步 | `sync_provider_registry()`, `get_contract_status()` |
| transaction | 交易记录管理 | `record_transaction()`, `get_transaction_history()` |
| audit | 审计日志记录 | `log_audit_event()` |
| project_registry | 项目注册管理 | `sync_registry()`, `get_project_contracts()` |
| admin | 管理后台统计 | `get_dashboard_stats()` |
| dev | 开发环境工具 | `reset_data()`, `quick_approve_kyc()` |

## 测试

```bash
cd app/backend
source .venv/bin/activate

# 运行所有测试
PYTHONPATH=. python -m pytest test/ -v

# 运行特定测试文件
PYTHONPATH=. python -m pytest test/test_auth_service.py -v

# 运行属性测试
PYTHONPATH=. python -m pytest test/test_*_properties.py -v

# 运行 API 集成测试
PYTHONPATH=. python -m pytest test/api/ -v

# 带覆盖率
PYTHONPATH=. python -m pytest test/ --cov=src --cov-report=html
```

测试框架：
- **pytest** — 单元测试和集成测试
- **hypothesis** — 属性测试，验证业务不变量

## 导航

- [← 返回项目根目录](../../README.md)
- [← 返回 App 目录](../README.md)
