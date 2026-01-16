"""
管理员合约路由 - 合约依赖关系可视化

路由前缀: /api/v1/admin/contracts
"""

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from src.services.contract.service import ContractService, get_contract_service
from src.shared.security import require_admin

router = APIRouter()


# ============ Request/Response Schemas ============

class PrepareRegisterRequest(BaseModel):
    contract_name: str
    provider_key: Optional[str] = None


class ConfirmRegisterRequest(BaseModel):
    contract_name: str
    provider_key: str
    tx_hash: str


class PrepareUnregisterRequest(BaseModel):
    contract_name: str
    provider_key: Optional[str] = None


class ConfirmUnregisterRequest(BaseModel):
    contract_name: str
    provider_key: str
    tx_hash: str


# ============ Endpoints ============

@router.get(
    "/status",
    summary="获取合约状态列表",
    description="获取合约状态列表（管理员）- 用于列表视图",
)
async def get_contract_status(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约状态列表

    返回格式：
    {
        "global_contracts": [...],
        "project_contracts": [...],
        "network": "dev",
        "needs_update_count": 0
    }
    """
    status_data = await service.get_contract_status()
    return success_response(object_data=status_data)


@router.get(
    "/dependency-graph",
    summary="获取合约依赖关系图数据",
    description="获取用于前端可视化的合约依赖关系图（管理员）",
)
async def get_dependency_graph(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取合约依赖关系图数据

    返回用于前端可视化图的数据结构：
    {
        "nodes": [{"id": "ContractName", "label": "...", "type": "...", "address": "...", "status": "...", "project": "..."}],
        "edges": [{"source": "ContractA", "target": "DependencyKey", "status": "..."}]
    }

    用于树形可视化组件渲染依赖关系图
    """
    graph_data = await service.get_dependency_graph()
    return success_response(object_data=graph_data)


@router.post(
    "/provider/sync",
    summary="从链上同步 Provider 状态",
    description="从 AddressProvider 同步注册状态到数据库缓存",
)
async def sync_from_provider(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    从链上 Provider 同步状态到 ProviderRegistry 缓存
    """
    try:
        result = await service.sync_from_provider()
        return success_response(object_data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/register/prepare",
    summary="准备注册调用参数",
    description="准备注册合约到 AddressProvider 的调用参数（前端钱包签名模式）",
)
async def prepare_register(
    request: PrepareRegisterRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    准备注册调用参数 (前端钱包签名模式)

    返回前端需要的调用信息，由前端签名发送交易
    """
    try:
        result = await service.prepare_register(
            contract_name=request.contract_name,
            provider_key=request.provider_key,
        )
        return success_response(object_data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/register/confirm",
    summary="确认注册完成",
    description="前端完成链上交易后，调用此接口更新 ProviderRegistry 缓存",
)
async def confirm_register(
    request: ConfirmRegisterRequest,
    service: ContractService = Depends(get_contract_service),
    admin_address: str = Depends(require_admin),
):
    """
    确认注册完成 (前端钱包签名模式)

    前端完成链上交易后，调用此接口更新 ProviderRegistry 缓存。
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
    
    try:
        result = await service.confirm_register(
            contract_name=request.contract_name,
            provider_key=request.provider_key,
            tx_hash=request.tx_hash,
        )
        
        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.CONTRACT,
            action=AuditAction.CONTRACT_REGISTER,
            operator_address=admin_address,
            operator_type="admin",
            target_type="contract",
            status=AuditStatus.SUCCESS,
            description=f"Contract {request.contract_name} registered to provider",
            tx_hash=request.tx_hash,
            new_value={
                "contract_name": request.contract_name,
                "provider_key": request.provider_key,
                "tx_hash": request.tx_hash,
            },
        )
        
        return success_response(object_data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/unregister/prepare",
    summary="准备解除注册调用参数",
    description="准备从 AddressProvider 解除注册的调用参数（前端钱包签名模式）",
)
async def prepare_unregister(
    request: PrepareUnregisterRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    准备解除注册调用参数 (前端钱包签名模式)

    返回前端需要的调用信息，target_address 为零地址
    """
    try:
        result = await service.prepare_unregister(
            contract_name=request.contract_name,
            provider_key=request.provider_key,
        )
        return success_response(object_data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/unregister/confirm",
    summary="确认解除注册完成",
    description="前端完成链上交易后，调用此接口更新 ProviderRegistry 缓存（软删除）",
)
async def confirm_unregister(
    request: ConfirmUnregisterRequest,
    service: ContractService = Depends(get_contract_service),
    admin_address: str = Depends(require_admin),
):
    """
    确认解除注册完成 (前端钱包签名模式)

    前端完成链上交易后，调用此接口更新 ProviderRegistry 缓存。
    此操作会软删除 ProviderRegistry 记录。
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
    
    try:
        result = await service.confirm_unregister(
            contract_name=request.contract_name,
            provider_key=request.provider_key,
            tx_hash=request.tx_hash,
        )
        
        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.CONTRACT,
            action=AuditAction.CONTRACT_UNREGISTER,
            operator_address=admin_address,
            operator_type="admin",
            target_type="contract",
            status=AuditStatus.SUCCESS,
            description=f"Contract {request.contract_name} unregistered from provider",
            tx_hash=request.tx_hash,
            new_value={
                "contract_name": request.contract_name,
                "provider_key": request.provider_key,
                "tx_hash": request.tx_hash,
            },
        )
        
        return success_response(object_data=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/provider/status",
    summary="获取 Provider 注册状态",
    description="获取 Provider 注册状态详情",
)
async def get_provider_status(
    category: Optional[str] = None,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    获取 Provider 注册状态详情

    Args:
        category: 可选，按分类过滤 (如 "vanke", "common")
    """
    result = await service.get_provider_status(category=category)
    return success_response(object_data=result)
