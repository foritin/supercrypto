"""
用户 API 路由 (需要 JWT 认证)

路由前缀: /api/v1/user
依赖: require_user 已在主 router 中统一注入
"""

from fastapi import APIRouter

from src.api.v1.user import auth, kyc, staking, subscriptions, transactions_audit

router = APIRouter()

# 用户信息
router.include_router(auth.router, prefix="/auth", tags=["User Auth"])

# KYC 申请
router.include_router(kyc.router, prefix="/kyc", tags=["User KYC"])

# 质押操作
router.include_router(staking.router, prefix="/staking", tags=["User Staking"])

# 认购操作
router.include_router(
    subscriptions.router, prefix="/subscriptions", tags=["User Subscriptions"]
)

# 交易审计
router.include_router(
    transactions_audit.router,
    prefix="/transactions/audit",
    tags=["User Transaction Audit"],
)
