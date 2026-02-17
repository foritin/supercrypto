"""
项目配置路由

路由前缀: /api/v1/admin/contracts
包含项目列表查询端点

Requirements: 2.1
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import get_project_registry_service
from src.security import require_admin

router = APIRouter()


# ============ 项目注册表端点 ============


@router.get(
    "/registry/projects",
    summary="List Available Projects",
    description="Get all projects defined in the configuration file",
)
async def list_registry_projects(
    _admin=Depends(require_admin),
):
    """
    获取可用项目列表

    从 config.yaml 中读取 project_registry.projects 配置
    """
    loader = get_project_registry_service()
    projects = loader.list_projects()
    return create_success_response(list_data=projects)
