"""
FastAPI 依赖注入 — 统一服务实例获取

所有服务实例的获取（无论是模块级单例还是按需创建）统一由此模块管理。
API 路由通过 ``Depends(get_xxx_service)`` 注入服务，其他内部模块
（middleware, tasks, scripts）也从此处获取服务实例。

用法::

    from src.common.dependencies import get_asset_service


    @router.get("/assets")
    async def list_assets(service: AssetService = Depends(get_asset_service)): ...

实例化策略
---------
- **无状态服务** → 每次调用返回新实例（如 AssetService, KycService）
- **有状态 / 需要缓存的服务** → 模块级单例（如 AuditService, StorageService）
- **参数化服务** → 工厂函数，传参时新建，否则返回单例（如 AuthService, ContractService）

重要约定
--------
- **此文件从各 service 子模块直接导入类**（非 ``services/__init__.py``），
  避免 dependencies → __init__ → service → dependencies 循环导入。
- **service 文件中不定义单例实例或工厂函数**，只导出类。
"""

from typing import Dict, Optional

# ============ 从各 service / infra 子模块直接导入类（避免通过 __init__.py 循环导入） ============
from src.infra.session_service import SessionService
from src.services.account_service import AccountService
from src.services.admin_service import AdminService
from src.services.asset_service import AssetService
from src.services.audit_service import AuditService, TransactionAuditService
from src.services.auth_service import AuthService
from src.services.chain_service import ChainService
from src.services.contract_service import ContractService
from src.services.dev_service import DevToolsService
from src.services.kyc_service import KycService
from src.services.project_registry_service import ProjectRegistryService
from src.services.staking_service import StakingService
from src.services.storage_service import StorageService
from src.services.subscription_service import SubscriptionService
from src.services.transaction_service import TransactionService

# ============ 模块级单例 ============

# 无状态 & 有内部缓存 → 全局共享
admin_service = AdminService()
audit_service = AuditService()
chain_service = ChainService()
dev_tools_service = DevToolsService()
session_service = SessionService()
staking_service = StakingService()
storage_service = StorageService()
transaction_audit_service = TransactionAuditService()

# auth: 懒初始化单例 + 支持传参创建新实例
_auth_service_instance: Optional[AuthService] = None

# project_registry: 按 network 缓存
_registry_instances: Dict[str, ProjectRegistryService] = {}


# ============ Account ============
def get_account_service() -> AccountService:
    """依赖注入：获取账户服务（每次新建实例）"""
    return AccountService()


# ============ Admin ============
def get_admin_service() -> AdminService:
    """依赖注入：获取管理员服务（单例）"""
    return admin_service


# ============ Asset ============
def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务（每次新建实例）"""
    return AssetService()


# ============ Audit ============
def get_audit_service() -> AuditService:
    """依赖注入：获取审计服务（单例）"""
    return audit_service


# ============ Auth ============
def get_auth_service(network: Optional[str] = None) -> AuthService:
    """依赖注入：获取认证服务

    - 传入 network → 创建新实例
    - 不传参 → 返回懒初始化单例
    """
    global _auth_service_instance  # noqa: PLW0603

    if network is not None:
        return AuthService(network=network)

    if _auth_service_instance is None:
        _auth_service_instance = AuthService()

    return _auth_service_instance


# ============ Chain ============
def get_chain_service() -> ChainService:
    """依赖注入：获取链服务（单例）"""
    return chain_service


# ============ Contract =============
def get_contract_service(network: Optional[str] = None) -> ContractService:
    """依赖注入：获取合约服务（每次新建实例，支持指定 network）"""
    return ContractService(network)


# ============ Dev Tools ============
def get_dev_tools_service() -> DevToolsService:
    """依赖注入：获取开发工具服务（单例）"""
    return dev_tools_service


# ============ KYC ============
def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务（每次新建实例）"""
    return KycService()


# ============ Project Registry ============
def get_project_registry_service(network: str = "hardhat") -> ProjectRegistryService:
    """依赖注入：获取项目注册表服务（按 network 缓存）"""
    if network not in _registry_instances:
        _registry_instances[network] = ProjectRegistryService(network)
    return _registry_instances[network]


# 别名：供部署脚本使用
get_config_loader = get_project_registry_service


# ============ Session ============
def get_session_service() -> SessionService:
    """依赖注入：获取会话服务（单例）"""
    return session_service


# ============ Staking ============
def get_staking_service() -> StakingService:
    """依赖注入：获取质押服务（单例）"""
    return staking_service


# ============ Storage ============
def get_storage_service() -> StorageService:
    """依赖注入：获取存储服务（单例）"""
    return storage_service


# ============ Subscription ============
def get_subscription_service() -> SubscriptionService:
    """依赖注入：获取认购服务（每次新建实例）"""
    return SubscriptionService()


# ============ Transaction ============
def get_transaction_service() -> TransactionService:
    """依赖注入：获取交易服务（每次新建实例）"""
    return TransactionService()


def get_transaction_audit_service() -> TransactionAuditService:
    """依赖注入：获取交易审计服务（单例）"""
    return transaction_audit_service
