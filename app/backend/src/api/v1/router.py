"""
API v1 主路由
聚合所有领域的路由

路由结构:
- /public/*      无需认证的公开接口
- /user/*        已登录用户接口 (require_user)
- /admin/*       管理员接口 (require_admin)
- /dev/*         开发工具
"""

from fastapi import APIRouter, Depends

from src.api.v1 import admin, dev, public, user
from src.api.v1.dev import kyc as dev_kyc
from src.security import require_admin, require_user

# ============================================================================
# 创建主路由器
# ============================================================================

api_router = APIRouter()

# ============================================================================
# 公开路由 /public/* - 无需认证
# ============================================================================

api_router.include_router(public.router, prefix="/public")

# ============================================================================
# 用户路由 /user/* - 需要 JWT 认证
# ============================================================================

api_router.include_router(
    user.router,
    prefix="/user",
    dependencies=[Depends(require_user)],
)

# ============================================================================
# 管理员路由 /admin/* - 需要管理员权限
# ============================================================================

api_router.include_router(
    admin.router,
    prefix="/admin",
    dependencies=[Depends(require_admin)],
)

# ============================================================================
# 开发工具 /dev/*
# ============================================================================

api_router.include_router(dev.router, prefix="/dev", tags=["开发者工具"])

# 兼容历史路径 /kyc/dev/*，避免旧调用方 404
api_router.include_router(dev_kyc.router, prefix="/kyc/dev", tags=["开发者工具"])
