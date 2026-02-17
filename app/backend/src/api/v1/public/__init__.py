"""
公开 API 路由 (无需认证)

路由前缀: /api/v1/public
"""

from fastapi import APIRouter

from src.api.v1.public import (
    assets,
    auth,
    chains,
    constants,
    contracts,
    kyc,
    staking,
    subscriptions,
)

router = APIRouter()

# 认证 - 登录、登出、刷新
router.include_router(auth.router, prefix="/auth", tags=["Public Auth"])

# 资产 - 列表、详情查询
router.include_router(assets.router, prefix="/assets", tags=["Public Assets"])

# 网络 - 区块链网络配置
router.include_router(chains.router, prefix="/chains", tags=["Public Chains"])

# 常量 - 系统常量表
router.include_router(constants.router, prefix="/constants", tags=["Public Constants"])

# 合约 - 地址查询
router.include_router(contracts.router, prefix="/contracts", tags=["Public Contracts"])

# KYC - 状态查询
router.include_router(kyc.router, prefix="/kyc", tags=["Public KYC"])

# 质押 - 配置、限额
router.include_router(staking.router, prefix="/staking", tags=["Public Staking"])

# 认购 - 预览
router.include_router(
    subscriptions.router, prefix="/subscriptions", tags=["Public Subscriptions"]
)
