"""
开发工具 API 路由 (仅 dev/test 环境)

路由前缀: /api/v1/dev

双重保护:
1. router.py 中通过 SETTINGS.environment 条件判断是否注册路由
2. 所有端点通过 require_dev_environment 依赖进行运行时环境检查
"""

from fastapi import APIRouter, Depends

from src.api.v1.dev.deps import require_dev_environment
from src.api.v1.dev import kyc, tools

router = APIRouter(dependencies=[Depends(require_dev_environment)])

# 通用开发工具
router.include_router(tools.router, tags=["开发者工具"])

# KYC 开发工具
router.include_router(kyc.router, prefix="/kyc", tags=["KYC 开发工具"])
