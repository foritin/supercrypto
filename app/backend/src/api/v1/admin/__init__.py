"""
管理员 API 路由 (需要 admin 权限)

路由前缀: /api/v1/admin
依赖: require_admin 已在主 router 中统一注入
"""

from fastapi import APIRouter

from src.api.v1.admin import (
    accounts,
    assets,
    audit,
    auth,
    contracts,
    kyc,
    stats,
    transactions,
    transactions_audit,
    treasury,
)

router = APIRouter()

# 会话管理
router.include_router(auth.router, prefix="/auth", tags=["Admin Auth"])

# 资产管理 (子模块自带 tags: Asset Binding, Asset CRUD, Asset Media)
router.include_router(assets.router, prefix="/assets")

# 合约管理 (子模块自带 tags: Contract Status, Contract Registry, Contract Validation, Project Config)
router.include_router(contracts.router, prefix="/contracts")

# KYC 管理
router.include_router(kyc.router, prefix="/kyc", tags=["Admin KYC"])

# 账户管理
router.include_router(accounts.router, prefix="/accounts", tags=["Admin Accounts"])

# 交易审计 (必须在 transactions 之前注册，避免 /{tx_id} 路由冲突)
router.include_router(
    transactions_audit.router,
    prefix="/transactions/audit",
    tags=["Admin Transaction Audit"],
)

# 交易管理
router.include_router(
    transactions.router, prefix="/transactions", tags=["Admin Transactions"]
)

# 审计日志
router.include_router(audit.router, prefix="/audit-logs", tags=["Admin Audit Logs"])

# 统计报表 (平台统计、用户统计、TVL 等)
router.include_router(stats.router, prefix="/stats", tags=["Admin Stats"])

# 国库多签管理
router.include_router(treasury.router, prefix="/treasury", tags=["Admin Treasury"])
