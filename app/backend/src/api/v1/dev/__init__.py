"""
开发工具 API 路由 (仅 dev/test 环境)

路由前缀: /api/v1/dev
"""

from fastapi import APIRouter

from src.api.v1.dev import kyc, tools

router = APIRouter()

# 通用开发工具
router.include_router(tools.router, tags=["开发者工具"])

# KYC 开发工具
router.include_router(kyc.router, prefix="/kyc", tags=["KYC 开发工具"])

