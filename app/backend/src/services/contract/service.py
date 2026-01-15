"""
Contract Service
合约地址服务
"""

from typing import Optional

from falib.utils.config import SETTINGS

from src.models.contracts.contract import Contract as ContractModel
from src.models.contracts.contract_dependency import (
    ContractDependency as ContractDependencyModel,
)
from src.shared.schemas.enums import ContractStatus


class ContractService:
    """合约服务"""

    def __init__(self, network: Optional[str] = None):
        self.network = SETTINGS.NETWORK

    async def get_contract_address(
        self, project_name: str, contract_name: str
    ) -> Optional[str]:
        """获取单个合约地址"""
        contract = await ContractModel.filter(
            project_name=project_name,
            name=contract_name,
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()
        return contract.address if contract else None

    async def get_contract_status(self) -> dict:
        """
        获取合约状态列表（用于列表视图）

        返回格式与前端 ContractStatusList 接口匹配：
        {
            "contracts": [
                {
                    "name": "ContractName",
                    "project": "vanke",
                    "address": "0x...",
                    "deploy_step": "step-1",
                    "deployed": true,
                    "deployed_at": "2025-01-01T00:00:00",
                    "dependency_status": "synced" | "needs_update" | "not_deployed",
                    "dependencies": [...],
                    "set_functions": [...],
                    "display_name": "Display Name",  # 可选
                    "type": "exclusive"  # 可选，从 project 推断
                }
            ],
            "projects": [
                {"name": "common", "label": "公共合约", "description": "...", "color": "blue", "order": 1},
                {"name": "vanke", "label": "万科项目", "description": "...", "color": "green", "order": 2},
                {"name": "mock", "label": "Mock合约", "description": "...", "color": "orange", "order": 3}
            ],
            "network": "dev",
            "needs_update_count": 0
        }
        """
        # 查询所有合约
        contracts = await ContractModel.all().order_by("name")

        # 查询所有依赖关系
        bindings = await ContractDependencyModel.all()

        # 构建合约映射 {name: contract}
        contract_map = {c.name: c for c in contracts}

        # 构建绑定映射 {contract_name: [bindings]}
        binding_map = {}
        for b in bindings:
            if b.contract_name not in binding_map:
                binding_map[b.contract_name] = []
            binding_map[b.contract_name].append(b)

        # 合约类型映射：modules -> type
        module_type_map = {
            "stablecoin": "mock",
            "business": "exclusive",
            "oracle": "common",
            "kyc": "common",
            "unknown": "exclusive",
        }

        # 项目配置（固定）
        project_configs = {
            "common": {
                "name": "common",
                "label": "公共合约",
                "description": "所有项目共享的合约",
                "color": "blue",
                "order": 1,
            },
            "vanke": {
                "name": "vanke",
                "label": "万科项目",
                "description": "万科RWA项目专属合约",
                "color": "green",
                "order": 2,
            },
            "mock": {
                "name": "mock",
                "label": "Mock合约",
                "description": "测试用Mock合约",
                "color": "orange",
                "order": 3,
            },
            "fake": {
                "name": "fake",
                "label": "测试项目",
                "description": "测试项目合约",
                "color": "purple",
                "order": 4,
            },
        }

        # 构建合约列表
        contract_list = []
        needs_update_count = 0

        for contract in contracts:
            # 检查依赖状态
            contract_bindings = binding_map.get(contract.name, [])
            has_outdated = False

            dependencies = []
            for binding in contract_bindings:
                dep_contract = contract_map.get(binding.dependency_name)
                if dep_contract and binding.dependency_address:
                    dep_addr = binding.dependency_address.lower()
                    latest_addr = dep_contract.address.lower()
                    dep_status = "needs_update" if dep_addr != latest_addr else "synced"
                    if dep_status == "needs_update":
                        has_outdated = True
                elif dep_contract:
                    dep_status = "needs_update"
                    has_outdated = True
                else:
                    dep_status = "not_deployed"

                dependencies.append(
                    {
                        "dependency_name": binding.dependency_name,
                        "set_function": DEPENDENCY_SET_FUNCTIONS.get(
                            (binding.contract_name, binding.dependency_name),
                            f"set{binding.dependency_name}",
                        ),
                        "status": dep_status,
                        "current_address": binding.dependency_address,
                        "latest_address": dep_contract.address
                        if dep_contract
                        else None,
                        "last_synced_at": binding.updated_at.isoformat()
                        if binding.updated_at
                        else None,
                    }
                )

            if has_outdated:
                needs_update_count += 1

            # 映射 modules 到 type
            module_value = contract.modules.value if contract.modules else None
            contract_type = module_type_map.get(module_value, "exclusive")

            # 使用 project_name 或默认值，unknown 映射为 common
            project_name = contract.project_name or "common"
            if project_name.lower() == "unknown":
                project_name = "common"

            # 计算精确的部署状态
            # - deployed_and_binded: 有地址且所有依赖都已绑定
            # - deployed_needs_binding: 有地址但有依赖未绑定或需更新
            # - not_deployed: 无地址
            if not contract.address:
                deployment_status = "not_deployed"
            elif has_outdated or not contract_bindings:
                deployment_status = "deployed_needs_binding"
            else:
                deployment_status = "deployed_and_binded"

            contract_list.append(
                {
                    "name": contract.name,
                    "project": project_name,
                    "address": contract.address,
                    "deploy_step": contract.name,  # 暂时使用 name 作为 deploy_step
                    "deployed": bool(contract.address),
                    "deployed_at": contract.created_at.isoformat()
                    if contract.created_at
                    else None,
                    "dependency_status": "needs_update" if has_outdated else "synced",
                    "deployment_status": deployment_status,  # 新增：精确状态
                    "dependencies": dependencies,
                    "set_functions": [],  # 可以从 bindings 中提取
                    "type": contract_type,
                }
            )

        return {
            "contracts": contract_list,
            "projects": list(project_configs.values()),
            "network": self.network,
            "needs_update_count": needs_update_count,
        }

    async def get_dependency_graph(self) -> dict:
        """
        获取合约依赖关系图数据

        数据来源：仅使用 Contract 和 ContractDependency 两张表

        返回用于前端可视化图的数据结构：
        {
            "nodes": [{"id": "ContractName", "label": "...", "type": "...", "address": "...", "status": "...", "project": "..."}],
            "edges": [{"source": "ContractA", "target": "ContractB", "label": "setFunction", "setFunction": "...", "status": "..."}]
        }
        """
        # 查询所有合约（不过滤 network，获取所有数据）
        contracts = await ContractModel.all()

        # 构建合约映射 {name: contract}
        contract_map = {c.name: c for c in contracts}

        # 查询所有绑定记录（包括未绑定的）
        # 不过滤 contract_address，获取所有记录以显示依赖关系
        bindings = await ContractDependencyModel.all()

        # 构建绑定映射 {contract_name: [bindings]}
        binding_map = {}
        for b in bindings:
            if b.contract_name not in binding_map:
                binding_map[b.contract_name] = []
            binding_map[b.contract_name].append(b)

        # 合约类型映射：modules -> type
        # stablecoin -> mock, business -> exclusive, oracle/kyc -> common
        module_type_map = {
            "stablecoin": "mock",
            "business": "exclusive",
            "oracle": "common",
            "kyc": "common",
            "unknown": "exclusive",
        }

        # 构建节点列表
        nodes = []
        for contract in contracts:
            # 检查该合约是否有需要更新的依赖
            contract_bindings = binding_map.get(contract.name, [])
            has_outdated = False

            for binding in contract_bindings:
                dep_contract = contract_map.get(binding.dependency_name)
                if dep_contract and binding.dependency_address:
                    # 比较绑定的依赖地址与当前合约地址
                    dep_addr = binding.dependency_address.lower()
                    latest_addr = dep_contract.address.lower()
                    if dep_addr != latest_addr:
                        has_outdated = True
                        break

            # 映射 modules 到 type - 处理 None 值
            module_value = contract.modules.value if contract.modules else None
            contract_type = module_type_map.get(module_value, "exclusive")

            # 使用 project_name 或默认值
            project_name = contract.project_name or "unknown"

            nodes.append(
                {
                    "id": contract.name,
                    "label": contract.name,
                    "type": contract_type,
                    "module": module_value,  # 保留原始模块类型（kyc, stablecoin, business, oracle）
                    "address": contract.address,
                    "status": "needs_update" if has_outdated else "synced",
                    "project": project_name,
                    "deployedAt": contract.created_at.isoformat()
                    if contract.created_at
                    else None,
                }
            )

        # 构建边列表
        edges = []
        for binding in bindings:
            # 获取 set 函数名称
            set_func = DEPENDENCY_SET_FUNCTIONS.get(
                (binding.contract_name, binding.dependency_name),
                f"set{binding.dependency_name}",
            )

            # 检查边的状态
            dep_contract = contract_map.get(binding.dependency_name)
            if dep_contract and binding.dependency_address:
                dep_addr = binding.dependency_address.lower()
                latest_addr = dep_contract.address.lower()
                edge_status = "needs_update" if dep_addr != latest_addr else "synced"
            elif dep_contract:
                # 有合约但没有依赖地址记录
                edge_status = "needs_update"
            else:
                edge_status = "not_deployed"

            edges.append(
                {
                    "source": binding.contract_name,
                    "target": binding.dependency_name,
                    "label": set_func,
                    "setFunction": set_func,
                    "status": edge_status,
                    "currentAddress": binding.dependency_address,
                    "latestAddress": dep_contract.address if dep_contract else None,
                    "isBinded": binding.is_binded,
                    "isDeployed": binding.is_deployed,
                }
            )

        return {
            "nodes": nodes,
            "edges": edges,
        }


def get_contract_service(network: Optional[str] = None) -> ContractService:
    """获取合约服务实例"""
    return ContractService(network)
