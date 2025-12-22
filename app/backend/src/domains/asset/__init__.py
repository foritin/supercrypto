"""
Asset Domain
RWA 资产管理
"""
from src.domains.asset.routes import router as asset_router
from src.domains.asset.routes import admin_router as asset_admin_router

__all__ = ["asset_router", "asset_admin_router"]

