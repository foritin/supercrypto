"""
公开 API 路由 (无需认证)

路由前缀: /api/v1/public
"""

from fastapi import APIRouter

from src.api.v1.public import assets, auth, contracts, kyc, staking, subscriptions

router = APIRouter()

# 认证 - 登录、登出、刷新
router.include_router(auth.router, prefix="/auth", tags=["认证-公开"])

# 资产 - 列表、详情查询
router.include_router(assets.router, prefix="/assets", tags=["资产-公开"])

# 合约 - 地址查询
router.include_router(contracts.router, prefix="/contracts", tags=["合约-公开"])

# KYC - 状态查询
router.include_router(kyc.router, prefix="/kyc", tags=["KYC-公开"])

# 质押 - 配置、限额
router.include_router(staking.router, prefix="/staking", tags=["质押-公开"])

# 认购 - 预览
router.include_router(subscriptions.router, prefix="/subscriptions", tags=["认购-公开"])

