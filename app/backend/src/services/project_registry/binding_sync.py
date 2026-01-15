"""
合约绑定状态同步服务

Story 10.6: 合约绑定状态同步

功能:
- 同步单个合约的绑定状态
- 同步整个项目的绑定状态
- 根据绑定状态计算合约状态

注意: 链上交互部分需要配置 Web3 和合约 ABI
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from falib.utils.log import get_logger

from src.models.project_registry import ContractDeploymentStatus, ProjectContractConfig
from src.shared.schemas.enums import ContractRegistryStatus

logger = get_logger("project_registry.binding_sync")


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


@dataclass
class BindingSyncResult:
    """单个合约同步结果"""

    contract_name: str
    success: bool
    bindings_updated: int = 0
    status_changed: bool = False
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ProjectSyncResult:
    """项目同步结果"""

    project_name: str
    network: str
    total_contracts: int
    synced_count: int
    failed_count: int
    results: List[BindingSyncResult] = field(default_factory=list)
    elapsed_ms: float = 0.0


class BindingSyncService:
    """
    合约绑定状态同步服务
    
    支持两种模式:
    1. 手动模式: 通过 API 传入绑定信息更新
    2. 链上模式: 自动从链上读取绑定地址（需要 Web3 配置）
    """

    # 依赖名到合约函数的映射（用于链上读取）
    DEPENDENCY_GETTERS: Dict[str, List[str]] = {
        "kyc": ["kyc", "get_kyc", "kyc_contract"],
        "payment_token": ["payment_token", "get_payment_token", "token"],
        "subscription": ["subscription", "get_subscription"],
        "capital_oracle": ["capital_oracle", "oracle"],
        "staking_token": ["staking_token", "stake_token"],
        "reward_token": ["reward_token", "rewards_token"],
        "treasury": ["treasury", "treasury_address"],
        "token": ["token", "rwa_token", "get_token"],
    }

    def __init__(self):
        self._web3_adapter = None

    async def update_contract_bindings(
        self,
        project_name: str,
        contract_name: str,
        network: str,
        bindings: Dict[str, str],
    ) -> BindingSyncResult:
        """
        手动更新合约绑定状态

        Args:
            project_name: 项目名称
            contract_name: 合约名称
            network: 网络
            bindings: 绑定地址映射 {dep_name: address}

        Returns:
            BindingSyncResult: 同步结果
        """
        result = BindingSyncResult(contract_name=contract_name, success=False)

        try:
            # 获取部署状态记录
            deployment = await ContractDeploymentStatus.filter(
                config__project_name=project_name,
                config__contract_name=contract_name,
                network=network,
            ).select_related("config").first()

            if not deployment:
                result.error = f"未找到部署记录: {project_name}/{contract_name}@{network}"
                return result

            # 更新绑定
            current_bindings = deployment.bindings or {}
            updated_bindings = dict(current_bindings)
            bindings_changed = 0

            for dep_name, address in bindings.items():
                is_zero = address == ZERO_ADDRESS
                is_bound = address != ZERO_ADDRESS or deployment.config.allow_zero_address

                old_binding = current_bindings.get(dep_name, {})
                new_binding = {
                    "address": address,
                    "is_bound": is_bound,
                    "is_zero": is_zero,
                    "last_synced": datetime.now(timezone.utc).isoformat(),
                }

                if old_binding.get("address") != address:
                    bindings_changed += 1
                    logger.info(
                        f"绑定更新: {contract_name}.{dep_name} "
                        f"{old_binding.get('address', 'N/A')} -> {address}"
                    )

                updated_bindings[dep_name] = new_binding

            deployment.bindings = updated_bindings

            # 重新计算状态
            old_status = deployment.status
            new_status = self._compute_status(deployment)

            if new_status != old_status:
                deployment.status = new_status
                result.status_changed = True
                result.old_status = old_status.value if old_status else None
                result.new_status = new_status.value

            await deployment.save()

            result.success = True
            result.bindings_updated = bindings_changed

        except Exception as e:
            logger.exception(f"更新绑定失败: {contract_name}")
            result.error = str(e)

        return result

    async def update_deployment_status(
        self,
        project_name: str,
        contract_name: str,
        network: str,
        address: Optional[str] = None,
        status: Optional[ContractRegistryStatus] = None,
    ) -> BindingSyncResult:
        """
        更新合约部署状态

        Args:
            project_name: 项目名称
            contract_name: 合约名称
            network: 网络
            address: 部署地址
            status: 新状态

        Returns:
            BindingSyncResult
        """
        result = BindingSyncResult(contract_name=contract_name, success=False)

        try:
            # 获取配置
            config = await ProjectContractConfig.filter(
                project_name=project_name,
                contract_name=contract_name,
            ).first()

            if not config:
                result.error = f"未找到合约配置: {project_name}/{contract_name}"
                return result

            # 获取或创建部署记录
            deployment, created = await ContractDeploymentStatus.get_or_create(
                config=config,
                network=network,
                defaults={
                    "status": status or ContractRegistryStatus.REGISTERED,
                    "address": address,
                },
            )

            if not created:
                old_status = deployment.status
                if address:
                    deployment.address = address
                if status:
                    deployment.status = status

                    if old_status != status:
                        result.status_changed = True
                        result.old_status = old_status.value
                        result.new_status = status.value

                await deployment.save()

            result.success = True
            logger.info(
                f"更新部署状态: {contract_name}@{network}, "
                f"address={address}, status={status}"
            )

        except Exception as e:
            logger.exception(f"更新部署状态失败: {contract_name}")
            result.error = str(e)

        return result

    async def sync_project_bindings(
        self,
        project_name: str,
        network: str,
    ) -> ProjectSyncResult:
        """
        同步整个项目的绑定状态（从链上读取）

        注意: 需要配置 Web3 适配器才能使用

        Args:
            project_name: 项目名称
            network: 网络名称

        Returns:
            ProjectSyncResult: 项目同步结果
        """
        import time

        start_time = time.time()

        # 查询所有已部署的合约
        deployments = await ContractDeploymentStatus.filter(
            config__project_name=project_name,
            network=network,
        ).select_related("config").all()

        results = []
        synced = 0
        failed = 0

        for deployment in deployments:
            if not deployment.address:
                # 跳过未部署的合约
                results.append(
                    BindingSyncResult(
                        contract_name=deployment.config.contract_name,
                        success=False,
                        error="合约未部署（无地址）",
                    )
                )
                failed += 1
                continue

            # TODO: 实现链上读取绑定地址
            # result = await self._sync_contract_from_chain(deployment)
            result = BindingSyncResult(
                contract_name=deployment.config.contract_name,
                success=False,
                error="链上同步功能待实现",
            )
            results.append(result)
            failed += 1

        elapsed = (time.time() - start_time) * 1000

        return ProjectSyncResult(
            project_name=project_name,
            network=network,
            total_contracts=len(deployments),
            synced_count=synced,
            failed_count=failed,
            results=results,
            elapsed_ms=elapsed,
        )

    def _compute_status(
        self, deployment: ContractDeploymentStatus
    ) -> ContractRegistryStatus:
        """
        根据绑定状态计算合约状态
        """
        config = deployment.config
        bindings = deployment.bindings or {}

        # 如果没有地址，保持 REGISTERED
        if not deployment.address:
            return ContractRegistryStatus.REGISTERED

        # 检查必须依赖
        required_deps = config.required_deps or []
        all_required_bound = True

        for dep in required_deps:
            binding = bindings.get(dep, {})
            if not binding.get("is_bound", False):
                all_required_bound = False
                break

        # 如果所有必须依赖都已绑定，状态为 ACTIVE
        if all_required_bound:
            return ContractRegistryStatus.ACTIVE

        # 如果有绑定但不完整，状态为 BOUND
        if bindings:
            return ContractRegistryStatus.BOUND

        # 有地址但无绑定，状态为 DEPLOYED
        return ContractRegistryStatus.DEPLOYED

    async def get_binding_status(
        self,
        project_name: str,
        contract_name: str,
        network: str,
    ) -> Optional[Dict[str, Any]]:
        """
        获取合约绑定状态

        Returns:
            绑定状态字典，包含地址和绑定信息
        """
        deployment = await ContractDeploymentStatus.filter(
            config__project_name=project_name,
            config__contract_name=contract_name,
            network=network,
        ).select_related("config").first()

        if not deployment:
            return None

        return {
            "contract_name": contract_name,
            "address": deployment.address,
            "status": deployment.status.value if deployment.status else None,
            "is_deployed": deployment.is_deployed,
            "bindings": deployment.bindings or {},
            "updated_at": deployment.updated_at.isoformat() if deployment.updated_at else None,
        }


# ===== 工厂函数 =====

_sync_service: Optional[BindingSyncService] = None


def get_binding_sync_service() -> BindingSyncService:
    """获取绑定同步服务单例"""
    global _sync_service
    if _sync_service is None:
        _sync_service = BindingSyncService()
    return _sync_service
