"""
用户 API 路由 (需要 JWT 认证)

路由前缀: /api/v1/user
依赖: require_user 已在主 router 中统一注入
"""

from fastapi import APIRouter

from src.api.v1.user import auth, kyc, staking, subscriptions

router = APIRouter()

# 用户信息
router.include_router(auth.router, prefix="/auth", tags=["认证-用户"])

# KYC 申请
router.include_router(kyc.router, prefix="/kyc", tags=["KYC-用户"])

# 质押操作
router.include_router(staking.router, prefix="/staking", tags=["质押-用户"])

# 认购操作
router.include_router(subscriptions.router, prefix="/subscriptions", tags=["认购-用户"])

