"""
Provider 注册/注销路由

路由前缀: /api/v1/admin/contracts
包含 Provider 注册、注销、同步等端点

Requirements: 2.1
"""

from typing import Optional

from falib.utils.handlers import create_error_response, create_success_response
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.services.audit.service import audit_service
from src.services.contract.service import ContractService, get_contract_service
from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.shared.security import require_admin

router = APIRouter()


# ============ Request Schemas ============


class PrepareRegisterRequest(BaseModel):
    """准备注册请求"""

    contract_name: str
    provider_key: Optional[str] = None


class ConfirmRegisterRequest(BaseModel):
    """确认注册请求"""

    contract_name: str
    provider_key: str
    tx_hash: str


class PrepareUnregisterRequest(BaseModel):
    """准备注销请求"""

    contract_name: str
    provider_key: Optional[str] = None


class ConfirmUnregisterRequest(BaseModel):
    """确认注销请求"""

    contract_name: str
    provider_key: str
    tx_hash: str


# ============ Provider 同步端点 ============


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
        return create_success_response(object_data=result)
    except Exception as e:
        return create_error_response(code=500, msg=str(e))


# ============ Provider 注册端点 ============


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
        return create_success_response(object_data=result)
    except Exception as e:
        return create_error_response(code=400, msg=str(e))


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

        return create_success_response(object_data=result)
    except Exception as e:
        return create_error_response(code=400, msg=str(e))


# ============ Provider 注销端点 ============


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
        return create_success_response(object_data=result)
    except Exception as e:
        return create_error_response(code=400, msg=str(e))


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

        return create_success_response(object_data=result)
    except Exception as e:
        return create_error_response(code=400, msg=str(e))
