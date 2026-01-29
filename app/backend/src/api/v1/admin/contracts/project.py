"""
项目配置路由

路由前缀: /api/v1/admin/contracts
包含项目列表查询端点

Requirements: 2.1
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends

from src.services.project_registry import get_config_loader
from src.shared.security import require_admin

router = APIRouter()


# ============ 项目注册表端点 ============


@router.get(
    "/registry/projects",
    summary="获取可用项目列表",
    description="获取配置文件中定义的所有项目",
)
async def list_registry_projects(
    _admin=Depends(require_admin),
):
    """
    获取可用项目列表

    从 config.yaml 中读取 project_registry.projects 配置
    """
    loader = get_config_loader()
    projects = loader.list_projects()
    return success_response(list_data=projects)
