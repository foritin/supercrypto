# 通用审计系统

## 📋 概述

本系统实现了企业级的通用审计日志系统，适用于加密货币钱包平台，满足以下需求：
- ✅ 完整的操作历史追溯
- ✅ 金融合规审计要求
- ✅ 区块链操作记录
- ✅ 安全事件监控
- ✅ 灵活的扩展能力

支持的操作类型：
- 账户操作（创建、封禁、删除等）
- 权限变更（授予、撤销）
- 合约操作（部署、调用、管理员操作等）
- 资产操作（充值、提现、转账等）
- 认证操作（登录、登出、密码修改等）
- 系统操作（配置更新、维护等）

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    业务层 (API)                          │
│  - 账户管理  - 权限管理  - 合约操作  - 资产管理         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│                 模型层 (Models)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Account      │  │ Permission   │  │ Contract     │  │
│  │ (账户)       │  │ (权限)       │  │ (合约)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            ↓                             │
│                  ┌──────────────────┐                    │
│                  │   AuditLog       │                    │
│                  │  (通用审计表)    │                    │
│                  └──────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    数据层 (Database)                     │
│  - 当前状态表  - 审计日志表  - 索引优化                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

```
app/backend/src/models/
├── base.py                      # 基础模型和混入类
│   ├── AbstractModel            # 抽象基类
│   ├── TimestampMixin           # 时间戳混入
│   ├── SoftDeleteMixin          # 软删除混入
│   └── BlockableMixin           # 可封禁混入
│
├── audit.py                     # 通用审计系统 ⭐
│   ├── AuditCategory            # 审计类别枚举
│   ├── AuditAction              # 操作类型枚举
│   ├── AuditStatus              # 操作状态枚举
│   ├── AuditLog                 # 审计日志模型
│   ├── log_audit()              # 记录审计日志
│   ├── query_audit_logs()       # 查询审计日志
│   └── ...                      # 其他辅助函数
│
├── account.py                   # 账户和权限模型
│   ├── Account                  # 账户表
│   ├── RoutePermission          # 路由权限表
│   ├── AccountPermission        # 账户权限当前状态表
│   ├── grant_permission()       # 授予权限（自动审计）
│   ├── revoke_permission()      # 撤销权限（自动审计）
│   └── get_permission_history() # 查询权限历史
│
└── README.md                    # 本文档
```

---

## 📊 数据库表设计

### 1. `audit_log` - 通用审计日志表

```sql
CREATE TABLE audit_log (
    -- 主键
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    
    -- 审计分类
    category            VARCHAR(50) NOT NULL,         -- 审计类别
    action              VARCHAR(100) NOT NULL,        -- 操作类型
    status              VARCHAR(20) DEFAULT 'success',-- 操作状态
    
    -- 操作者信息
    operator_id         INT,                          -- 操作者账户ID
    operator_address    VARCHAR(128),                 -- 操作者钱包地址
    operator_type       VARCHAR(50),                  -- 操作者类型
    
    -- 目标信息
    target_id           INT,                          -- 目标对象ID
    target_type         VARCHAR(50),                  -- 目标对象类型
    target_address      VARCHAR(128),                 -- 目标钱包地址
    
    -- 操作详情
    reason              TEXT,                         -- 操作原因
    description         TEXT,                         -- 操作描述
    old_value           JSON,                         -- 操作前的值
    new_value           JSON,                         -- 操作后的值
    extra_data          JSON,                         -- 额外数据
    
    -- 请求信息
    ip_address          VARCHAR(45),                  -- 操作IP
    user_agent          VARCHAR(500),                 -- 用户代理
    request_id          VARCHAR(64),                  -- 请求ID
    
    -- 区块链相关
    tx_hash             VARCHAR(128),                 -- 交易哈希
    block_number        BIGINT,                       -- 区块高度
    gas_used            BIGINT,                       -- Gas消耗
    
    -- 时间和性能
    operated_at         TIMESTAMP NOT NULL,           -- 操作时间
    duration_ms         INT,                          -- 操作耗时
    
    -- 错误信息
    error_code          VARCHAR(50),                  -- 错误码
    error_message       TEXT,                         -- 错误信息
    
    -- 索引
    INDEX idx_operator (operator_id, operated_at DESC),
    INDEX idx_target (target_type, target_id, operated_at DESC),
    INDEX idx_category_action (category, action, operated_at DESC),
    INDEX idx_status (status, operated_at DESC),
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_ip (ip_address)
);
```

### 2. `account_permission` - 账户权限当前状态表

```sql
CREATE TABLE account_permission (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    account_id          INT NOT NULL,
    permission_id       INT NOT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    granted_at          TIMESTAMP,
    granted_by          VARCHAR(128),
    last_modified_at    TIMESTAMP,
    last_modified_by    VARCHAR(128),
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,
    
    UNIQUE KEY (account_id, permission_id),
    INDEX idx_active (is_active)
);
```

---

## 🎯 设计模式

### 双表设计 - 状态表 + 审计表

```
┌─────────────────────┐
│ AccountPermission   │  ← 当前状态表（只保存最新状态）
│ ─────────────────   │
│ account_id: 1       │
│ permission_id: 10   │
│ is_active: True     │  ✅ 查询快速
│ granted_at: ...     │  ✅ 数据量小
└─────────────────────┘

            ↓ 每次操作都记录

┌─────────────────────┐
│ AuditLog            │  ← 审计日志表（完整历史）
│ ─────────────────   │
│ [1] GRANT  @ 10:00  │
│ [2] REVOKE @ 15:00  │  ✅ 完整历史
│ [3] GRANT  @ 18:00  │  ✅ 可追溯
│ [4] REVOKE @ 20:00  │  ✅ 审计合规
└─────────────────────┘
```

**优势**：
- ✅ 统一的审计接口
- ✅ 支持所有业务类型
- ✅ 灵活的扩展能力
- ✅ 方便的跨业务查询

**劣势与解决方案**：
- ⚠️ 单表数据量大 → 按时间分区（按月/按季度）
- ⚠️ JSON 字段查询性能较低 → 为常用查询创建物化视图

---

## 🔧 核心功能

### 审计类别 (AuditCategory)

```python
ACCOUNT     # 账户操作
PERMISSION  # 权限变更
CONTRACT    # 合约操作
ASSET       # 资产操作
AUTH        # 认证操作
SYSTEM      # 系统操作
```

### 操作类型 (AuditAction)

```python
# 账户
account.create, account.block, account.delete

# 权限
permission.grant, permission.revoke

# 合约
contract.deploy, contract.pause, contract.admin_add

# 资产
asset.deposit, asset.withdraw, asset.transfer

# 认证
auth.login, auth.login_failed, auth.logout
```

### 操作状态 (AuditStatus)

```python
SUCCESS   # 成功
FAILED    # 失败
PENDING   # 待处理
REVERTED  # 已回滚
```

---

## 📝 使用示例

### 1. 权限操作审计

#### 授予权限

```python
from src.models.account import grant_permission

# 授予管理员权限
await grant_permission(
    account_id=1,
    permission_id=10,
    operator_id=999,  # 操作者账户ID
    operator_address="0xadmin...",
    reason="新入职管理员",
    ip_address="192.168.1.100",
    user_agent="Mozilla/5.0...",
    request_id="req-123456"
)

# 审计日志自动记录：
# - category: PERMISSION
# - action: PERMISSION_GRANT
# - operator_id: 999
# - target_id: 1 (被授权的账户)
# - target_type: Account
```

#### 撤销权限

```python
from src.models.account import revoke_permission

await revoke_permission(
    account_id=1,
    permission_id=10,
    operator_id=999,
    reason="员工离职",
    ip_address="192.168.1.100"
)
```

---

### 2. 账户操作审计

#### 账户封禁

```python
from src.models.audit import log_audit, AuditCategory, AuditAction

account = await Account.get(id=1)

# 封禁前记录
await log_audit(
    category=AuditCategory.ACCOUNT,
    action=AuditAction.ACCOUNT_BLOCK,
    operator_id=admin_id,
    operator_address="0xadmin...",
    target_id=account.id,
    target_type="Account",
    target_address=account.address,
    reason="涉嫌洗钱活动",
    old_value={"is_blocked": False},
    new_value={"is_blocked": True},
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)

# 执行封禁
await account.block(reason="涉嫌洗钱活动", blocked_by="admin")
```

#### 账户创建

```python
await log_audit(
    category=AuditCategory.ACCOUNT,
    action=AuditAction.ACCOUNT_CREATE,
    target_id=new_account.id,
    target_type="Account",
    target_address=new_account.address,
    operator_type="system",
    description=f"创建账户: {new_account.address}",
    ip_address=request.client.host
)
```

---

### 3. 认证操作审计

#### 登录成功

```python
await log_audit(
    category=AuditCategory.AUTH,
    action=AuditAction.AUTH_LOGIN,
    status=AuditStatus.SUCCESS,
    operator_id=account.id,
    operator_address=account.address,
    ip_address="192.168.1.100",
    user_agent="Mozilla/5.0...",
    description="用户登录成功"
)
```

#### 登录失败

```python
await log_audit(
    category=AuditCategory.AUTH,
    action=AuditAction.AUTH_LOGIN_FAILED,
    status=AuditStatus.FAILED,
    operator_address="0x123...",  # 尝试登录的地址
    ip_address="192.168.1.100",
    error_code="INVALID_SIGNATURE",
    error_message="签名验证失败",
    description="登录失败：签名验证失败"
)
```

---

### 4. 合约操作审计

#### 合约部署

```python
await log_audit(
    category=AuditCategory.CONTRACT,
    action=AuditAction.CONTRACT_DEPLOY,
    operator_id=deployer_id,
    operator_address=deployer_address,
    target_address=contract_address,
    target_type="Contract",
    tx_hash=tx_hash,
    block_number=block_number,
    gas_used=gas_used,
    extra_data={
        "contract_name": "MyToken",
        "contract_type": "ERC20",
        "constructor_args": {...}
    },
    description="部署 MyToken 合约"
)
```

#### 合约暂停/恢复

```python
await log_audit(
    category=AuditCategory.CONTRACT,
    action=AuditAction.CONTRACT_PAUSE,
    operator_id=admin_id,
    operator_address=admin_address,
    target_address=contract_address,
    target_type="Contract",
    tx_hash=tx_hash,
    reason="检测到安全漏洞，紧急暂停",
    old_value={"paused": False},
    new_value={"paused": True}
)
```

---

### 5. 资产操作审计

#### 充值

```python
await log_audit(
    category=AuditCategory.ASSET,
    action=AuditAction.ASSET_DEPOSIT,
    operator_id=user_id,
    operator_address=user_address,
    target_address=contract_address,
    target_type="Contract",
    tx_hash=tx_hash,
    block_number=block_number,
    gas_used=gas_used,
    extra_data={
        "token": "USDT",
        "amount": "1000.00",
        "from_chain": "ethereum",
        "to_chain": "polygon"
    },
    description="跨链充值 1000 USDT"
)
```

#### 提现

```python
await log_audit(
    category=AuditCategory.ASSET,
    action=AuditAction.ASSET_WITHDRAW,
    operator_id=user_id,
    operator_address=user_address,
    target_address=recipient_address,
    tx_hash=tx_hash,
    block_number=block_number,
    extra_data={
        "token": "ETH",
        "amount": "0.5",
        "recipient": recipient_address
    },
    description="提现 0.5 ETH"
)
```

---

## 🔍 查询审计日志

### 查询某用户的所有操作

```python
from src.models.audit import get_operator_audit_history

history = await get_operator_audit_history(operator_id=1, limit=50)

for log in history:
    print(f"{log.operated_at} | {log.action} | {log.status}")
```

### 查询某账户的所有权限变更

```python
from src.models.account import get_permission_history

history = await get_permission_history(account_id=1, limit=100)
```

### 查询某对象的操作历史

```python
from src.models.audit import get_target_audit_history

# 查询某个合约的所有操作
history = await get_target_audit_history(
    target_type="Contract",
    target_id=contract_id,
    limit=50
)
```

### 查询失败的操作

```python
from src.models.audit import get_failed_operations

failed_ops = await get_failed_operations(limit=100)

for op in failed_ops:
    print(f"{op.operated_at} | {op.action} | {op.error_message}")
```

### 查询安全事件

```python
from src.models.audit import get_security_events

security_events = await get_security_events(limit=100)

# 包括：
# - 账户封禁
# - 登录失败
# - 权限撤销
```

### 高级查询

```python
from src.models.audit import query_audit_logs, AuditCategory, AuditAction
from datetime import datetime, timedelta

# 查询最近24小时的合约操作
logs = await query_audit_logs(
    category=AuditCategory.CONTRACT,
    start_time=datetime.utcnow() - timedelta(hours=24),
    limit=100
)

# 查询某个操作者的失败操作
logs = await query_audit_logs(
    operator_id=1,
    status=AuditStatus.FAILED,
    limit=50
)

# 查询某个合约的暂停/恢复操作
logs = await query_audit_logs(
    category=AuditCategory.CONTRACT,
    action=AuditAction.CONTRACT_PAUSE,
    target_type="Contract",
    limit=20
)
```

---

## 🌐 在 API 层使用

### FastAPI 示例

```python
from fastapi import Request

@router.post("/permissions/grant")
async def grant_permission_api(
    request: Request,
    account_id: int,
    permission_id: int,
    current_user: Account = Depends(get_current_user)
):
    try:
        # 授予权限（自动记录审计日志）
        perm = await grant_permission(
            account_id=account_id,
            permission_id=permission_id,
            operator_id=current_user.id,
            operator_address=current_user.address,
            reason=f"通过 API 授予权限",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
            request_id=request.state.request_id  # 从中间件注入
        )
        
        return {"status": "success", "permission": perm}
    
    except Exception as e:
        # 记录失败操作
        await log_audit(
            category=AuditCategory.PERMISSION,
            action=AuditAction.PERMISSION_GRANT,
            status=AuditStatus.FAILED,
            operator_id=current_user.id,
            target_id=account_id,
            target_type="Account",
            error_message=str(e),
            ip_address=request.client.host
        )
        raise
```

---

## 📈 扩展指南

### 添加新的审计类别和操作类型

编辑 `src/models/audit.py`：

```python
class AuditCategory(str, Enum):
    # ... 现有类别
    NFT = "nft"                    # 添加 NFT 类别
    GOVERNANCE = "governance"      # 添加治理类别

class AuditAction(str, Enum):
    # ... 现有操作
    
    # NFT 操作
    NFT_MINT = "nft.mint"
    NFT_BURN = "nft.burn"
    NFT_TRANSFER = "nft.transfer"
    
    # 质押操作
    STAKE_DEPOSIT = "stake.deposit"
    STAKE_WITHDRAW = "stake.withdraw"
    
    # 治理操作
    GOVERNANCE_PROPOSAL_CREATE = "governance.proposal_create"
    GOVERNANCE_VOTE = "governance.vote"
```

### 在新业务中使用

```python
# nft.py
from src.models.audit import log_audit, AuditCategory, AuditAction

async def mint_nft(...):
    # 业务逻辑
    nft = await NFT.create(...)
    
    # 记录审计
    await log_audit(
        category=AuditCategory.NFT,
        action=AuditAction.NFT_MINT,
        operator_id=minter_id,
        target_id=nft.id,
        target_type="NFT",
        tx_hash=tx_hash,
        extra_data={"token_id": token_id, "metadata_uri": metadata_uri}
    )
    
    return nft
```

---

## 🔒 安全考虑

### 1. 审计日志不可篡改

```python
class AuditLog(AbstractModel):
    # 只追加，永不修改或删除
    # 建议设置数据库权限：只允许 INSERT，禁止 UPDATE/DELETE
    pass
```

### 2. 敏感信息脱敏

```python
await log_audit(
    ...
    extra_data={
        "private_key": "***REDACTED***",  # 敏感信息脱敏
        "password": "***REDACTED***"
    }
)
```

### 3. 定期备份

```bash
# 每日备份审计日志
mysqldump audit_log > audit_log_$(date +%Y%m%d).sql
```

---

## 📊 性能优化

### 1. 分区表

```sql
-- 按月分区
ALTER TABLE audit_log PARTITION BY RANGE (YEAR(operated_at) * 100 + MONTH(operated_at)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    ...
);
```

### 2. 归档策略

```python
# 归档6个月前的数据
async def archive_old_logs():
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    
    # 迁移到归档表
    old_logs = await AuditLog.filter(operated_at__lt=six_months_ago).all()
    # ... 迁移到冷存储
```

### 3. 异步记录

```python
# 使用消息队列异步记录
async def log_audit_async(...):
    # 发送到 Redis/RabbitMQ
    await redis.lpush("audit_queue", json.dumps(audit_data))
```

---

## 📋 合规报告

### 生成每日操作报告

```python
from datetime import datetime, timedelta

async def generate_daily_report():
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    today_end = today_start + timedelta(days=1)
    
    logs = await query_audit_logs(
        start_time=today_start,
        end_time=today_end,
        limit=10000
    )
    
    # 统计分析
    stats = {
        "total": len(logs),
        "by_category": {},
        "by_status": {},
        "failed_operations": []
    }
    
    for log in logs:
        # 按类别统计
        stats["by_category"][log.category] = stats["by_category"].get(log.category, 0) + 1
        
        # 按状态统计
        stats["by_status"][log.status] = stats["by_status"].get(log.status, 0) + 1
        
        # 收集失败操作
        if log.status == AuditStatus.FAILED:
            stats["failed_operations"].append({
                "action": log.action,
                "operator": log.operator_address,
                "error": log.error_message
            })
    
    return stats
```

### 监控异常操作

```python
# 检测频繁失败的登录
failed_logins = await AuditLog.filter(
    action=AuditAction.AUTH_LOGIN_FAILED,
    operated_at__gte=datetime.utcnow() - timedelta(hours=1)
).group_by("ip_address").count()

# 警报：同一IP 10分钟内失败5次
if failed_logins["count"] >= 5:
    send_alert("Possible brute force attack")
```

---

## 🎓 总结

### 优势

| 特性 | 说明 |
|------|------|
| ✅ 完整性 | 记录所有操作，支持完整追溯 |
| ✅ 灵活性 | 通用设计，支持所有业务类型 |
| ✅ 扩展性 | 枚举类型可轻松扩展 |
| ✅ 合规性 | 满足金融审计要求 |
| ✅ 性能 | 双表设计，查询高效 |
| ✅ 安全性 | 只追加，不可篡改 |

### 最佳实践

1. 🔸 所有关键操作都应记录审计日志
2. 🔸 敏感信息必须脱敏
3. 🔸 定期备份和归档
4. 🔸 监控异常操作和安全事件
5. 🔸 使用异步记录提升性能
6. 🔸 为常用查询创建索引

