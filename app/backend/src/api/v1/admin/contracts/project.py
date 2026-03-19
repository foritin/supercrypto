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
    description="Get all projects from ContractConfig",
)
async def list_registry_projects(
    _admin=Depends(require_admin),
):
    """
    获取可用项目列表

    从 ContractConfig 表读取 project_name 去重列表
    """
    loader = get_project_registry_service()
    projects = await loader.list_projects()
    return create_success_response(list_data=projects)
