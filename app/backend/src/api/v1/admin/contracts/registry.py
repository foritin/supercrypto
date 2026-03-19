"""
Provider 注册/注销路由

路由前缀: /api/v1/admin/contracts
包含 Provider 注册、注销、同步等端点

Requirements: 2.1
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import (
    audit_service,
    get_contract_service,
    get_transaction_audit_service,
)
from src.common.exceptions import ConflictException
from src.schemas.contract import (
    ConfirmRegisterRequest,
    ConfirmSetTreasuryRequest,
    ConfirmUnregisterRequest,
    ContractAddressUpdateRequest,
    PrepareRegisterRequest,
    PrepareSetTreasuryRequest,
    PrepareUnregisterRequest,
    TreasuryBindingResponse,
)
from src.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType
from src.security import require_admin
from src.services import ContractService, TransactionAuditService

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
        external_address=request.external_address,
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
    tx_audit_service: TransactionAuditService = Depends(get_transaction_audit_service),
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

    # 补录链上交易审计，避免前端查询 tx status 时出现 not found
    provider = await service.get_provider_contract()
    try:
        await tx_audit_service.record_transaction(
            tx_hash=request.tx_hash,
            chain_id=provider.chain_id,
            network=provider.network.value
            if provider.network
            else str(service.network),
            from_address=admin_address,
            to_address=provider.address,
            value="0",
            tx_type=TransactionAuditType.CONTRACT_CALL,
            contract_name="AddressProvider",
            function_name="admin_set_address",
            description=f"Register contract {request.contract_name} to provider",
            extra_data={
                "contract_name": request.contract_name,
                "provider_key": request.provider_key,
                "operation": "provider_register_confirm",
            },
        )
    except ConflictException:
        pass

    try:
        await tx_audit_service.update_status(
            tx_hash=request.tx_hash,
            status=TransactionAuditStatus.CONFIRMED,
        )
    except Exception:
        # 状态更新失败不影响主流程
        pass

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


@router.post(
    "/treasury/prepare",
    summary="Prepare Set Treasury",
    description="Prepare call data for setting AddressProvider TREASURY key (admin wallet signing mode)",
)
async def prepare_set_treasury(
    request: PrepareSetTreasuryRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """准备设置 AddressProvider TREASURY 地址。"""
    result = await service.prepare_set_treasury(
        treasury_contract_name=request.treasury_contract_name,
    )
    return create_success_response(object_data=result)


@router.post(
    "/treasury/confirm",
    summary="Confirm Set Treasury",
    description="Confirm TREASURY key update after frontend completes on-chain transaction",
)
async def confirm_set_treasury(
    request: ConfirmSetTreasuryRequest,
    service: ContractService = Depends(get_contract_service),
    tx_audit_service: TransactionAuditService = Depends(get_transaction_audit_service),
    admin_address: str = Depends(require_admin),
):
    """确认设置 AddressProvider TREASURY 完成并更新缓存。"""
    result = await service.confirm_set_treasury(
        treasury_contract_name=request.treasury_contract_name,
        tx_hash=request.tx_hash,
    )

    provider = await service.get_provider_contract()
    try:
        await tx_audit_service.record_transaction(
            tx_hash=request.tx_hash,
            chain_id=provider.chain_id,
            network=provider.network.value
            if provider.network
            else str(service.network),
            from_address=admin_address,
            to_address=provider.address,
            value="0",
            tx_type=TransactionAuditType.CONTRACT_CALL,
            contract_name="AddressProvider",
            function_name="admin_set_address",
            description=f"Set TREASURY to {request.treasury_contract_name}",
            extra_data={
                "contract_name": request.treasury_contract_name,
                "provider_key": "TREASURY",
                "operation": "treasury_set_confirm",
            },
        )
    except ConflictException:
        pass

    try:
        await tx_audit_service.update_status(
            tx_hash=request.tx_hash,
            status=TransactionAuditStatus.CONFIRMED,
        )
    except Exception:
        pass

    await audit_service.log_async(
        category=AuditCategory.CONTRACT,
        action=AuditAction.CONTRACT_REGISTER,
        operator_address=admin_address,
        operator_type="admin",
        target_type="contract",
        status=AuditStatus.SUCCESS,
        description=f"TREASURY updated to {request.treasury_contract_name}",
        tx_hash=request.tx_hash,
        new_value={
            "contract_name": request.treasury_contract_name,
            "provider_key": "TREASURY",
            "tx_hash": request.tx_hash,
        },
    )

    return create_success_response(object_data=result)


@router.get(
    "/treasury",
    summary="Get Treasury Binding",
    description="Get current TREASURY and TREASURY_MULTISIG addresses from chain",
)
async def get_treasury_binding(
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """读取链上 TREASURY 和 TREASURY_MULTISIG。"""
    result = await service.get_treasury_binding()
    return create_success_response(object_data=TreasuryBindingResponse(**result))


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


@router.patch(
    "/address",
    summary="Update Contract Address",
    description="Update contract deployment address manually before provider registration (for external contracts)",
)
async def update_contract_address(
    request: ContractAddressUpdateRequest,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    contract = await service.update_registry_record(
        contract_name=request.contract_name,
        address=request.address,
    )
    return create_success_response(
        object_data={
            "contract_name": contract.name,
            "address": contract.address,
            "status": contract.status.value if contract.status else None,
            "network": contract.network.value if contract.network else None,
        }
    )


@router.post(
    "/unregister/confirm",
    summary="Confirm Unregistration",
    description="Update ProviderRegistry cache (soft delete) after frontend completes on-chain transaction",
)
async def confirm_unregister(
    request: ConfirmUnregisterRequest,
    service: ContractService = Depends(get_contract_service),
    tx_audit_service: TransactionAuditService = Depends(get_transaction_audit_service),
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

    # 补录链上交易审计，避免前端查询 tx status 时出现 not found
    provider = await service.get_provider_contract()
    try:
        await tx_audit_service.record_transaction(
            tx_hash=request.tx_hash,
            chain_id=provider.chain_id,
            network=provider.network.value
            if provider.network
            else str(service.network),
            from_address=admin_address,
            to_address=provider.address,
            value="0",
            tx_type=TransactionAuditType.CONTRACT_CALL,
            contract_name="AddressProvider",
            function_name="admin_set_address",
            description=f"Unregister contract {request.contract_name} from provider",
            extra_data={
                "contract_name": request.contract_name,
                "provider_key": request.provider_key,
                "operation": "provider_unregister_confirm",
            },
        )
    except ConflictException:
        pass

    try:
        await tx_audit_service.update_status(
            tx_hash=request.tx_hash,
            status=TransactionAuditStatus.CONFIRMED,
        )
    except Exception:
        # 状态更新失败不影响主流程
        pass

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
