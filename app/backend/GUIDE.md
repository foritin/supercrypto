# SuperCrypto 开发者指南

> 面向开发者的完整架构、设计和实现指南

## 📚 目录

- [架构设计](#架构设计)
- [目录结构](#目录结构)
- [分层架构](#分层架构)
- [数据流与调用链](#数据流与调用链)
- [领域设计](#领域设计)
- [开发指南](#开发指南)
- [最佳实践](#最佳实践)
- [测试](#测试)
- [部署](#部署)

---

## 架构设计

### 设计原则

SuperCrypto采用**轻量级DDD（领域驱动设计）架构**，核心设计原则：

1. **按业务领域划分** - 每个领域独立管理其业务逻辑
2. **保留ORM兼容性** - Models统一管理，便于Tortoise ORM使用
3. **清晰的分层** - Routes → Services → Repositories → Models
4. **依赖注入** - 使用FastAPI的Depends机制
5. **轻量级实现** - 不引入过度抽象，保持简单实用

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Client (前端/移动端)                   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                   API Layer (api/)                       │
│                 FastAPI Router 聚合                       │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│   Account    │ │   Wallet   │ │Transaction │
│   Domain     │ │   Domain   │ │   Domain   │
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │               │               │
┌───────▼──────────────┬▼──────────────▼──────────┐
│           Shared Layer (shared/)                 │
│   Schemas / Dependencies / Utils / Exceptions    │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│          Infrastructure Layer                     │
│  ┌─────────────┐    ┌──────────────┐            │
│  │   Models    │    │ Blockchain   │            │
│  │   (ORM)     │    │  Adapter     │            │
│  └──────┬──────┘    └──────┬───────┘            │
│         │                   │                     │
│  ┌──────▼──────┐    ┌──────▼───────┐            │
│  │  Database   │    │  Web3 RPC    │            │
│  └─────────────┘    └──────────────┘            │
└──────────────────────────────────────────────────┘
```

---

## 目录结构

### 完整目录树

```
app/backend/
├── main.py                          # FastAPI应用入口
├── config.dev.yaml                  # 开发环境配置
├── config.test.yaml                 # 测试环境配置
├── pyproject.toml                   # 项目依赖
├── README.md                        # 用户文档
├── GUIDE.md                         # 开发者文档（本文件）
│
├── src/                             # 源代码根目录
│   │
│   ├── cores/                       # 🔧 核心基础设施
│   │   ├── config.py               # 配置管理（Pydantic Settings）
│   │   ├── security.py             # JWT、加密、哈希
│   │   ├── exceptions.py           # 业务异常定义
│   │   └── aerich_redirect.py      # Aerich配置重定向
│   │
│   ├── models/                      # 📦 ORM模型层（Tortoise ORM统一入口）
│   │   ├── __init__.py             # 导出所有模型
│   │   ├── base.py                 # AbstractModel, TimestampMixin
│   │   ├── account.py              # 账户模型
│   │   ├── wallet.py               # 钱包模型
│   │   └── transaction.py          # 交易模型
│   │
│   ├── shared/                      # 🌐 共享组件
│   │   ├── schemas/                # 共享Schema
│   │   │   ├── base.py             # ApiResponse, PaginatedResponse
│   │   │   └── common.py           # 分页、排序等通用Schema
│   │   ├── dependencies.py         # 通用依赖注入
│   │   └── utils.py                # 工具函数
│   │
│   ├── domains/                     # 🎯 业务领域层
│   │   │
│   │   ├── account/                # 账户领域
│   │   │   ├── schemas.py          # AccountCreate, AccountResponse等DTO
│   │   │   ├── repositories.py     # 数据访问层（CRUD操作）
│   │   │   ├── services.py         # 业务逻辑层（用例编排）
│   │   │   └── routes.py           # FastAPI路由（HTTP接口）
│   │   │
│   │   ├── wallet/                 # 钱包领域
│   │   │   ├── schemas.py          # WalletCreate, WalletResponse等
│   │   │   ├── repositories.py     # 钱包数据访问
│   │   │   ├── services.py         # 钱包业务逻辑
│   │   │   ├── routes.py           # 钱包API路由
│   │   │   └── blockchain.py       # 🔗 区块链适配器（Web3集成）
│   │   │
│   │   └── transaction/            # 交易领域
│   │       ├── schemas.py          # TransactionCreate, TransactionResponse等
│   │       ├── repositories.py     # 交易数据访问
│   │       ├── services.py         # 交易业务逻辑
│   │       └── routes.py           # 交易API路由
│   │
│   ├── api/                         # 🚀 API聚合层
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── router.py           # 聚合所有领域路由
│   │
│   ├── utils/                       # 🛠️ 工具模块
│   │   ├── log.py                  # 日志工具
│   │   └── tools.py                # 通用工具
│   │
│   └── db.py                        # 数据库配置（Tortoise ORM）
│
├── migrations/                      # 📁 数据库迁移文件
│   └── models/
│       └── *.sql
│
└── tests/                          # 🧪 测试
    ├── conftest.py
    ├── test_account.py
    ├── test_wallet.py
    └── test_transaction.py
```

### 文件职责说明

| 目录/文件 | 职责 | 示例 |
|----------|------|------|
| `cores/` | 全局核心功能 | 配置、安全、异常 |
| `models/` | ORM模型定义 | 数据库表映射 |
| `shared/` | 跨领域共享组件 | 通用Schema、依赖注入 |
| `domains/` | 业务领域 | 账户、钱包、交易 |
| `api/` | API路由聚合 | 版本管理、路由注册 |

---

## 分层架构

### 1. 表现层 (Presentation Layer)

**文件**: `domains/{domain}/routes.py`

**职责**:
- 定义HTTP端点
- 请求参数验证（依赖Pydantic）
- 调用Service层
- 返回响应

**示例**:

```python
# src/domains/account/routes.py
from fastapi import APIRouter, Depends
from src.domains.account.schemas import AccountCreate, AccountResponse
from src.domains.account.services import AccountService
from src.shared.schemas.base import ApiResponse

router = APIRouter()

@router.post("/", response_model=ApiResponse[AccountResponse])
async def create_account(
    data: AccountCreate,
    service: AccountService = Depends(get_account_service)
):
    """创建账户"""
    account = await service.create_account(data)
    return ApiResponse(data=account, message="Account created")
```

### 2. 业务逻辑层 (Service Layer)

**文件**: `domains/{domain}/services.py`

**职责**:
- 实现业务用例
- 编排业务流程
- 调用Repository层
- 调用外部服务（如区块链）
- 业务规则验证

**示例**:

```python
# src/domains/account/services.py
from src.domains.account.repositories import AccountRepository
from src.domains.account.schemas import AccountCreate, AccountResponse
from src.cores.exceptions import ConflictException

class AccountService:
    def __init__(self, repo: AccountRepository = None):
        self.repo = repo or AccountRepository()
    
    async def create_account(self, data: AccountCreate) -> AccountResponse:
        """
        创建账户用例
        
        业务流程：
        1. 检查地址是否已存在
        2. 创建账户
        3. 返回响应
        """
        # 1. 业务规则验证
        if await self.repo.exists_by_address(data.address, data.net_type):
            raise ConflictException("Address already exists")
        
        # 2. 调用Repository创建
        account = await self.repo.create(
            address=data.address,
            private_key=data.private_key,
            net_type=data.net_type,
            tag=data.tag
        )
        
        # 3. 转换为响应DTO
        return self._to_response(account)
```

### 3. 数据访问层 (Repository Layer)

**文件**: `domains/{domain}/repositories.py`

**职责**:
- 封装所有数据库操作
- ORM模型的CRUD
- 复杂查询封装
- 不包含业务逻辑

**示例**:

```python
# src/domains/account/repositories.py
from typing import Optional, List, Tuple
from src.models.account import Account
from src.cores.exceptions import NotFoundException

class AccountRepository:
    """账户数据访问层"""
    
    async def create(
        self,
        address: str,
        private_key: str,
        net_type: str = "local",
        tag: Optional[str] = None
    ) -> Account:
        """创建账户"""
        account = await Account.create(
            address=address,
            private_key=private_key,
            net_type=net_type,
            tag=tag
        )
        return account
    
    async def get_by_id(self, account_id: int) -> Optional[Account]:
        """根据ID查询"""
        return await Account.get_or_none(id=account_id)
    
    async def exists_by_address(self, address: str, net_type: str) -> bool:
        """检查地址是否存在"""
        return await Account.filter(
            address=address,
            net_type=net_type
        ).exists()
    
    async def list_all(
        self,
        offset: int = 0,
        limit: int = 10,
        **filters
    ) -> Tuple[List[Account], int]:
        """查询账户列表（支持过滤）"""
        query = Account.all()
        
        # 应用过滤条件
        if filters.get('net_type'):
            query = query.filter(net_type=filters['net_type'])
        
        total = await query.count()
        accounts = await query.offset(offset).limit(limit).order_by("-created_at").all()
        return accounts, total
```

### 4. 数据模型层 (Model Layer)

**文件**: `models/{model}.py`

**职责**:
- Tortoise ORM模型定义
- 数据库表映射
- 字段定义和约束
- 贫血模型（不包含业务逻辑）

**示例**:

```python
# src/models/account.py
from enum import Enum
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin

class NetType(str, Enum):
    """网络类型枚举"""
    LOCAL = "local"
    TEST = "test"
    MAIN = "main"

class Account(AbstractModel, TimestampMixin):
    """账户表"""
    
    address = fields.CharField(max_length=128, description="钱包地址")
    private_key = fields.CharField(max_length=256, description="私钥")
    tag = fields.CharField(max_length=255, null=True, description="标签")
    net_type = fields.CharEnumField(NetType, max_length=20, default=NetType.LOCAL)
    last_login_dt = fields.DatetimeField(null=True, description="最后登录时间")
    
    class Meta:
        table = "account"
        unique_together = (("address", "net_type"),)
```

---

## 数据流与调用链

### 完整请求流程

以"创建钱包并转账"为例，展示完整的调用链路：

#### 1. 客户端发起请求

```bash
POST /api/v1/wallets
Content-Type: application/json

{
  "network": "ethereum",
  "tag": "我的ETH钱包"
}
```

#### 2. FastAPI路由层 (routes.py)

```python
# src/domains/wallet/routes.py

@router.post("/", response_model=ApiResponse[WalletResponse])
async def create_wallet(
    data: WalletCreate,
    service: WalletService = Depends(get_wallet_service)
):
    """
    步骤：
    1. FastAPI自动验证请求参数（Pydantic）
    2. 注入WalletService依赖
    3. 调用Service层
    """
    wallet = await service.create_wallet(data)
    return ApiResponse(data=wallet, message="Wallet created")
```

#### 3. 业务逻辑层 (services.py)

```python
# src/domains/wallet/services.py

class WalletService:
    async def create_wallet(self, data: WalletCreate) -> WalletResponse:
        """
        业务流程编排：
        1. 调用区块链适配器生成钱包
        2. 检查地址是否已存在
        3. 加密私钥
        4. 保存到数据库
        5. 返回响应
        """
        # 1. 调用外部服务（区块链）
        adapter = get_blockchain_adapter(data.network)
        address, private_key = await adapter.generate_wallet()
        
        # 2. 业务规则验证
        if await self.repo.exists_by_address(address):
            raise ConflictException("Address already exists")
        
        # 3. 数据处理
        encrypted_key = encrypt_private_key(private_key, self.password)
        
        # 4. 调用Repository保存
        wallet = await self.repo.create(
            address=address,
            encrypted_private_key=encrypted_key,
            network=data.network,
            tag=data.tag
        )
        
        # 5. 转换响应
        return await self._to_response(wallet, adapter)
```

#### 4. 数据访问层 (repositories.py)

```python
# src/domains/wallet/repositories.py

class WalletRepository:
    async def create(
        self,
        address: str,
        encrypted_private_key: str,
        network: str,
        **kwargs
    ) -> Wallet:
        """
        纯数据库操作：
        1. 调用ORM创建记录
        2. 返回ORM对象
        """
        wallet = await Wallet.create(
            address=address,
            encrypted_private_key=encrypted_private_key,
            network=network,
            **kwargs
        )
        return wallet
```

#### 5. ORM模型层 (models/)

```python
# src/models/wallet.py

class Wallet(AbstractModel, TimestampMixin):
    """
    Tortoise ORM模型：
    1. 定义表结构
    2. 字段类型和约束
    3. 自动生成SQL
    """
    address = fields.CharField(max_length=128, unique=True)
    encrypted_private_key = fields.CharField(max_length=512)
    network = fields.CharEnumField(NetworkType, max_length=20)
    balance = fields.DecimalField(max_digits=36, decimal_places=18)
    # ...
```

#### 6. 数据库操作

```sql
-- Tortoise ORM自动生成并执行
INSERT INTO wallet (
    address, 
    encrypted_private_key, 
    network, 
    balance,
    created_at,
    updated_at
) VALUES (?, ?, ?, ?, ?, ?);
```

#### 7. 返回响应

```json
{
  "code": 0,
  "message": "Wallet created successfully",
  "data": {
    "id": 1,
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "network": "ethereum",
    "balance": "0",
    "tag": "我的ETH钱包",
    "created_at": "2025-11-16T10:00:00Z"
  },
  "timestamp": "2025-11-16T10:00:00Z"
}
```

### 调用链路图

```
Client
   │
   ▼ HTTP Request
┌──────────────────────────────────┐
│  routes.py (API Layer)           │
│  - 参数验证                       │
│  - 依赖注入                       │
└───────────┬──────────────────────┘
            │
            ▼ service.method()
┌──────────────────────────────────┐
│  services.py (Business Logic)    │
│  - 业务规则验证                   │
│  - 流程编排                       │
│  - 调用Repository和外部服务       │
└───┬───────────────┬──────────────┘
    │               │
    │               ▼ blockchain.method()
    │       ┌──────────────────────┐
    │       │  blockchain.py       │
    │       │  - Web3交互          │
    │       │  - RPC调用           │
    │       └──────────────────────┘
    │
    ▼ repo.method()
┌──────────────────────────────────┐
│  repositories.py (Data Access)   │
│  - CRUD操作                      │
│  - 查询封装                       │
└───────────┬──────────────────────┘
            │
            ▼ ORM操作
┌──────────────────────────────────┐
│  models/ (ORM Models)            │
│  - 表映射                         │
│  - 字段定义                       │
└───────────┬──────────────────────┘
            │
            ▼ SQL
┌──────────────────────────────────┐
│  Database (MySQL/PostgreSQL)     │
└──────────────────────────────────┘
```

---

## 领域设计

### Account领域

**职责**: 管理加密货币账户，支持多网络环境

**核心实体**: Account
- `id`: 主键
- `address`: 钱包地址
- `private_key`: 私钥（应加密存储）
- `net_type`: 网络类型（local/test/main）
- `tag`: 用户自定义标签
- `last_login_dt`: 最后登录时间

**用例**:
1. 创建账户 - 记录钱包地址和私钥
2. 查询账户 - 根据ID或地址查询
3. 更新账户 - 修改标签、网络类型
4. 记录登录 - 更新最后登录时间
5. 删除账户 - 删除账户记录

**API端点**:
```
POST   /api/v1/accounts           创建账户
GET    /api/v1/accounts/{id}      获取账户
GET    /api/v1/accounts           列表查询
PUT    /api/v1/accounts/{id}      更新账户
DELETE /api/v1/accounts/{id}      删除账户
POST   /api/v1/accounts/{id}/login 记录登录
```

### Wallet领域

**职责**: 管理区块链钱包，提供余额查询和转账功能

**核心实体**: Wallet
- `id`: 主键
- `address`: 钱包地址
- `encrypted_private_key`: 加密的私钥
- `network`: 网络（ethereum/bsc/polygon）
- `balance`: 余额缓存
- `account_id`: 关联的账户ID
- `is_active`: 是否激活

**依赖服务**:
- `EthereumAdapter`: Web3.py封装，负责区块链交互

**用例**:
1. 创建钱包 - 生成新的钱包地址和私钥
2. 导入钱包 - 从私钥导入现有钱包
3. 查询余额 - 从区块链实时查询余额
4. 转账 - 发送链上交易
5. 同步余额 - 更新数据库缓存的余额

**API端点**:
```
POST   /api/v1/wallets              创建钱包
POST   /api/v1/wallets/import       导入钱包
GET    /api/v1/wallets/{id}         获取钱包
GET    /api/v1/wallets/{id}/balance 查询余额
POST   /api/v1/wallets/{id}/transfer 转账
POST   /api/v1/wallets/{id}/sync    同步余额
GET    /api/v1/wallets              列表查询
PUT    /api/v1/wallets/{id}         更新钱包
DELETE /api/v1/wallets/{id}         删除钱包
```

### Transaction领域

**职责**: 记录和查询区块链交易

**核心实体**: Transaction
- `id`: 主键
- `tx_hash`: 交易哈希
- `from_address`: 发送地址
- `to_address`: 接收地址
- `amount`: 金额
- `network`: 网络
- `status`: 状态（pending/confirmed/failed）
- `tx_type`: 类型（transfer/contract/mint/swap）
- `gas_price`, `gas_used`: Gas信息
- `block_number`: 区块号
- `wallet_id`: 关联钱包

**用例**:
1. 记录交易 - 创建交易记录
2. 查询交易 - 根据ID或哈希查询
3. 交易历史 - 查询地址或钱包的所有交易
4. 交易统计 - 统计交易数量、金额等
5. 更新状态 - 更新交易确认状态

**API端点**:
```
POST   /api/v1/transactions                  记录交易
GET    /api/v1/transactions/{id}             获取交易
GET    /api/v1/transactions/hash/{hash}      根据哈希查询
GET    /api/v1/transactions                  列表查询
GET    /api/v1/transactions/address/{addr}/history 地址历史
GET    /api/v1/transactions/wallet/{id}/history  钱包历史
GET    /api/v1/transactions/stats            交易统计
PUT    /api/v1/transactions/{id}             更新交易
DELETE /api/v1/transactions/{id}             删除交易
```

---

## 开发指南

### 添加新领域

假设要添加一个"NFT管理"领域，步骤如下：

#### 1. 创建ORM模型

```python
# src/models/nft.py
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin

class NFT(AbstractModel, TimestampMixin):
    """NFT模型"""
    
    contract_address = fields.CharField(max_length=128, description="合约地址")
    token_id = fields.CharField(max_length=128, description="Token ID")
    owner_address = fields.CharField(max_length=128, description="持有者地址")
    name = fields.CharField(max_length=255, description="NFT名称")
    image_url = fields.TextField(null=True, description="图片URL")
    metadata_url = fields.TextField(null=True, description="元数据URL")
    network = fields.CharField(max_length=20, default="ethereum")
    wallet_id = fields.IntField(null=True, description="关联钱包")
    
    class Meta:
        table = "nft"
        unique_together = (("contract_address", "token_id", "network"),)
```

在`models/__init__.py`中导出：

```python
from src.models.nft import NFT
__all__ = ["...", "NFT"]
```

#### 2. 创建领域目录和Schema

```python
# src/domains/nft/schemas.py
from pydantic import BaseModel, Field
from src.shared.schemas.base import IDMixin, TimestampMixin

class NFTBase(BaseModel):
    contract_address: str = Field(..., description="合约地址")
    token_id: str = Field(..., description="Token ID")
    name: str = Field(..., description="NFT名称")

class NFTCreate(NFTBase):
    owner_address: str
    network: str = "ethereum"
    wallet_id: Optional[int] = None

class NFTResponse(NFTBase, IDMixin, TimestampMixin):
    owner_address: str
    image_url: Optional[str]
    metadata_url: Optional[str]
    network: str
    
    class Config:
        from_attributes = True
```

#### 3. 创建Repository

```python
# src/domains/nft/repositories.py
from typing import Optional, List, Tuple
from src.models.nft import NFT
from src.cores.exceptions import NotFoundException

class NFTRepository:
    async def create(self, **kwargs) -> NFT:
        """创建NFT记录"""
        nft = await NFT.create(**kwargs)
        return nft
    
    async def get_by_id(self, nft_id: int) -> Optional[NFT]:
        """根据ID查询"""
        return await NFT.get_or_none(id=nft_id)
    
    async def list_by_wallet(
        self,
        wallet_id: int,
        offset: int = 0,
        limit: int = 10
    ) -> Tuple[List[NFT], int]:
        """查询钱包的NFT列表"""
        query = NFT.filter(wallet_id=wallet_id)
        total = await query.count()
        nfts = await query.offset(offset).limit(limit).all()
        return nfts, total
```

#### 4. 创建Service

```python
# src/domains/nft/services.py
from src.domains.nft.repositories import NFTRepository
from src.domains.nft.schemas import NFTCreate, NFTResponse

class NFTService:
    def __init__(self, repo: NFTRepository = None):
        self.repo = repo or NFTRepository()
    
    async def create_nft(self, data: NFTCreate) -> NFTResponse:
        """创建NFT记录"""
        nft = await self.repo.create(
            contract_address=data.contract_address,
            token_id=data.token_id,
            owner_address=data.owner_address,
            name=data.name,
            network=data.network,
            wallet_id=data.wallet_id
        )
        return self._to_response(nft)
    
    async def get_wallet_nfts(
        self,
        wallet_id: int,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[NFTResponse], int, int]:
        """查询钱包的NFT列表"""
        offset = (page - 1) * page_size
        nfts, total = await self.repo.list_by_wallet(
            wallet_id, offset, page_size
        )
        total_pages = calculate_total_pages(total, page_size)
        responses = [self._to_response(nft) for nft in nfts]
        return responses, total, total_pages
    
    def _to_response(self, nft: NFT) -> NFTResponse:
        return NFTResponse(
            id=nft.id,
            contract_address=nft.contract_address,
            token_id=nft.token_id,
            owner_address=nft.owner_address,
            name=nft.name,
            image_url=nft.image_url,
            metadata_url=nft.metadata_url,
            network=nft.network,
            created_at=nft.created_at,
            updated_at=nft.updated_at
        )
```

#### 5. 创建Routes

```python
# src/domains/nft/routes.py
from fastapi import APIRouter, Depends, Query
from src.domains.nft.schemas import NFTCreate, NFTResponse
from src.domains.nft.services import NFTService
from src.shared.schemas.base import ApiResponse, PaginatedResponse

router = APIRouter()

def get_nft_service() -> NFTService:
    return NFTService()

@router.post("/", response_model=ApiResponse[NFTResponse])
async def create_nft(
    data: NFTCreate,
    service: NFTService = Depends(get_nft_service)
):
    """创建NFT记录"""
    nft = await service.create_nft(data)
    return ApiResponse(data=nft, message="NFT created")

@router.get(
    "/wallet/{wallet_id}",
    response_model=ApiResponse[PaginatedResponse[NFTResponse]]
)
async def get_wallet_nfts(
    wallet_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    service: NFTService = Depends(get_nft_service)
):
    """查询钱包的NFT列表"""
    nfts, total, total_pages = await service.get_wallet_nfts(
        wallet_id, page, page_size
    )
    paginated = PaginatedResponse(
        items=nfts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    return ApiResponse(data=paginated)
```

#### 6. 注册到API路由

```python
# src/api/v1/router.py
from src.domains.nft.routes import router as nft_router

api_router.include_router(
    nft_router,
    prefix="/nfts",
    tags=["NFT管理"]
)
```

#### 7. 生成数据库迁移

```bash
# 生成迁移文件
aerich migrate --name add_nft_model

# 应用迁移
aerich upgrade
```

---

## 最佳实践

### 1. 异常处理

使用自定义业务异常，统一错误处理：

```python
from src.cores.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    InsufficientBalanceException
)

# Service层抛出异常
if not wallet:
    raise NotFoundException(
        "Wallet not found",
        detail={"wallet_id": wallet_id}
    )

if balance < amount:
    raise InsufficientBalanceException(
        f"Insufficient balance. Have: {balance}, Need: {amount}"
    )
```

全局异常处理器会自动转换为统一格式的HTTP响应。

### 2. 依赖注入

利用FastAPI的依赖注入系统：

```python
# 定义依赖
def get_account_service() -> AccountService:
    return AccountService()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    token = credentials.credentials
    payload = verify_token(token)
    return payload

# 在路由中使用
@router.post("/")
async def create_account(
    data: AccountCreate,
    service: AccountService = Depends(get_account_service),
    user: Dict = Depends(get_current_user)  # 需要认证
):
    account = await service.create_account(data)
    return ApiResponse(data=account)
```

### 3. 数据验证

充分利用Pydantic的验证功能：

```python
from pydantic import BaseModel, Field, field_validator
from decimal import Decimal

class TransferRequest(BaseModel):
    to_address: str = Field(..., min_length=42, max_length=42)
    amount: str = Field(...)
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: str) -> str:
        try:
            amount = Decimal(v)
            if amount <= 0:
                raise ValueError('金额必须大于0')
            if amount > Decimal('1000000'):
                raise ValueError('单笔金额不能超过1000000')
        except Exception:
            raise ValueError('无效的金额格式')
        return v
    
    @field_validator('to_address')
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not v.startswith('0x'):
            raise ValueError('地址必须以0x开头')
        return v.lower()
```

### 4. 异步操作

充分利用Python异步编程：

```python
# 并发查询多个钱包余额
async def get_multiple_balances(wallet_ids: List[int]) -> Dict[int, str]:
    """并发查询多个钱包余额"""
    tasks = []
    for wallet_id in wallet_ids:
        tasks.append(get_wallet_balance(wallet_id))
    
    results = await asyncio.gather(*tasks)
    return {
        wallet_id: result
        for wallet_id, result in zip(wallet_ids, results)
    }
```

### 5. 日志记录

使用结构化日志：

```python
import logging

logger = logging.getLogger(__name__)

async def transfer_funds(wallet_id: int, data: TransferRequest):
    logger.info(
        "Transfer initiated",
        extra={
            "wallet_id": wallet_id,
            "to_address": data.to_address,
            "amount": data.amount
        }
    )
    
    try:
        tx_hash = await blockchain.send_transaction(...)
        logger.info(f"Transfer successful: {tx_hash}")
        return tx_hash
    except Exception as e:
        logger.error(
            f"Transfer failed: {e}",
            extra={"wallet_id": wallet_id},
            exc_info=True
        )
        raise
```

### 6. 配置管理

使用Pydantic Settings管理配置：

```python
# cores/config.py
from pydantic_settings import BaseSettings

class DatabaseConfig(BaseModel):
    type: str = "mysql"
    host: str = "localhost"
    port: int = 3306
    database: str
    user: str
    password: str

class Settings(BaseSettings):
    app_name: str = "SuperCrypto"
    debug: bool = False
    environment: str = "dev"
    
    db: DatabaseConfig
    jwt_secret: str
    
    class Config:
        env_file = "config.local.yaml"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## 测试

### 单元测试

测试Service层业务逻辑：

```python
# tests/test_account_service.py
import pytest
from unittest.mock import Mock, AsyncMock
from src.domains.account.services import AccountService
from src.domains.account.schemas import AccountCreate
from src.cores.exceptions import ConflictException

@pytest.fixture
def mock_repo():
    repo = Mock()
    repo.exists_by_address = AsyncMock(return_value=False)
    repo.create = AsyncMock()
    return repo

@pytest.mark.asyncio
async def test_create_account_success(mock_repo):
    """测试创建账户成功"""
    service = AccountService(repository=mock_repo)
    
    data = AccountCreate(
        address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        private_key="0x1234...",
        net_type="test"
    )
    
    result = await service.create_account(data)
    
    assert mock_repo.create.called
    assert result.address == data.address

@pytest.mark.asyncio
async def test_create_account_conflict(mock_repo):
    """测试创建重复账户"""
    mock_repo.exists_by_address = AsyncMock(return_value=True)
    service = AccountService(repository=mock_repo)
    
    data = AccountCreate(
        address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        private_key="0x1234...",
        net_type="test"
    )
    
    with pytest.raises(ConflictException):
        await service.create_account(data)
```

### 集成测试

测试完整的API端点：

```python
# tests/test_account_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_create_account_api():
    """测试创建账户API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/accounts",
            json={
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "private_key": "0x1234...",
                "net_type": "test",
                "tag": "测试账户"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == 0
        assert data["data"]["address"] == "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

@pytest.mark.asyncio
async def test_get_account_api():
    """测试查询账户API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/accounts/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 0
        assert "data" in data
```

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定文件
pytest tests/test_account_service.py

# 查看覆盖率
pytest --cov=src tests/

# 生成HTML覆盖率报告
pytest --cov=src --cov-report=html tests/
```

---

## 部署

### 使用Docker部署

创建`Dockerfile`：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

创建`docker-compose.yml`：

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=3306
      - DB_DATABASE=supercrypto
      - DB_USER=root
      - DB_PASSWORD=password
    depends_on:
      - db
    volumes:
      - ./config.prod.yaml:/app/config.local.yaml
  
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: supercrypto
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

启动服务：

```bash
docker-compose up -d
```

### 生产环境配置

`config.prod.yaml`：

```yaml
app_name: SuperCrypto
debug: false
environment: prod

db:
  type: mysql
  host: ${DB_HOST}
  port: ${DB_PORT}
  database: ${DB_DATABASE}
  user: ${DB_USER}
  password: ${DB_PASSWORD}
  pool_size: 20

jwt_secret: ${JWT_SECRET}  # 从环境变量读取

# CORS配置
cors_origins:
  - https://yourdomain.com
  - https://app.yourdomain.com
```

### 性能优化

1. **数据库连接池**
```python
# config.yaml
db:
  pool_size: 20
  max_overflow: 10
  pool_recycle: 3600
```

2. **Redis缓存**（可选）
```python
from redis import asyncio as aioredis

redis = await aioredis.from_url("redis://localhost")

# 缓存余额查询
async def get_wallet_balance_cached(wallet_id: int) -> str:
    cache_key = f"wallet:{wallet_id}:balance"
    
    # 尝试从缓存获取
    cached = await redis.get(cache_key)
    if cached:
        return cached.decode()
    
    # 从区块链查询
    balance = await blockchain.get_balance(address)
    
    # 缓存5分钟
    await redis.setex(cache_key, 300, str(balance))
    return str(balance)
```

3. **使用Nginx反向代理**
```nginx
server {
    listen 80;
    server_name api.supercrypto.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 常见问题

### Q: 如何修改数据库模型？

1. 修改`models/{model}.py`
2. 生成迁移：`aerich migrate --name description`
3. 应用迁移：`aerich upgrade`

### Q: 如何添加新的区块链网络？

修改`src/domains/wallet/blockchain.py`：

```python
def get_blockchain_adapter(network: str) -> EthereumAdapter:
    rpc_urls = {
        "ethereum": "https://eth.llamarpc.com",
        "bsc": "https://bsc-dataseed.binance.org",
        "polygon": "https://polygon-rpc.com",
        "arbitrum": "https://arb1.arbitrum.io/rpc",
        "avalanche": "https://api.avax.network/ext/bc/C/rpc",  # 新增
    }
    
    rpc_url = rpc_urls.get(network, rpc_urls["ethereum"])
    return EthereumAdapter(rpc_url=rpc_url)
```

### Q: 如何实现自定义中间件？

```python
# main.py
from starlette.middleware.base import BaseHTTPMiddleware

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response

app.add_middleware(TimingMiddleware)
```

---

## 总结

SuperCrypto采用轻量级DDD架构，核心优势：

1. **清晰的分层** - 职责明确，易于维护
2. **领域驱动** - 按业务组织，便于理解
3. **可扩展** - 添加新功能只需添加新领域
4. **可测试** - 各层独立，便于单元测试
5. **高性能** - 全异步架构，支持高并发

遵循本指南，你可以快速上手开发和扩展SuperCrypto！

---

**更多资源**:
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [Tortoise ORM文档](https://tortoise.github.io/)
- [Web3.py文档](https://web3py.readthedocs.io/)

