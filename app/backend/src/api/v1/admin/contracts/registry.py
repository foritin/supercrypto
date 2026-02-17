"""
Provider 注册/注销路由

路由前缀: /api/v1/admin/contracts
包含 Provider 注册、注销、同步等端点

Requirements: 2.1
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import audit_service, get_contract_service
from src.schemas.contract import (
    ConfirmRegisterRequest,
    ConfirmUnregisterRequest,
    PrepareRegisterRequest,
    PrepareUnregisterRequest,
)
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.security import require_admin
from src.services import ContractService

router = APIRouter()


# ============ Provider 同步端点 ============


@router.post(
    "/provider/sync",
    summary="Sync Provider Status from Chain",
    description="Sync registration status from AddressProvider to database cache",
)
async def sync_from_provider(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    从链上 Provider 同步状态到 ProviderRegistry 缓存
    """
    result = await service.sync_from_provider()
    return create_success_response(object_data=result)


# ============ Provider 注册端点 ============


@router.post(
    "/register/prepare",
    summary="Prepare Register Call Data",
    description="Prepare call data for registering a contract to AddressProvider (frontend wallet signing mode)",
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
    result = await service.prepare_register(
        contract_name=request.contract_name,
        provider_key=request.provider_key,
    )
    return create_success_response(object_data=result)


@router.post(
    "/register/confirm",
    summary="Confirm Registration",
    description="Update ProviderRegistry cache after frontend completes on-chain transaction",
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


# ============ Provider 注销端点 ============


@router.post(
    "/unregister/prepare",
    summary="Prepare Unregister Call Data",
    description="Prepare call data for unregistering from AddressProvider (frontend wallet signing mode)",
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
    result = await service.prepare_unregister(
        contract_name=request.contract_name,
        provider_key=request.provider_key,
    )
    return create_success_response(object_data=result)


@router.post(
    "/unregister/confirm",
    summary="Confirm Unregistration",
    description="Update ProviderRegistry cache (soft delete) after frontend completes on-chain transaction",
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
