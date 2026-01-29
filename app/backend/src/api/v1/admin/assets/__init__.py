"""
管理员资产路由模块

路由前缀: /api/v1/admin/assets

本模块将原 assets.py (645行) 拆分为以下子模块：
- crud.py: 资产 CRUD 操作路由 (~200行)
- media.py: 媒体资源管理路由 (~150行)
- binding.py: 合约绑定管理路由 (~150行)

Requirements: 2.2, 2.3
"""

from fastapi import APIRouter

from .binding import router as binding_router
from .crud import router as crud_router
from .media import router as media_router

# 创建主路由器
router = APIRouter()

# 注册子模块路由
# 注意：binding_router 需要先注册，因为 /projects/available 路由
# 需要在 /{asset_id} 路由之前匹配，否则会被误认为 asset_id
router.include_router(binding_router, tags=["Asset Binding"])
router.include_router(crud_router, tags=["Asset CRUD"])
router.include_router(media_router, tags=["Asset Media"])

# 导出子模块供直接导入使用
__all__ = ["router", "crud", "media", "binding"]
