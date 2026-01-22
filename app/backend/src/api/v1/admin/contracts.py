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
from src.services.project_registry import (
    get_binding_sync_service,
    get_config_loader,
    get_readiness_checker,
)
from src.shared.schemas.enums import ContractRegistryStatus
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


# ============ 项目注册表 Schemas ============


class SyncProjectRequest(BaseModel):
    """同步项目配置请求"""

    project_name: Optional[str] = Field(
        default=None, description="项目名称，不指定则同步所有项目"
    )
    force: bool = Field(default=False, description="是否强制覆盖已存在的配置")


class UpdateDeploymentRequest(BaseModel):
    """更新部署状态请求"""

    project_name: str = Field(..., description="项目名称")
    contract_name: str = Field(..., description="合约名称")
    network: str = Field(default="local", description="网络名称")
    address: Optional[str] = Field(default=None, description="部署地址")
    status: Optional[str] = Field(default=None, description="状态")
    tx_hash: Optional[str] = Field(default=None, description="部署交易哈希")


class UpdateBindingsRequest(BaseModel):
    """更新绑定状态请求"""

    project_name: str = Field(..., description="项目名称")
    contract_name: str = Field(..., description="合约名称")
    network: str = Field(default="local", description="网络名称")
    bindings: dict[str, str] = Field(..., description="绑定地址映射 {dep_name: address}")


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


# ============ 主合约管理端点 ============


@router.patch(
    "/{contract_id}/set-primary",
    summary="设置合约为主合约",
    description="将指定合约设置为项目的主合约（RWA Token）",
)
async def set_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    设置合约为主合约

    验证规则:
    1. 合约必须存在
    2. 合约必须是 PROJECT scope（只有项目专属合约可以设为主合约）
    3. 项目不能已有主合约（每个项目只能有一个主合约）

    Args:
        contract_id: 合约 ID

    Returns:
        更新后的合约信息

    Raises:
        400: 合约 scope 不正确或项目已有主合约
        404: 合约不存在
    """
    try:
        contract = await service.set_primary(contract_id)
        
        # 构建响应数据
        contract_data = {
            "id": contract.id,
            "name": contract.name,
            "address": contract.address,
            "project_name": contract.project_name,
            "scope": contract.scope.value if contract.scope else None,
            "contract_type": contract.contract_type.value if contract.contract_type else None,
            "is_primary": contract.is_primary,
            "symbol": contract.symbol,
            "status": contract.status.value if contract.status else None,
            "network": contract.network.value if contract.network else None,
            "chain_id": contract.chain_id,
        }
        
        return success_response(object_data=contract_data)
    except ValueError as e:
        error_msg = str(e)
        # 根据错误消息判断状态码
        if "合约不存在" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)


@router.patch(
    "/{contract_id}/unset-primary",
    summary="取消合约的主合约标记",
    description="取消指定合约的主合约标记",
)
async def unset_primary_contract(
    contract_id: int,
    service: ContractService = Depends(get_contract_service),
    _admin=Depends(require_admin),
):
    """
    取消合约的主合约标记

    验证规则:
    1. 合约必须存在
    2. 合约必须是当前的主合约（is_primary=True）

    Args:
        contract_id: 合约 ID

    Returns:
        更新后的合约信息

    Raises:
        400: 合约不是主合约
        404: 合约不存在
    """
    try:
        contract = await service.unset_primary(contract_id)

        # 构建响应数据
        contract_data = {
            "id": contract.id,
            "name": contract.name,
            "address": contract.address,
            "project_name": contract.project_name,
            "scope": contract.scope.value if contract.scope else None,
            "contract_type": contract.contract_type.value if contract.contract_type else None,
            "is_primary": contract.is_primary,
            "symbol": contract.symbol,
            "status": contract.status.value if contract.status else None,
            "network": contract.network.value if contract.network else None,
            "chain_id": contract.chain_id,
        }

        return success_response(object_data=contract_data)
    except ValueError as e:
        error_msg = str(e)
        # 根据错误消息判断状态码
        if "合约不存在" in error_msg:
            raise HTTPException(status_code=404, detail=error_msg)
        else:
            raise HTTPException(status_code=400, detail=error_msg)



# ============ 项目注册表端点 (Epic 10) ============


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


@router.post(
    "/registry/sync",
    summary="同步项目配置到数据库",
    description="将 YAML 配置同步到 ProjectContractConfig 表",
)
async def sync_project_config(
    request: SyncProjectRequest,
    _admin=Depends(require_admin),
):
    """
    同步项目配置到数据库

    将 config.yaml 中的 project_registry.projects 配置同步到数据库。
    这是初始化项目注册表的必要步骤。

    Args:
        project_name: 指定项目名称，不指定则同步所有项目
        force: 是否强制覆盖已存在的配置
    """
    loader = get_config_loader()

    if request.project_name:
        # 同步单个项目
        try:
            stats = await loader.sync_to_database(
                request.project_name, force=request.force
            )
            return success_response(
                msg=f"项目 {request.project_name} 同步成功",
                object_data={
                    "project": request.project_name,
                    "created": stats["created"],
                    "updated": stats["updated"],
                    "unchanged": stats["unchanged"],
                    "contracts": stats["contracts"],
                },
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # 同步所有项目
        projects = loader.list_projects()
        results = []
        total_created = 0
        total_updated = 0

        for project_name in projects:
            try:
                stats = await loader.sync_to_database(project_name, force=request.force)
                total_created += stats["created"]
                total_updated += stats["updated"]
                results.append(
                    {
                        "project": project_name,
                        "status": "success",
                        "created": stats["created"],
                        "updated": stats["updated"],
                    }
                )
            except Exception as e:
                results.append(
                    {
                        "project": project_name,
                        "status": "failed",
                        "error": str(e),
                    }
                )

        return success_response(
            msg=f"同步完成: {len(projects)} 个项目",
            object_data={
                "total_projects": len(projects),
                "total_created": total_created,
                "total_updated": total_updated,
                "results": results,
            },
        )


@router.get(
    "/registry/project/{project_name}/status",
    summary="获取项目就绪状态",
    description="获取项目的完整状态报告",
)
async def get_project_registry_status(
    project_name: str,
    network: str = "local",
    _admin=Depends(require_admin),
):
    """
    获取项目就绪状态报告

    返回项目中所有合约的配置、部署状态、依赖绑定情况。
    """
    checker = get_readiness_checker(network)
    report = await checker.get_project_status(project_name, network)

    # 转换为可序列化格式
    contracts_data = {}
    for name, info in report.contracts.items():
        contracts_data[name] = {
            "contract_name": info.contract_name,
            "dependency_type": info.dependency_type.value,
            "is_primary": info.is_primary,
            "is_registered": info.is_registered,
            "is_deployed": info.is_deployed,
            "current_status": info.current_status.value if info.current_status else None,
            "address": info.address,
            "required_deps": info.required_deps,
            "optional_deps": info.optional_deps,
            "missing_required_deps": info.missing_required_deps,
            "missing_optional_deps": info.missing_optional_deps,
            "is_ready": info.is_ready,
            "blocking_reason": info.blocking_reason,
            "can_deploy": info.can_deploy,
        }

    return success_response(
        object_data={
            "project_name": report.project_name,
            "readiness": report.readiness.value,
            "total_contracts": report.total_contracts,
            "registered_count": report.registered_count,
            "deployed_count": report.deployed_count,
            "active_count": report.active_count,
            "blocking_contracts": report.blocking_contracts,
            "deployable_contracts": report.deployable_contracts,
            "summary": report.summary,
            "contracts": contracts_data,
        }
    )


@router.post(
    "/registry/deployment/update",
    summary="更新合约部署状态",
    description="合约部署成功后调用此接口更新状态",
)
async def update_deployment_status(
    request: UpdateDeploymentRequest,
    _admin=Depends(require_admin),
):
    """
    更新合约部署状态

    当合约部署成功后，调用此接口记录部署地址和状态。
    这是部署流程的关键步骤。

    Args:
        project_name: 项目名称
        contract_name: 合约名称
        network: 网络名称
        address: 部署地址
        status: 状态 (deployed/bound/active)
        tx_hash: 部署交易哈希
    """
    sync_service = get_binding_sync_service()

    # 解析状态
    status_enum = None
    if request.status:
        try:
            status_enum = ContractRegistryStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"无效的状态值: {request.status}，有效值: {[s.value for s in ContractRegistryStatus]}",
            )

    result = await sync_service.update_deployment_status(
        project_name=request.project_name,
        contract_name=request.contract_name,
        network=request.network,
        address=request.address,
        status=status_enum,
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return success_response(
        msg=f"部署状态更新成功: {request.contract_name}",
        object_data={
            "contract_name": result.contract_name,
            "success": result.success,
            "status_changed": result.status_changed,
            "old_status": result.old_status,
            "new_status": result.new_status,
        },
    )


@router.post(
    "/registry/bindings/update",
    summary="更新合约绑定状态",
    description="合约依赖绑定后调用此接口更新状态",
)
async def update_contract_bindings(
    request: UpdateBindingsRequest,
    _admin=Depends(require_admin),
):
    """
    更新合约绑定状态

    当合约的依赖绑定完成后，调用此接口记录绑定信息。
    系统会自动根据绑定状态计算合约的整体状态。

    Args:
        project_name: 项目名称
        contract_name: 合约名称
        network: 网络名称
        bindings: 绑定地址映射 {dep_name: address}
    """
    sync_service = get_binding_sync_service()

    result = await sync_service.update_contract_bindings(
        project_name=request.project_name,
        contract_name=request.contract_name,
        network=request.network,
        bindings=request.bindings,
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return success_response(
        msg=f"绑定状态更新成功: {request.contract_name}",
        object_data={
            "contract_name": result.contract_name,
            "success": result.success,
            "bindings_updated": result.bindings_updated,
            "status_changed": result.status_changed,
            "old_status": result.old_status,
            "new_status": result.new_status,
        },
    )


@router.get(
    "/registry/contract/{project_name}/{contract_name}/bindings",
    summary="获取合约绑定状态",
    description="获取指定合约的绑定详情",
)
async def get_contract_bindings(
    project_name: str,
    contract_name: str,
    network: str = "local",
    _admin=Depends(require_admin),
):
    """
    获取合约绑定状态

    返回合约的部署地址和所有依赖的绑定信息。
    """
    sync_service = get_binding_sync_service()

    result = await sync_service.get_binding_status(
        project_name=project_name,
        contract_name=contract_name,
        network=network,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"未找到部署记录: {project_name}/{contract_name}@{network}",
        )

    return success_response(object_data=result)
