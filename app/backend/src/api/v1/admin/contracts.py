"""
管理员合约路由 - 合约依赖关系可视化

路由前缀: /api/v1/admin/contracts
"""

from typing import Optional

from falib.utils.handlers import success_response
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.services.asset.validators import ContractValidator
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


class ValidateContractRequest(BaseModel):
    """合约地址验证请求"""

    addresses: list[str] = Field(
        ..., min_length=1, max_length=10, description="要验证的合约地址列表，最多10个"
    )
    check_rwa_binding: bool = Field(
        default=False, description="是否检查 RWA Token 绑定状态"
    )
    rwa_token_name: Optional[str] = Field(
        default=None, description="RWA Token 名称，check_rwa_binding=True 时必填"
    )


class ContractValidationResult(BaseModel):
    """单个合约验证结果"""

    address: str
    format_valid: bool
    exists_on_chain: bool
    message: str


class ValidateContractResponse(BaseModel):
    """合约验证响应"""

    results: dict[str, ContractValidationResult]
    all_valid: bool
    rwa_binding: Optional[dict] = None


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


@router.post(
    "/validate",
    summary="验证合约地址",
    description="验证合约地址格式和链上存在性",
    response_model=None,
)
async def validate_contracts(
    request: ValidateContractRequest,
    _admin=Depends(require_admin),
):
    """
    验证合约地址

    支持批量验证（最多10个地址），检查：
    1. 地址格式是否正确 (0x + 40位十六进制)
    2. 链上是否存在代码 (区分合约地址和EOA)
    3. 可选：检查 RWA Token 绑定状态

    Returns:
        验证结果字典，每个地址的验证状态
    """
    # 批量验证合约地址
    validation_results = await ContractValidator.validate_contracts_batch(
        request.addresses
    )

    # 构建响应
    results = {}
    all_valid = True

    for address, (format_ok, exists, message) in validation_results.items():
        results[address] = ContractValidationResult(
            address=address,
            format_valid=format_ok,
            exists_on_chain=exists,
            message=message,
        )
        if not format_ok or not exists:
            all_valid = False

    # 可选: 检查 RWA Token 绑定
    rwa_binding = None
    if request.check_rwa_binding and request.rwa_token_name:
        (
            is_bound,
            msg,
            bound_address,
        ) = await ContractValidator.validate_rwa_token_binding(
            contract_addresses=request.addresses,
            rwa_token_name=request.rwa_token_name,
        )
        rwa_binding = {
            "is_bound": is_bound,
            "message": msg,
            "bound_address": bound_address,
        }

    response = ValidateContractResponse(
        results=results,
        all_valid=all_valid,
        rwa_binding=rwa_binding,
    )

    return success_response(object_data=response.model_dump())
