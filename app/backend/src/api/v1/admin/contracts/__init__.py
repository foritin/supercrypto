"""
管理员合约路由模块

路由前缀: /api/v1/admin/contracts

本模块将原 contracts.py (819行) 拆分为以下子模块：
- status.py: 合约状态查询相关路由
- registry.py: Provider 注册/注销相关路由
- validation.py: 合约验证相关路由
- project.py: 项目配置同步相关路由

Requirements: 2.1, 2.3
"""

from fastapi import APIRouter

# 导入子模块路由
from .project import router as project_router
from .registry import router as registry_router
from .status import router as status_router
from .validation import router as validation_router

router = APIRouter()

# 包含子模块路由
router.include_router(status_router, tags=["Contract Status"])
router.include_router(registry_router, tags=["Contract Registry"])
router.include_router(validation_router, tags=["Contract Validation"])
router.include_router(project_router, tags=["Project Config"])
