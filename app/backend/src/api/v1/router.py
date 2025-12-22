"""
API v1 主路由
聚合所有领域的路由

路由结构:
- /public/*      无需认证的公开接口
- /auth/*        认证相关（部分公开，部分需要认证）
- /user/*        已登录用户接口 (require_user)
- /admin/*       管理员接口 (require_admin)
- /dev/*         开发工具（仅开发环境）
"""

from falib.utils.config import SETTINGS
from fastapi import APIRouter, Depends

from src.domains.account.routes import admin_router as account_admin_router
from src.domains.admin.routes import router as admin_stats_router
from src.domains.asset.routes import admin_router as asset_admin_router
from src.domains.asset.routes import router as asset_public_router
from src.domains.auth.routes import admin_router as auth_admin_router
from src.domains.auth.routes import router as auth_router
from src.domains.contract.routes import admin_router as contract_admin_router
from src.domains.contract.routes import router as contract_public_router
from src.domains.dev.routes import router as dev_router
from src.domains.kyc.routes import admin_router as kyc_admin_router
from src.domains.kyc.routes import dev_router as kyc_dev_router
from src.domains.kyc.routes import public_router as kyc_public_router
from src.domains.kyc.routes import user_router as kyc_user_router
from src.domains.staking.routes import public_router as staking_public_router
from src.domains.staking.routes import user_router as staking_user_router
from src.domains.subscription.routes import public_router as subscription_public_router
from src.domains.subscription.routes import user_router as subscription_user_router
from src.domains.transaction.routes import admin_router as transaction_admin_router
from src.shared.security import require_admin, require_user

# ============================================================================
# 创建主路由器
# ============================================================================

api_router = APIRouter()

# ============================================================================
# 公开路由 /public/* - 无需认证
# ============================================================================

public_router = APIRouter(prefix="/public", tags=["公开接口"])

# 资产 - 公开查询
public_router.include_router(asset_public_router, prefix="/assets", tags=["资产-公开"])

# 合约 - 公开查询
public_router.include_router(
    contract_public_router, prefix="/contracts", tags=["合约-公开"]
)

# 认购 - 公开预览
public_router.include_router(
    subscription_public_router, prefix="/subscriptions", tags=["认购-公开"]
)

# 质押 - 公开配置/限额
public_router.include_router(
    staking_public_router, prefix="/staking", tags=["质押-公开"]
)

# KYC - 公开状态查询
public_router.include_router(kyc_public_router, prefix="/kyc", tags=["KYC-公开"])

api_router.include_router(public_router)

# ============================================================================
# 认证路由 /auth/* - 部分公开，部分需要认证
# ============================================================================

api_router.include_router(auth_router, prefix="/auth", tags=["认证管理"])

# ============================================================================
# 用户路由 /user/* - 需要 JWT 认证
# ============================================================================

user_router = APIRouter(
    prefix="/user",
    tags=["用户接口"],
    dependencies=[Depends(require_user)],
)

# 用户认购
user_router.include_router(
    subscription_user_router, prefix="/subscriptions", tags=["认购-用户"]
)

# 用户质押
user_router.include_router(staking_user_router, prefix="/staking", tags=["质押-用户"])

# 用户 KYC
user_router.include_router(kyc_user_router, prefix="/kyc", tags=["KYC-用户"])

api_router.include_router(user_router)

# ============================================================================
# 管理员路由 /admin/* - 需要管理员权限
# ============================================================================

admin_router = APIRouter(
    prefix="/admin",
    tags=["管理员接口"],
    dependencies=[Depends(require_admin)],
)

# 资产管理
admin_router.include_router(asset_admin_router, prefix="/assets", tags=["资产-管理员"])

# 合约管理
admin_router.include_router(
    contract_admin_router, prefix="/contracts", tags=["合约-管理员"]
)

# 平台统计 (admin_stats_router 内部已定义 /stats, /audit-logs, /kyc 路径)
admin_router.include_router(admin_stats_router, tags=["统计-管理员"])

# 会话管理
admin_router.include_router(auth_admin_router, prefix="/auth", tags=["会话-管理员"])

# KYC 管理
admin_router.include_router(kyc_admin_router, prefix="/kyc", tags=["KYC-管理员"])

# 账户管理
admin_router.include_router(
    account_admin_router, prefix="/accounts", tags=["账户-管理员"]
)

# 交易管理
admin_router.include_router(
    transaction_admin_router, prefix="/transactions", tags=["交易-管理员"]
)

api_router.include_router(admin_router)

# ============================================================================
# 开发工具路由（非 /dev 前缀的特殊接口）
# ============================================================================

# KYC 开发工具（保留在 /kyc/dev 路径以便前端兼容）
api_router.include_router(kyc_dev_router, prefix="/kyc", tags=["KYC 开发工具"])

# ============================================================================
# 开发工具 /dev/* - 仅开发环境
# ============================================================================

if SETTINGS.environment in ("local", "development", "test"):
    api_router.include_router(dev_router, tags=["开发者工具"])
