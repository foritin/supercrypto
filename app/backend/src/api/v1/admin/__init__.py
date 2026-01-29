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
)

router = APIRouter()

# 会话管理
router.include_router(auth.router, prefix="/auth", tags=["会话-管理员"])

# 资产管理
router.include_router(assets.router, prefix="/assets", tags=["资产-管理员"])

# 合约管理
router.include_router(contracts.router, prefix="/contracts", tags=["合约-管理员"])

# KYC 管理
router.include_router(kyc.router, prefix="/kyc", tags=["KYC-管理员"])

# 账户管理
router.include_router(accounts.router, prefix="/accounts", tags=["账户-管理员"])

# 交易审计 (必须在 transactions 之前注册，避免 /{tx_id} 路由冲突)
router.include_router(
    transactions_audit.router, prefix="/transactions/audit", tags=["交易审计-管理员"]
)

# 交易管理
router.include_router(transactions.router, prefix="/transactions", tags=["交易-管理员"])

# 审计日志
router.include_router(audit.router, prefix="/audit-logs", tags=["审计-管理员"])

# 统计报表 (stats 路由内部已定义 /stats, /audit-logs, /kyc 等路径)
router.include_router(stats.router, tags=["统计-管理员"])
