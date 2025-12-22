# SuperCrypto - Web3加密货币管理平台

> 一个强大的Web3资产管理系统，支持多链钱包管理、交易追踪和账户体系

## 💡 项目简介

SuperCrypto是一个基于FastAPI构建的Web3加密货币管理平台，帮助用户和开发者轻松管理多链加密资产。

### 核心功能

- **📱 账户管理** - 创建和管理加密货币账户，支持多网络环境（开发/测试/主网）
- **💼 钱包管理** - 生成/导入钱包，支持Ethereum、BSC、Polygon等主流EVM链
- **💸 资产操作** - 实时余额查询、转账、交易记录追踪
- **📊 数据分析** - 交易历史统计、资产汇总、地址活动分析
- **🔐 安全可靠** - 私钥加密存储、JWT认证、完善的权限控制
- **🏢 RWA 资产管理** - 实物资产代币化、多合约绑定、价格预言机
- **📝 KYC 认证** - 用户身份认证、合规审核流程
- **⚙️ 智能合约管理** - 合约部署追踪、依赖同步、数据库驱动配置

### 适用场景

- **个人资产管理** - 统一管理多个钱包和链上资产
- **交易所/钱包服务** - 快速搭建钱包管理后端
- **DApp开发** - 作为Web3应用的钱包管理服务
- **区块链数据分析** - 收集和分析链上交易数据

## 🚀 快速开始

### 环境要求

- Python 3.10+
- MySQL 5.7+ / PostgreSQL 12+ / SQLite
- （可选）Redis用于缓存

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/yourname/supercrypto.git
cd supercrypto/app/backend
```

#### 2. 安装依赖

```bash
# 使用pip
pip install -r requirements.txt

# 或使用uv（推荐，更快）
uv pip install -r requirements.txt
```

#### 3. 配置环境

复制配置模板并修改：

```bash
cp config.dev.yaml config.local.yaml
```

编辑 `config.local.yaml`：

```yaml
app_name: SuperCrypto
debug: true
environment: dev

db:
  type: mysql              # 或 postgresql, sqlite
  host: localhost
  port: 3306
  database: supercrypto
  user: root
  password: your_password

jwt_secret: your-super-secret-key-change-in-production
```

#### 4. 初始化数据库

```bash
# 初始化迁移工具
aerich init -t src.db.TORTOISE_ORM

# 生成数据库表
aerich init-db

# 或手动升级
aerich migrate --name init
aerich upgrade
```

#### 5. 启动服务

```bash
python main.py
```

服务将在 http://localhost:8000 启动

### 验证安装

访问以下地址验证服务：

- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health
- **API根路径**: http://localhost:8000/api/v1

## 📖 使用指南

### API 架构概览

API v2 采用分层路由结构，按认证级别组织：

```
/api/v1/
├── /public/*      # 公开接口（无需认证）
├── /auth/*        # 认证相关
├── /user/*        # 用户接口（需要 JWT）
├── /admin/*       # 管理员接口（需要 JWT + 管理员权限）
└── /dev/*         # 开发工具（仅开发环境）
```

> **详细路由文档**: 参见 [API_ROUTES.md](./API_ROUTES.md)

### API 端点示例

#### 认证 `/api/v1/auth`

```bash
# 获取 nonce（用于钱包签名）
curl "http://localhost:8000/api/v1/auth/nonce?address=0x742d35Cc..."

# 钱包登录（获取 JWT）
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc...",
    "signature": "0x..."
  }'

# 响应包含 access_token，后续请求需携带
```

#### 公开接口 `/api/v1/public`

```bash
# 获取资产列表
curl "http://localhost:8000/api/v1/public/assets?status=active&page=1&page_size=10"

# 获取资产详情
curl "http://localhost:8000/api/v1/public/assets/1"

# KYC 状态查询
curl "http://localhost:8000/api/v1/public/kyc/0x742d35Cc.../status"

# 质押配置
curl "http://localhost:8000/api/v1/public/staking/config"

# 认购预览（计算收益）
curl "http://localhost:8000/api/v1/public/subscriptions/preview?asset_id=1&amount=1000&duration_months=12"
```

#### 用户接口 `/api/v1/user`（需要 JWT）

```bash
# 所有用户接口需要 Authorization 头
AUTH_HEADER="Authorization: Bearer <your_jwt_token>"

# 创建认购
curl -X POST "http://localhost:8000/api/v1/user/subscriptions" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": 1,
    "amount": "1000",
    "duration_months": 12
  }'

# 我的认购列表
curl "http://localhost:8000/api/v1/user/subscriptions" -H "$AUTH_HEADER"

# 我的质押列表
curl "http://localhost:8000/api/v1/user/staking" -H "$AUTH_HEADER"

# 创建质押
curl -X POST "http://localhost:8000/api/v1/user/staking" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"amount": "1000"}'

# 提交 KYC
curl -X POST "http://localhost:8000/api/v1/user/kyc/apply" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "张三",
    "id_type": "passport",
    "id_number": "E12345678"
  }'
```

#### 管理员接口 `/api/v1/admin`（需要 JWT + 管理员权限）

```bash
# 管理员接口需要管理员钱包签发的 JWT
ADMIN_AUTH="Authorization: Bearer <admin_jwt_token>"

# 创建资产
curl -X POST "http://localhost:8000/api/v1/admin/assets" \
  -H "$ADMIN_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manhattan Apartment",
    "symbol": "RWA001",
    "project": "fake",
    "total_supply": 1000000
  }'

# 获取可绑定的项目列表
curl "http://localhost:8000/api/v1/admin/assets/projects/available" \
  -H "$ADMIN_AUTH"

# 按项目批量绑定合约
curl -X POST "http://localhost:8000/api/v1/admin/assets/1/bind-project" \
  -H "$ADMIN_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"project": "fake", "set_primary": true}'

# KYC 审核列表
curl "http://localhost:8000/api/v1/admin/kyc" -H "$ADMIN_AUTH"

# 审核 KYC
curl -X POST "http://localhost:8000/api/v1/admin/kyc/1/review" \
  -H "$ADMIN_AUTH" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

#### 合约管理 `/api/v1/contracts`

```bash
# 获取所有合约地址（公开）
curl "http://localhost:8000/api/v1/contracts/addresses"

# 获取单个合约地址
curl "http://localhost:8000/api/v1/contracts/Subscription"
```

### 完整API文档

启动服务后访问 http://localhost:8000/docs 查看完整的交互式API文档。

## 🛠️ 技术栈

- **Web框架**: FastAPI - 高性能异步框架
- **ORM**: Tortoise ORM - 异步数据库操作
- **数据验证**: Pydantic - 强类型数据验证
- **区块链交互**: Web3.py - 以太坊区块链SDK
- **认证**: JWT - JSON Web Token
- **数据库迁移**: Aerich - Tortoise ORM迁移工具

## 🔒 安全注意事项

### 生产环境部署

⚠️ **重要安全提示**：

1. **修改JWT密钥**: 使用强随机密钥替换 `jwt_secret`
2. **加密私钥**: 生产环境必须使用强加密算法加密私钥
3. **HTTPS**: 生产环境必须使用HTTPS
4. **限制CORS**: 修改 `main.py` 中的CORS设置，只允许可信域名
5. **数据库安全**: 使用强密码，限制数据库访问权限
6. **备份策略**: 定期备份数据库和密钥

### 推荐配置

```yaml
# 生产环境配置
debug: false
environment: prod

# 使用环境变量存储敏感信息
jwt_secret: ${JWT_SECRET}  # 从环境变量读取
db:
  password: ${DB_PASSWORD}
```

## 📊 性能优化

- **连接池**: 数据库连接池已优化，支持高并发
- **异步IO**: 全异步架构，高效处理并发请求
- **缓存**: 可选集成Redis缓存余额查询等高频操作
- **批量操作**: 支持批量查询和更新

## 🐛 故障排查

### 常见问题

**Q: 数据库连接失败**
```bash
# 检查数据库服务是否运行
systemctl status mysql

# 验证配置文件中的数据库信息
cat config.local.yaml
```

**Q: RPC节点连接超时**
```bash
# 使用公共RPC节点或配置自己的节点
# 编辑 src/domains/wallet/blockchain.py
# 修改 rpc_urls 配置
```

**Q: 迁移失败**
```bash
# 重置迁移
aerich downgrade
aerich upgrade
```

## 📈 路线图

- [x] 基础账户和钱包管理
- [x] 多链支持（Ethereum、BSC、Polygon）
- [x] 交易记录和统计
- [x] RWA 资产管理 (数据库驱动)
- [x] KYC 认证流程
- [x] 智能合约部署追踪
- [x] 合约依赖同步检测
- [x] 多合约绑定架构
- [x] 按项目批量绑定/解绑合约
- [ ] Redis缓存集成
- [ ] 价格预言机集成
- [ ] NFT资产管理
- [ ] DeFi协议集成（Uniswap、Aave等）
- [ ] 实时价格订阅
- [ ] Webhook通知
- [ ] 批量操作优化

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 📄 开发文档

详细的开发者文档请查看 [GUIDE.md](./GUIDE.md)，包括：

- 完整架构说明
- 代码调用链路
- 添加新功能指南
- 最佳实践

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📮 联系方式

- 项目主页: https://github.com/yourname/supercrypto
- 提交Issue: https://github.com/yourname/supercrypto/issues
- 邮箱: contact@supercrypto.com

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
