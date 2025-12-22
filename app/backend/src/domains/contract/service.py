"""
Contract Service
合约地址服务
"""

from datetime import datetime, timezone
from typing import Optional

from falib.utils.config import SETTINGS

from src.domains.contract.schemas import (
    ContractAddressesResponse,
    ContractDependency,
    ContractStatus,
    ContractStatusEnhanced,
    ContractStatusList,
    ContractStatusListEnhanced,
    DependencyStatus,
    ProjectInfo,
    SubscriptionContractInfo,
    SubscriptionParams,
)
from src.models.contract_dependency import DEPENDENCY_SET_FUNCTIONS, ContractBinding
from src.models.deploy import DeployInfo

# 项目显示配置（用于前端展示，fallback 值）
# 实际项目信息从数据库读取
DEFAULT_PROJECT_DISPLAY = {
    "common": {"label": "公共合约", "color": "blue", "order": 0},
    "mock": {"label": "Mock 合约", "color": "orange", "order": 1},
}


class ContractService:
    """合约服务"""

    def __init__(self, network: Optional[str] = None):
        # 将 environment 映射到网络名称
        env = network or SETTINGS.environment or "local"
        self.network = self._env_to_network(env)

    @staticmethod
    def _env_to_network(env: str) -> str:
        """环境名称映射到网络名称"""
        mapping = {
            "local": "local",
            "test": "sepolia",
            "main": "mainnet",
        }
        return mapping.get(env, env)

    async def get_contract_address(
        self, deploy_step: str, contract_name: str
    ) -> Optional[str]:
        """获取单个合约地址"""
        info = await DeployInfo.filter(
            deploy_step=deploy_step,
            contract_name=contract_name,
            network=self.network,
            is_active=True,
        ).first()
        return info.contract_address if info else None

    async def get_all_addresses(self) -> ContractAddressesResponse:
        """获取所有合约地址"""
        deploys = await DeployInfo.filter(
            network=self.network,
            is_active=True,
        ).all()

        # 使用合约名称作为键，更灵活地匹配
        address_map = {d.contract_name: d.contract_address for d in deploys}

        return ContractAddressesResponse(
            mock_usdt=address_map.get("MockUSDT"),
            mock_usdc=address_map.get("MockUSDC"),
            kyc_manager=address_map.get("KYCManager"),
            rwa_token=address_map.get("RWATokenSTO"),
            platform_token=address_map.get("PlatformToken"),
            subscription=address_map.get("Subscription"),
            staking=address_map.get("Staking"),
            liquidity_mining=address_map.get("LiquidityMining"),
            network=self.network,
        )

    async def get_subscription_info(self) -> Optional[SubscriptionContractInfo]:
        """获取认购合约信息（从数据库读取）"""
        # 一次性查询所有需要的合约
        contract_names = ["Subscription", "MockUSDT", "RWATokenSTO", "KYCManager"]
        deploys = await DeployInfo.filter(
            network=self.network,
            contract_name__in=contract_names,
            is_active=True,
        ).all()

        deploy_map = {d.contract_name: d for d in deploys}
        subscription = deploy_map.get("Subscription")

        if not subscription:
            return None

        return SubscriptionContractInfo(
            address=subscription.contract_address,
            usdt_address=deploy_map.get("MockUSDT").contract_address
            if deploy_map.get("MockUSDT")
            else "",
            rwa_token_address=deploy_map.get("RWATokenSTO").contract_address
            if deploy_map.get("RWATokenSTO")
            else "",
            kyc_manager_address=deploy_map.get("KYCManager").contract_address
            if deploy_map.get("KYCManager")
            else "",
            params=SubscriptionParams(
                min_investment=0,
                max_investment=0,
                require_accredited=False,
                paused=False,
                apy_1m=0,
                apy_3m=0,
                apy_6m=0,
                apy_12m=0,
            ),
        )

    async def get_all_contract_status(self) -> ContractStatusList:
        """获取所有合约的状态（从数据库读取）"""
        # 查询所有活跃的合约
        deploys = await DeployInfo.filter(
            network=self.network,
            is_active=True,
        ).all()

        deploy_map = {d.contract_name: d for d in deploys}

        # 查询所有绑定记录
        bindings = await ContractBinding.filter(
            network=self.network,
        ).all()

        # 构建绑定映射 {contract_name: [bindings]}
        binding_map = {}
        for b in bindings:
            if b.contract_name not in binding_map:
                binding_map[b.contract_name] = []
            binding_map[b.contract_name].append(b)

        contracts = []
        for deploy in deploys:
            name = deploy.contract_name
            contract_bindings = binding_map.get(name, [])

            # 从绑定记录构建依赖地址映射
            dependencies = {}
            for binding in contract_bindings:
                dep_deploy = deploy_map.get(binding.dependency_name)
                dependencies[binding.dependency_name] = (
                    dep_deploy.contract_address if dep_deploy else None
                )

            contracts.append(
                ContractStatus(
                    name=name,
                    address=deploy.contract_address,
                    deploy_step=deploy.deploy_step,
                    deployed=True,
                    deployed_at=deploy.created_at.isoformat()
                    if deploy.created_at
                    else None,
                    dependencies=dependencies,
                    set_functions=[b.set_function for b in contract_bindings],
                )
            )

        return ContractStatusList(
            contracts=contracts,
            network=self.network,
        )

    async def get_contract_dependencies(
        self, contract_name: str
    ) -> Optional[ContractDependency]:
        """获取单个合约的依赖关系（从数据库读取）"""
        # 查询合约是否存在
        deploy = await DeployInfo.filter(
            network=self.network,
            contract_name=contract_name,
            is_active=True,
        ).first()

        if not deploy:
            return None

        # 查询该合约的绑定记录
        bindings = await ContractBinding.filter(
            network=self.network,
            contract_name=contract_name,
        ).all()

        return ContractDependency(
            contract_name=contract_name,
            depends_on=[b.dependency_name for b in bindings],
            set_functions=[b.set_function for b in bindings],
        )

    async def get_contract_status_enhanced(self) -> ContractStatusListEnhanced:
        """
        获取增强版合约状态（含依赖检测）

        直接从数据库读取活跃的合约，不再依赖静态配置。
        检测逻辑（基于地址比较）：
        1. 查询 deploy_info 表获取活跃合约
        2. 查询 contract_binding 表获取绑定的依赖地址
        3. 如果 bound_address ≠ latest_address → needs_update
        """
        # 查询所有活跃的合约部署记录
        deploys = await DeployInfo.filter(
            network=self.network,
            is_active=True,
        ).all()

        deploy_map = {d.contract_name: d for d in deploys}

        # 查询所有绑定记录
        bindings = await ContractBinding.filter(
            network=self.network,
        ).all()

        # 构建绑定映射 {contract_name: [bindings]}
        binding_map = {}
        for b in bindings:
            if b.contract_name not in binding_map:
                binding_map[b.contract_name] = []
            binding_map[b.contract_name].append(b)

        contracts = []
        needs_update_count = 0
        project_set = set()

        # 遍历数据库中的活跃合约
        for deploy in deploys:
            name = deploy.contract_name
            project_set.add(deploy.project)

            dependencies_status = []
            contract_needs_update = False

            # 获取该合约的所有绑定记录
            contract_bindings = binding_map.get(name, [])

            for binding in contract_bindings:
                dep_name = binding.dependency_name
                dep_deploy = deploy_map.get(dep_name)

                # 判断状态（基于地址比较）
                if not dep_deploy:
                    # 被依赖合约未部署或已失效
                    status = "not_deployed"
                else:
                    # 比较绑定地址和最新地址
                    bound_addr = binding.bound_address.lower()
                    latest_addr = dep_deploy.contract_address.lower()

                    if bound_addr != latest_addr:
                        status = "needs_update"
                        contract_needs_update = True
                    else:
                        status = "synced"

                dependencies_status.append(
                    DependencyStatus(
                        dependency_name=dep_name,
                        set_function=binding.set_function,
                        status=status,
                        current_address=binding.bound_address,
                        latest_address=dep_deploy.contract_address
                        if dep_deploy
                        else None,
                        last_synced_at=binding.last_updated_at.isoformat()
                        if binding.last_updated_at
                        else None,
                    )
                )

            # 计算总体依赖状态
            if contract_needs_update:
                overall_status = "needs_update"
                needs_update_count += 1
            else:
                overall_status = "synced"

            contracts.append(
                ContractStatusEnhanced(
                    name=name,
                    project=deploy.project,
                    address=deploy.contract_address,
                    deploy_step=deploy.deploy_step,
                    deployed=True,
                    deployed_at=deploy.created_at.isoformat()
                    if deploy.created_at
                    else None,
                    dependency_status=overall_status,
                    dependencies=dependencies_status,
                    set_functions=[b.set_function for b in contract_bindings],
                )
            )

        # 动态构建项目列表（基于数据库中的实际项目）
        projects = []
        for project_name in project_set:
            display = DEFAULT_PROJECT_DISPLAY.get(project_name, {})
            projects.append(
                ProjectInfo(
                    name=project_name,
                    label=display.get("label", project_name),
                    description=display.get("description", ""),
                    color=display.get("color", "green"),
                    order=display.get("order", 10),
                )
            )
        projects.sort(key=lambda p: p.order)

        return ContractStatusListEnhanced(
            contracts=contracts,
            projects=projects,
            network=self.network,
            needs_update_count=needs_update_count,
        )

    async def get_available_contracts_for_asset(self) -> dict:
        """
        获取可用于 Asset 绑定的合约列表

        返回按项目分组的合约，排除 mock 项目（mock 仅用于测试币铸造）
        """
        # 查询所有活跃的合约（排除 mock）
        deploys = (
            await DeployInfo.filter(
                network=self.network,
                is_active=True,
            )
            .exclude(project="mock")
            .all()
        )

        # 按项目分组
        projects = {}
        common_contracts = []

        for deploy in deploys:
            contract_info = {
                "name": deploy.contract_name,
                "address": deploy.contract_address,
                "deploy_step": deploy.deploy_step,
            }

            if deploy.project == "common":
                common_contracts.append(contract_info)
            else:
                if deploy.project not in projects:
                    projects[deploy.project] = {
                        "name": deploy.project,
                        "contracts": [],
                    }
                projects[deploy.project]["contracts"].append(contract_info)

        return {
            "projects": list(projects.values()),
            "common_contracts": common_contracts,
            "network": self.network,
        }

    async def confirm_binding_update(
        self,
        contract_name: str,
        dependency_name: str,
        new_address: str,
        tx_hash: str,
    ) -> bool:
        """
        确认绑定更新完成

        当管理员通过 MetaMask 调用 set 函数后，更新绑定记录
        """
        binding = await ContractBinding.filter(
            contract_name=contract_name,
            dependency_name=dependency_name,
            network=self.network,
        ).first()

        if binding:
            # 更新绑定记录
            binding.bound_address = new_address.lower()
            binding.last_updated_tx = tx_hash
            binding.last_updated_at = datetime.now(timezone.utc)
            await binding.save()
            return True
        else:
            # 创建新绑定记录
            # 首先获取主合约地址
            contract_deploy = await DeployInfo.filter(
                contract_name=contract_name,
                network=self.network,
                is_active=True,
            ).first()

            if not contract_deploy:
                return False

            set_func = DEPENDENCY_SET_FUNCTIONS.get(
                (contract_name, dependency_name), f"set{dependency_name}"
            )

            await ContractBinding.create(
                contract_name=contract_name,
                contract_address=contract_deploy.contract_address.lower(),
                dependency_name=dependency_name,
                bound_address=new_address.lower(),
                set_function=set_func,
                network=self.network,
                last_updated_tx=tx_hash,
            )
            return True

    async def reset_deployments_by_project(self, project: str) -> int:
        """
        按项目清除部署记录

        Args:
            project: 项目标识 (common, mock, fake)

        返回删除的记录数
        """
        # 先获取该项目的合约名列表（在软删除之前）
        deploys = await DeployInfo.filter(
            network=self.network,
            project=project,
            is_active=True,
        ).all()
        contract_names = [d.contract_name for d in deploys]

        # 软删除 deploy_info 记录
        deploy_count = await DeployInfo.filter(
            network=self.network,
            project=project,
            is_active=True,
        ).update(is_active=False)

        # 删除相关绑定记录
        if contract_names:
            await ContractBinding.filter(
                network=self.network,
                contract_name__in=contract_names,
            ).delete()

        return deploy_count

    async def reset_all_deployments(self) -> int:
        """
        清除所有部署记录

        返回删除的记录数
        """
        # 软删除 deploy_info 记录
        deploy_count = await DeployInfo.filter(
            network=self.network,
            is_active=True,
        ).update(is_active=False)

        # 删除绑定记录（硬删除，因为合约都没了）
        await ContractBinding.filter(
            network=self.network,
        ).delete()

        return deploy_count


def get_contract_service(network: Optional[str] = None) -> ContractService:
    """获取合约服务实例"""
    return ContractService(network)
