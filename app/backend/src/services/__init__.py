"""
services 包 — 统一导出服务类定义
================================

API 路由层统一使用 ``from src.services import XxxService`` 导入类型。

服务实例的获取（单例、工厂）统一由 ``src.common.dependencies`` 管理::

    from src.common.dependencies import get_asset_service

服务文件规范
-----------
1. **一个文件一个主服务类**: 每个 ``xxx_service.py`` 只包含一个对外暴露的主服务类，
   不拆分子服务类。文件可以很大，但必须通过注释分割线
   (``# ============ 分区名 ============``) 将不同职责的方法分组。

2. **禁止服务间互调**: Service 之间不能互相导入和调用。
   服务间协作通过 API 路由层编排或参数传递。
   基础设施服务（如 StorageService）除外，可被其他服务依赖。

3. **不在 service 文件中定义单例或工厂函数**: 所有实例化逻辑由
   ``src.common.dependencies`` 统一管理。
"""

# ============================================================
# account
# ============================================================
from src.services.account_service import AccountService

# ============================================================
# admin
# ============================================================
from src.services.admin_service import AdminService

# ============================================================
# asset
# ============================================================
from src.services.asset_service import AssetService

# ============================================================
# audit
# ============================================================
from src.services.audit_service import AuditService, TransactionAuditService

# ============================================================
# auth
# ============================================================
from src.services.auth_service import AuthService

# ============================================================
# chain
# ============================================================
from src.services.chain_service import ChainService

# ============================================================
# contract
# ============================================================
from src.services.contract_service import ContractService

# ============================================================
# dev
# ============================================================
from src.services.dev_service import DevToolsService

# ============================================================
# kyc
# ============================================================
from src.services.kyc_service import KycService

# ============================================================
# project_registry
# ============================================================
from src.services.project_registry_service import ProjectRegistryService

# ============================================================
# staking
# ============================================================
from src.services.staking_service import StakingService

# ============================================================
# storage
# ============================================================
from src.services.storage_service import StorageService

# ============================================================
# subscription
# ============================================================
from src.services.subscription_service import SubscriptionService

# ============================================================
# transaction
# ============================================================
from src.services.transaction_service import TransactionService
from src.services.treasury_service import TreasuryService

__all__ = [
    "AccountService",
    "AdminService",
    "AssetService",
    "AuditService",
    "AuthService",
    "ChainService",
    "ContractService",
    "DevToolsService",
    "KycService",
    "ProjectRegistryService",
    "StakingService",
    "StorageService",
    "SubscriptionService",
    "TransactionAuditService",
    "TransactionService",
    "TreasuryService",
]
