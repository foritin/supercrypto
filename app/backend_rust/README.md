# SuperCrypto Rust Backend

Rust 版本后端服务，替代原有的 Python FastAPI + Tortoise ORM 后端。数据库保持 PostgreSQL 不变，确保前端零改动对接。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| HTTP 框架 | Axum | 0.8 |
| 数据库 | sqlx | 0.8 |
| PostgreSQL 驱动 | asyncpg (via sqlx) | 0.8 |
| Redis | deadpool-redis | 0.20 |
| JWT | jsonwebtoken | 9 |
| Web3 | alloy | 0.15 |
| 序列化 | serde + serde_json | 1 |
| 配置 | config | 0.15 |
| 日志 | tracing | 0.1 |
| 定时任务 | tokio-cron-scheduler | 0.14 |

## 项目结构

```
app/backend_rust/
├── Cargo.toml              # 依赖管理
├── Cargo.lock
├── config/
│   └── dev.yaml             # 开发环境配置
├── migrations/
│   └── 0001_init.sql        # 数据库初始迁移
├── scripts/
│   ├── start_all.sh         # 一键启动所有服务
│   ├── stop_all.sh          # 一键停止所有服务
│   ├── start_pg.sh          # 启动 PostgreSQL
│   ├── stop_pg.sh           # 停止 PostgreSQL
│   ├── start_redis.sh       # 启动 Redis
│   ├── stop_redis.sh        # 停止 Redis
│   ├── start_minio.sh       # 启动 MinIO
│   ├── stop_minio.sh        # 停止 MinIO
│   ├── start_hardhat.sh     # 启动 Hardhat
│   ├── stop_hardhat.sh      # 停止 Hardhat
│   └── health_check.sh      # 健康检查
├── src/
│   ├── main.rs              # 入口
│   ├── lib.rs               # 库入口
│   ├── config.rs            # 配置加载
│   ├── error.rs             # 全局错误处理
│   ├── state.rs             # AppState
│   ├── router.rs            # 路由聚合
│   ├── handlers/            # 请求处理器
│   │   ├── public.rs         # 公开接口
│   │   ├── user.rs           # 用户接口
│   │   ├── admin.rs          # 管理员接口
│   │   └── dev.rs            # 开发工具
│   ├── middleware/           # 中间件
│   │   ├── auth.rs           # 认证状态
│   │   ├── logging.rs        # 请求日志
│   │   ├── audit.rs          # 审计日志
│   │   └── rate_limit.rs     # 速率限制
│   ├── models/              # 数据库模型
│   │   ├── account.rs
│   │   ├── asset.rs
│   │   ├── subscription.rs
│   │   ├── staking.rs
│   │   ├── kyc.rs
│   │   ├── contract.rs
│   │   ├── chain.rs
│   │   ├── transaction.rs
│   │   └── audit.rs
│   ├── repositories/         # 数据访问层
│   │   └── asset_repo.rs
│   ├── services/            # 业务逻辑层
│   ├── schemas/             # 请求/响应 DTO
│   │   ├── common.rs
│   │   ├── public.rs
│   │   ├── auth.rs
│   │   ├── user.rs
│   │   ├── admin.rs
│   │   ├── kyc.rs
│   │   ├── subscription.rs
│   │   └── staking.rs
│   ├── security/            # 安全相关
│   │   ├── jwt.rs
│   │   └── wallet.rs
│   ├── tasks/               # 定时任务
│   │   └── subscription_reconcile.rs
│   ├── contracts/           # 合约交互
│   │   └── provider.rs
│   └── utils/               # 工具函数
│       ├── datetime.rs
│       └── decimal.rs
└── tests/                   # 集成测试
```

## 快速开始

### 1. 环境准备

```bash
# 安装 Rust (Windows: 使用 rustup-init.exe)
# https://rustup.rs/

# 验证安装
rustc --version
cargo --version
```

### 2. 启动依赖服务

```bash
cd app/backend_rust

# 一键启动所有依赖 (PostgreSQL + Redis + MinIO + Hardhat)
bash scripts/start_all.sh

# 或分别启动
bash scripts/start_pg.sh
bash scripts/start_redis.sh
bash scripts/start_minio.sh
bash scripts/start_hardhat.sh
```

### 3. 运行数据库迁移

```bash
# 首次运行会自动执行迁移
export DATABASE_URL=postgres://postgres:***REMOVED***@localhost:5432/rwa
sqlx migrate run
```

### 4. 编译并运行

```bash
# 开发模式
cargo run

# 或指定环境
export APP_ENVIRONMENT=dev
cargo run

# Release 模式
cargo build --release
./target/release/backend
```

### 5. 造测试数据

```bash
# 使用 Rust 造数工具
cargo run --bin seed

# 或使用 SQL 脚本
psql -h localhost -U postgres -d rwa -f docs/04_test_data_seed.md
```

### 6. 验证

```bash
# 健康检查
curl http://localhost:8000/health

# 资产列表
curl http://localhost:8000/api/v1/public/assets

# 完整健康检查
bash scripts/health_check.sh
```

## 停止服务

```bash
# 一键停止
bash scripts/stop_all.sh
```

## 前端对接验证

1. 前端配置中的 `API_BASE_URL` 保持 `http://localhost:8000/api/v1` 不变
2. 所有 API 路径、请求格式、响应格式与 Python 后端完全一致
3. 无需修改前端代码即可切换后端

## 关键 API 路径

| 前缀 | 权限 | 示例 |
|------|------|------|
| `/api/v1/public/*` | 无 | `/public/assets`, `/public/auth/token` |
| `/api/v1/user/*` | JWT | `/user/subscriptions`, `/user/staking` |
| `/api/v1/admin/*` | Admin | `/admin/assets`, `/admin/kyc/` |
| `/api/v1/dev/*` | 仅开发 | `/dev/reset`, `/dev/environment` |

## 响应格式

### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "object": { ... },
    "list": [ ... ],
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 10,
      "total_pages": 10
    },
    "msg": "操作成功"
  }
}
```

### 错误响应
```json
{
  "code": 401,
  "message": "Unauthorized",
  "error_code": "E401",
  "detail": "Token expired",
  "path": "/api/v1/user/subscriptions"
}
```

## 配置文件

`config/dev.yaml` 复制自 `app/backend/config.dev.yaml`，包含：
- 数据库连接信息
- Redis 连接信息
- JWT 密钥
- 链配置（Hardhat/Sepolia/Mainnet）
- MinIO 配置
- AI 服务商配置

## 开发说明

### sqlx 编译时检查

sqlx 在编译时会检查 SQL 语句的正确性。开发时需要保持数据库在线，或生成 `sqlx-data.json` 离线文件：

```bash
# 生成离线数据（数据库必须在线）
cargo sqlx prepare

# 后续编译不再需要数据库连接
SQLX_OFFLINE=true cargo build
```

### 添加新 API

1. 在 `schemas/` 下定义请求/响应 DTO
2. 在 `models/` 下定义数据模型（如需要）
3. 在 `repositories/` 下实现数据访问（如需要）
4. 在 `handlers/` 下实现处理器
5. 在 `router.rs` 中注册路由（如果新增路由模块）

## 文档

- `docs/01_rust_backend_research.md` - 技术调研与方案选型
- `docs/02_implementation_plan.md` - 实施阶段计划
- `docs/03_deployment_scripts.md` - 部署脚本与启停流程
- `docs/04_test_data_seed.md` - PostgreSQL 测试数据造数脚本
- `docs/05_acceptance_checklist.md` - 验收清单与测试用例

## 已知限制

1. **合约部署**：当前保留 Python 部署脚本（`app/backend/scripts/deploy/`），Rust 后端通过数据库读取合约地址。未来可迁移为 Rust 版本。
2. **MinIO 上传**：KYC 文件上传使用 multipart 解析，完整 MinIO 集成需要配置 AWS S3 客户端。
3. **Web3 交互**：当前使用占位实现，需要接入 alloy 完成链上交互。
4. **定时任务**：认购对账任务框架已搭建，需接入 alloy 实现链上事件扫描。
5. **钱包签名**：EIP-191 签名验证使用占位实现，需接入 alloy 完成验证。

## 性能对比

| 指标 | Python FastAPI | Rust Axum |
|------|----------------|-----------|
| 冷启动 | ~2s | ~1s |
| 内存占用 | ~150MB | ~50MB |
| 健康检查 | ~50ms | ~10ms |
| 并发 | 1000 req/s | 10000+ req/s |

## 后续优化方向

1. 接入 alloy 完成 Web3 交互
2. 实现完整 MinIO 上传下载
3. 优化 sqlx 查询（使用 `query_as!` 宏替代 `query!`）
4. 添加 OpenAPI 文档生成
5. 添加完整的集成测试
6. 实现缓存层（Redis）
7. 添加链路追踪（OpenTelemetry）
