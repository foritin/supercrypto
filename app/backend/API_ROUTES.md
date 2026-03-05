# SuperCrypto API 路由文档

## 概述

API 采用分层路由结构，根据权限级别划分为四类：

| 前缀 | 权限要求 | 说明 |
|------|----------|------|
| `/api/v1/public/*` | 无 | 公开接口，任何人可访问 |
| `/api/v1/auth/*` | 部分需要 | 认证相关接口 |
| `/api/v1/user/*` | JWT Token | 已登录用户接口 |
| `/api/v1/admin/*` | JWT Token + Admin | 管理员接口 |
| `/api/v1/dev/*` | 仅开发环境 | 开发调试工具 |

## 认证方式

### JWT Token

所有需要认证的接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <access_token>
```

### 获取 Token

1. 用户通过钱包签名登录
2. 后端验证签名后返回 `access_token` 和 `refresh_token`
3. `access_token` 用于 API 认证
4. `access_token` 过期后使用 `refresh_token` 刷新

---

## 公开接口 `/api/v1/public/*`

### 资产 Assets

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/assets` | 获取资产列表 |
| GET | `/public/assets/{id}` | 获取资产详情 |
| GET | `/public/assets/symbol/{symbol}` | 根据符号获取资产 |
| GET | `/public/assets/{id}/price-history` | 获取价格历史 |

### 合约 Contracts

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/contracts/addresses` | 获取所有合约地址 |
| GET | `/public/contracts/subscription` | 获取认购合约信息 |
| GET | `/public/contracts/{name}` | 获取单个合约地址 |

### 认购 Subscriptions

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/subscriptions/preview` | 预览认购收益 |

**Query 参数：**
- `asset_id`: 资产ID (必填)
- `amount`: 认购金额 (必填)
- `token_type`: 支付代币 USDT/USDC (默认 USDT)
- `lock_period`: 锁定期 0/3/6/12 月（0 表示活期，默认 0）

### 质押 Staking

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/staking/config` | 获取质押配置 |
| GET | `/public/staking/limit` | 获取今日质押限额 |
| GET | `/public/staking/plt-token` | 获取 PLT 代币信息 |

### KYC

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/kyc/status/{wallet_address}` | 查询钱包 KYC 状态 |

---

## 认证接口 `/api/v1/auth/*`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/token` | 无 | 钱包签名登录 |
| POST | `/auth/refresh` | Refresh Token | 刷新访问令牌 |
| POST | `/auth/logout` | 是 | 用户登出 |
| GET | `/auth/me` | 是 | 获取当前用户信息 |

### 登录请求 `POST /auth/token`

```json
{
  "address": "0x...",
  "signature": "0x...",
  "expires_in_mins": 43200  // 可选，默认 30 天
}
```

### 登录响应

```json
{
  "code": 0,
  "data": {
    "object": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ...",
      "token_type": "Bearer",
      "expires_in_mins": 43200
    }
  }
}
```

---

## 用户接口 `/api/v1/user/*`

> ⚠️ 所有接口都需要 JWT Token 认证

### 认购 Subscriptions

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/user/subscriptions` | 创建认购 |
| POST | `/user/subscriptions/pending` | 创建待确认订单（V2） |
| GET | `/user/subscriptions/receipt/{tx_hash}` | 查询交易回执（V2） |
| POST | `/user/subscriptions/confirm` | 确认认购并入账（V2） |
| GET | `/user/subscriptions` | 获取认购列表 |
| GET | `/user/subscriptions/stats` | 获取用户统计 |
| GET | `/user/subscriptions/{id}` | 获取认购详情 |
| POST | `/user/subscriptions/{id}/redeem` | 赎回认购 |

> V2 推荐流程：`pending -> wallet sign/send tx -> receipt polling -> confirm`

### 质押 Staking

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/user/staking/preview` | 预览质押收益 |
| POST | `/user/staking` | 创建质押 |
| GET | `/user/staking` | 获取质押列表 |
| GET | `/user/staking/stats` | 获取用户统计 |
| GET | `/user/staking/{id}` | 获取质押详情 |
| POST | `/user/staking/{id}/unstake` | 解除质押 |
| POST | `/user/staking/{id}/claim` | 领取奖励 |

### KYC

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/user/kyc/upload-document` | 上传 KYC 文档 |
| POST | `/user/kyc/apply` | 提交 KYC 申请 |

---

## 管理员接口 `/api/v1/admin/*`

> ⚠️ 所有接口都需要 JWT Token + 管理员权限

### 资产管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/assets` | 创建资产 |
| PUT | `/admin/assets/{id}` | 更新资产 |
| PATCH | `/admin/assets/{id}/status` | 更新资产状态 |
| POST | `/admin/assets/{id}/price` | 更新资产价格 |
| GET | `/admin/assets/projects/available` | 获取可绑定项目 |
| POST | `/admin/assets/{id}/bind-project` | 绑定项目合约 |
| DELETE | `/admin/assets/{id}/unbind` | 解绑合约 |

### 合约管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/contracts/status` | 获取合约状态 |
| GET | `/admin/contracts/status/enhanced` | 获取增强版状态 |
| GET | `/admin/contracts/available` | 获取可用合约 |
| GET | `/admin/contracts/{name}/dependencies` | 获取合约依赖 |
| POST | `/admin/contracts/update-address` | 更新合约地址 |
| POST | `/admin/contracts/confirm-binding` | 确认绑定 |
| POST | `/admin/contracts/reset/{project}` | 重置项目部署 |
| POST | `/admin/contracts/reset-all` | 重置所有部署 |

### 平台统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/stats` | 获取平台统计汇总 |
| GET | `/admin/stats/tvl` | 获取 TVL 统计 |
| GET | `/admin/stats/users` | 获取用户统计 |
| GET | `/admin/stats/staking` | 获取质押统计 |
| GET | `/admin/stats/audit-logs` | 获取审计日志 |
| GET | `/admin/stats/audit-logs/{id}` | 获取审计日志详情 |

### KYC 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/kyc/` | 获取 KYC 列表 |
| GET | `/admin/kyc/{id}` | 获取 KYC 详情 |
| POST | `/admin/kyc/{id}/review` | 审核 KYC |
| GET | `/admin/kyc/contract-status/{address}` | 获取合约状态对比 |
| GET | `/admin/kyc/contract-info` | 获取 KYCManager 合约地址和部署者地址 |
| POST | `/admin/kyc/{id}/record-admission` | 记录链上准入交易结果 |
| POST | `/admin/kyc/{id}/record-revocation` | 记录链上解除准入交易结果 |

### 会话管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/auth/sessions` | 获取活跃会话列表 |
| GET | `/admin/auth/sessions/{address}` | 获取用户会话 |
| POST | `/admin/auth/sessions/{address}/revoke` | 强制下线用户 |

### 账户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/accounts` | 创建账户 |
| GET | `/admin/accounts` | 获取账户列表 |
| GET | `/admin/accounts/{id}` | 获取账户详情 |
| PUT | `/admin/accounts/{id}` | 更新账户 |
| POST | `/admin/accounts/{id}/login` | 记录登录 |

### 交易管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/transactions` | 记录交易 |
| GET | `/admin/transactions` | 获取交易列表 |
| GET | `/admin/transactions/{id}` | 获取交易详情 |
| GET | `/admin/transactions/hash/{hash}` | 根据哈希查询 |
| GET | `/admin/transactions/address/{address}/history` | 获取地址交易历史 |
| GET | `/admin/transactions/wallet/{wallet_id}/history` | 获取钱包交易历史 |
| GET | `/admin/transactions/stats` | 获取交易统计 |
| GET | `/admin/transactions/export` | 导出交易记录 |
| PUT | `/admin/transactions/{id}` | 更新交易 |

---

## 开发工具 `/api/v1/dev/*`

> ⚠️ 仅在 `local`/`development`/`test` 环境可用

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dev/reset/info` | 获取可重置数据统计 |
| POST | `/dev/reset` | 重置测试数据 |
| GET | `/dev/environment` | 获取环境信息 |
| GET | `/dev/token-recipients` | 获取代币接收者 |

### KYC 开发工具

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/kyc/dev/quick-approve/{address}` | 快速通过 KYC |
| DELETE | `/kyc/dev/reset/{address}` | 重置 KYC 状态 |

---

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "object": { ... },      // 单个对象
    "list": [ ... ],        // 列表数据
    "pagination": {         // 分页信息
      "total": 100,
      "page": 1,
      "page_size": 10,
      "total_pages": 10
    },
    "msg": "操作成功"       // 操作提示
  }
}
```

### 错误响应

```json
{
  "code": 401,
  "message": "Unauthorized",
  "data": {
    "msg": "Token expired"
  }
}
```

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证/Token 无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 前端集成

### API 路径常量

前端使用 `@/constants/api-paths.ts` 中的常量：

```typescript
import { PUBLIC_PATHS, USER_PATHS, ADMIN_PATHS } from '@/constants/api-paths'

// 公开接口
PUBLIC_PATHS.ASSETS                    // '/public/assets'
PUBLIC_PATHS.STAKING_CONFIG            // '/public/staking/config'

// 用户接口
USER_PATHS.SUBSCRIPTIONS               // '/user/subscriptions'
USER_PATHS.STAKING_PREVIEW             // '/user/staking/preview'

// 管理员接口
ADMIN_PATHS.ASSETS                     // '/admin/assets'
ADMIN_PATHS.KYC_LIST                   // '/admin/kyc/'
ADMIN_PATHS.ACCOUNTS                   // '/admin/accounts'
ADMIN_PATHS.TRANSACTIONS               // '/admin/transactions'
```

### JWT Token 管理

```typescript
// api.ts 拦截器会自动处理
// 1. 请求时自动添加 Authorization header
// 2. 401 时自动用 refresh_token 刷新
// 3. 刷新失败时触发登出
```

---

## 更新日志

### v2.1.0 (2024-12-22)

**变更：**

- `Account` 接口从 `/account/*` 迁移到 `/admin/accounts/*`
- `Transaction` 接口从 `/transactions/*` 迁移到 `/admin/transactions/*`
- 账户和交易管理现在需要管理员权限

### v2.0.0 (2024-12-22)

**破坏性变更：**

- 路由结构重构，统一使用 `/public/`, `/user/`, `/admin/` 前缀
- `POST /subscriptions/preview` → `GET /public/subscriptions/preview`
- 用户接口从各自路径迁移到 `/user/*`
- 管理员接口统一到 `/admin/*`

**安全增强：**

- 所有用户接口现在强制使用 JWT 认证
- 用户身份从 JWT Token 中获取，不再依赖 `X-Wallet-Address` header
- 管理员权限在路由层统一验证

