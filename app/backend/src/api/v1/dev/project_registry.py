"""
项目注册表 API 路由

Story 10.5: 项目状态 API Endpoints
Story 10.6: 合约绑定状态同步
提供项目注册表功能的 RESTful API

路由前缀: /api/v1/dev/projects
"""

from typing import Dict, List

from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.project_registry import (
    ConfigLoadError,
    ContractReadinessInfo,
    get_binding_sync_service,
    get_config_loader,
    get_deployment_calculator,
    get_readiness_checker,
)
from src.shared.schemas.enums import ContractRegistryStatus

from .schemas.project_registry import (
    BindingInfo,
    BindingSyncResultInfo,
    ContractBindingStatus,
    ContractStatusInfo,
    DependencyGraphResponse,
    DeploymentOrderResponse,
    DeploymentStepInfo,
    EdgeStyle,
    GraphEdge,
    GraphNode,
    NodeData,
    NodePosition,
    ProjectBindingSyncResponse,
    ProjectListResponse,
    ProjectStatistics,
    ProjectStatusResponse,
    ProjectSummary,
    SyncResponse,
    SyncStats,
    UpdateBindingsRequest,
    UpdateDeploymentRequest,
)

logger = get_logger("contract.api")

router = APIRouter(prefix="/projects", tags=["项目注册表"])


# ===== 依赖注入 =====


def get_network(network: str = Query("hardhat", description="网络名称")) -> str:
    """获取网络参数"""
    return network


# ===== Endpoints =====


@router.get("", response_model=ProjectListResponse)
async def list_projects(network: str = Depends(get_network)):
    """
    列出所有可用项目

    返回所有配置的项目列表，包含基本状态信息
    """
    loader = get_config_loader()
    checker = get_readiness_checker(network)

    project_names = loader.list_projects()
    projects = []

    for name in project_names:
        try:
            config = loader.load_config(name)

            # 尝试获取状态（可能没有同步到数据库）
            try:
                report = await checker.get_project_status(name, network)
                readiness = report.readiness.value
            except Exception:
                readiness = "unknown"

            projects.append(
                ProjectSummary(
                    name=name,
                    description=config.description,
                    contract_count=len(config.contracts),
                    readiness=readiness,
                    primary_contract=config.primary_contract,
                )
            )
        except Exception as e:
            logger.warning(f"加载项目 {name} 失败: {e}")
            projects.append(
                ProjectSummary(
                    name=name,
                    description=None,
                    contract_count=0,
                    readiness="error",
                    primary_contract=None,
                )
            )

    return ProjectListResponse(projects=projects)


@router.get("/{name}/status", response_model=ProjectStatusResponse)
async def get_project_status(name: str, network: str = Depends(get_network)):
    """
    获取项目详细状态

    返回项目所有合约的详细状态信息，包括就绪状态、依赖关系、阻塞原因等
    """
    checker = get_readiness_checker(network)

    try:
        report = await checker.get_project_status(name, network)
    except Exception as e:
        logger.exception(f"获取项目状态失败: {name}")
        raise HTTPException(status_code=404, detail=f"项目不存在或加载失败: {e}")

    # 转换合约信息为响应格式
    contracts = []
    for contract_name, info in report.contracts.items():
        contracts.append(_convert_contract_info(info))

    # 主合约信息
    primary_info = None
    if report.primary_contract:
        primary_info = _convert_contract_info(report.primary_contract)

    return ProjectStatusResponse(
        project_name=report.project_name,
        readiness=report.readiness.value,
        summary=report.summary,
        statistics=ProjectStatistics(
            total_contracts=report.total_contracts,
            registered_count=report.registered_count,
            deployed_count=report.deployed_count,
            active_count=report.active_count,
        ),
        primary_contract=primary_info,
        contracts=contracts,
        blocking_contracts=report.blocking_contracts,
        deployable_contracts=report.deployable_contracts,
    )


@router.get("/{name}/deployment-order", response_model=DeploymentOrderResponse)
async def get_deployment_order(
    name: str,
    network: str = Depends(get_network),
    exclude_deployed: bool = Query(False, description="是否排除已部署合约"),
):
    """
    获取部署顺序

    基于依赖关系计算合约的推荐部署顺序，支持排除已部署合约
    """
    calculator = get_deployment_calculator()

    try:
        plan = await calculator.calculate_order(
            name, exclude_deployed=exclude_deployed, network=network
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"项目不存在或计算失败: {e}")

    # 构建分阶段响应
    phases_response: Dict[str, List[DeploymentStepInfo]] = {}

    for phase_num, steps in plan.phases.items():
        phase_steps = []
        for step in steps:
            phase_steps.append(
                DeploymentStepInfo(
                    order=step.order,
                    name=step.contract_name,
                    deploy_order=step.deploy_order,
                    is_deployed=step.is_deployed,
                    dependencies=step.dependencies,
                )
            )
        phases_response[str(phase_num)] = phase_steps

    return DeploymentOrderResponse(
        project_name=plan.project_name,
        total_steps=plan.total_steps,
        pending_count=plan.pending_count,
        deployed_count=plan.deployed_count,
        phases=phases_response,
        flat_order=plan.to_flat_list(),
        next_deployable=plan.get_next_deployable()[:5],
    )


@router.get("/{name}/dependency-graph", response_model=DependencyGraphResponse)
async def get_dependency_graph(name: str, network: str = Depends(get_network)):
    """
    获取依赖图（React Flow 格式）

    返回符合 React Flow 规范的节点和边数据，用于可视化展示
    """
    loader = get_config_loader()
    checker = get_readiness_checker(network)
    calculator = get_deployment_calculator()

    try:
        config = loader.load_config(name)
        report = await checker.get_project_status(name, network)
        phases = await calculator.get_deployment_phases(name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"项目不存在: {e}")

    nodes = []
    edges = []

    # 布局参数
    LAYER_HEIGHT = 150
    NODE_WIDTH = 180
    START_X = 100
    START_Y = 50
    MAX_WIDTH = 800

    # 构建节点位置映射
    node_positions: Dict[str, tuple] = {}

    for phase_num, contract_names in sorted(phases.items()):
        y = START_Y + (phase_num - 1) * LAYER_HEIGHT
        total_width = len(contract_names) * NODE_WIDTH
        start_x = START_X + max(0, (MAX_WIDTH - total_width) / 2)

        for i, contract_name in enumerate(contract_names):
            x = start_x + i * NODE_WIDTH
            node_positions[contract_name] = (x, y)

            info = report.contracts.get(contract_name)
            status = (
                info.current_status.value
                if info and info.current_status
                else "not_registered"
            )

            nodes.append(
                GraphNode(
                    id=contract_name,
                    type="contract",
                    position=NodePosition(x=x, y=y),
                    data=NodeData(
                        label=contract_name,
                        dependency_type=(
                            info.dependency_type.value if info else "business"
                        ),
                        status=status,
                        address=info.address if info else None,
                        is_ready=info.is_ready if info else False,
                    ),
                )
            )

    # 构建边
    for contract in config.contracts:
        target = contract.name

        # 必须依赖（实线）
        for dep in contract.required_deps:
            if dep in node_positions:
                dep_info = report.contracts.get(dep)
                is_bound = dep_info and dep_info.is_ready if dep_info else False

                edges.append(
                    GraphEdge(
                        id=f"{dep}-{target}",
                        source=dep,
                        target=target,
                        type="smoothstep",
                        animated=not is_bound,
                        style=EdgeStyle(
                            stroke="#10b981" if is_bound else "#ef4444",
                            strokeWidth=2,
                        ),
                        label="required",
                    )
                )

        # 可选依赖（虚线样式通过 strokeWidth 区分）
        for dep in contract.optional_deps:
            if dep in node_positions:
                edges.append(
                    GraphEdge(
                        id=f"{dep}-{target}-optional",
                        source=dep,
                        target=target,
                        type="smoothstep",
                        animated=False,
                        style=EdgeStyle(
                            stroke="#64748b",
                            strokeWidth=1,
                        ),
                        label="optional",
                    )
                )

    return DependencyGraphResponse(nodes=nodes, edges=edges)


@router.post("/{name}/sync", response_model=SyncResponse)
async def sync_project_config(
    name: str, force: bool = Query(False, description="是否强制覆盖现有配置")
):
    """
    同步项目配置到数据库

    从 YAML 配置文件同步合约配置到数据库，支持强制覆盖模式
    """
    loader = get_config_loader()

    try:
        stats = await loader.sync_to_database(name, force=force)
    except ConfigLoadError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"同步项目 {name} 失败")
        raise HTTPException(status_code=500, detail=f"同步失败: {e}")

    return SyncResponse(
        success=True,
        project_name=name,
        stats=SyncStats(
            created=stats["created"],
            updated=stats["updated"],
            unchanged=stats["unchanged"],
            contracts=stats["contracts"],
        ),
    )


# ===== Helper Functions =====


def _convert_contract_info(info: ContractReadinessInfo) -> ContractStatusInfo:
    """转换合约信息为响应格式"""
    return ContractStatusInfo(
        name=info.contract_name,
        dependency_type=info.dependency_type.value,
        status=info.current_status.value if info.current_status else None,
        address=info.address,
        is_primary=info.is_primary,
        is_ready=info.is_ready,
        is_deployed=info.is_deployed,
        missing_required_deps=info.missing_required_deps,
        missing_optional_deps=info.missing_optional_deps,
        zero_bound_deps=info.zero_bound_deps,
        blocking_reason=info.blocking_reason,
    )


# ===== 绑定同步 Endpoints (Story 10.6) =====


@router.get(
    "/{name}/contracts/{contract_name}/bindings",
    response_model=ContractBindingStatus,
)
async def get_contract_bindings(
    name: str,
    contract_name: str,
    network: str = Depends(get_network),
):
    """
    获取合约绑定状态

    返回合约的部署地址和所有依赖绑定信息
    """
    sync_service = get_binding_sync_service()

    status = await sync_service.get_binding_status(name, contract_name, network)

    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"未找到合约绑定状态: {name}/{contract_name}@{network}",
        )

    # 转换 bindings 为 BindingInfo 格式
    bindings_info = {}
    for dep_name, binding in status.get("bindings", {}).items():
        bindings_info[dep_name] = BindingInfo(
            address=binding.get("address", ""),
            is_bound=binding.get("is_bound", False),
            is_zero=binding.get("is_zero", False),
            last_synced=binding.get("last_synced"),
        )

    return ContractBindingStatus(
        contract_name=status["contract_name"],
        address=status.get("address"),
        status=status.get("status"),
        is_deployed=status.get("is_deployed", False),
        bindings=bindings_info,
        updated_at=status.get("updated_at"),
    )


@router.put(
    "/{name}/contracts/{contract_name}/bindings",
    response_model=BindingSyncResultInfo,
)
async def update_contract_bindings(
    name: str,
    contract_name: str,
    request: UpdateBindingsRequest,
    network: str = Depends(get_network),
):
    """
    更新合约绑定

    手动设置合约的依赖绑定地址
    """
    sync_service = get_binding_sync_service()

    result = await sync_service.update_contract_bindings(
        project_name=name,
        contract_name=contract_name,
        network=network,
        bindings=request.bindings,
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return BindingSyncResultInfo(
        contract_name=result.contract_name,
        success=result.success,
        bindings_updated=result.bindings_updated,
        status_changed=result.status_changed,
        old_status=result.old_status,
        new_status=result.new_status,
        error=result.error,
    )


@router.put(
    "/{name}/contracts/{contract_name}/deployment",
    response_model=BindingSyncResultInfo,
)
async def update_contract_deployment(
    name: str,
    contract_name: str,
    request: UpdateDeploymentRequest,
    network: str = Depends(get_network),
):
    """
    更新合约部署状态

    设置合约的部署地址和状态
    """
    sync_service = get_binding_sync_service()

    # 转换状态字符串
    status_enum = None
    if request.status:
        try:
            status_enum = ContractRegistryStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"无效的状态值: {request.status}",
            )

    result = await sync_service.update_deployment_status(
        project_name=name,
        contract_name=contract_name,
        network=network,
        address=request.address,
        status=status_enum,
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return BindingSyncResultInfo(
        contract_name=result.contract_name,
        success=result.success,
        bindings_updated=result.bindings_updated,
        status_changed=result.status_changed,
        old_status=result.old_status,
        new_status=result.new_status,
        error=result.error,
    )


@router.post(
    "/{name}/sync-bindings",
    response_model=ProjectBindingSyncResponse,
)
async def sync_project_bindings(
    name: str,
    network: str = Depends(get_network),
):
    """
    同步项目绑定状态（从链上读取）

    注意: 此功能需要配置 Web3 适配器
    """
    sync_service = get_binding_sync_service()

    result = await sync_service.sync_project_bindings(name, network)

    return ProjectBindingSyncResponse(
        project_name=result.project_name,
        network=result.network,
        total_contracts=result.total_contracts,
        synced_count=result.synced_count,
        failed_count=result.failed_count,
        results=[
            BindingSyncResultInfo(
                contract_name=r.contract_name,
                success=r.success,
                bindings_updated=r.bindings_updated,
                status_changed=r.status_changed,
                old_status=r.old_status,
                new_status=r.new_status,
                error=r.error,
            )
            for r in result.results
        ],
        elapsed_ms=result.elapsed_ms,
    )
