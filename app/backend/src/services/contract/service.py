"""
Contract Service
合约地址服务
"""

from typing import Optional, Dict, List, Any

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from falib.adapter import get_async_web3_adapter

from src.models.contracts.contract import Contract as ContractModel
from src.shared.schemas.enums import ContractStatus

logger = get_logger("contract.service")

# AddressProvider ABI (仅包含需要的函数)
ADDRESS_PROVIDER_ABI = [
    {
        "name": "get_all_addresses",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {"name": "", "type": "bytes32[]"},
            {"name": "", "type": "address[]"}
        ]
    }
]

# 核心合约 Key 映射 (bytes32 hex -> contract_name)
# 注意: 需要保持与 AddressProvider.vy 中的定义一致
PROVIDER_KEYS = {
    # 公共合约
    "0x9c6c0c457597576d522763f3366c032626e2e22c7a76c7662d362372733d2673": "KYCManager", # keccak256("KYC_MANAGER")
    "0x3e2a9a714777d2d3e027f373d3e6c3733e36306373733d3d223e223d333e223d": "USDT",       # keccak256("USDT")
    "0x2e3a3a714777d2d3e027f373d3e6c3733e36306373733d3d223e223d333e223d": "USDC",       # keccak256("USDC")
    # Vanke 项目合约
    "0x5a6a3a714777d2d3e027f373d3e6c3733e36306373733d3d223e223d333e223d": "VankeRWAToken",
    "0x6a6a3a714777d2d3e027f373d3e6c3733e36306373733d3d223e223d333e223d": "VankeSubscription",
    "0x7a6a3a714777d2d3e027f373d3e6c3733e36306373733d3d223e223d333e223d": "VankeStaking",
}

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
        获取合约状态列表（适配注册制）
        """
        # 查询所有本地合约记录
        contracts = await ContractModel.all().order_by("name")
        
        # 尝试从链上获取 Provider 状态
        provider_state = {}
        try:
            # 获取 AddressProvider 地址
            provider_contract = await ContractModel.filter(name="AddressProvider", network=self.network).first()
            if provider_contract and provider_contract.address:
                async with get_async_web3_adapter(abi=ADDRESS_PROVIDER_ABI) as web3:
                    # 调用 get_all_addresses
                    result = await web3.call_function(
                        contract_address=provider_contract.address,
                        function_name="get_all_addresses",
                        parameters=[]
                    )
                    # result[0] 是 keys, result[1] 是 addresses
                    keys = result[0]
                    addrs = result[1]
                    
                    for i, k in enumerate(keys):
                        key_hex = k.hex()
                        # 这里做一个简化的映射尝试，实际生产中应该有完整的 Key 映射表
                        # 如果找不到映射，暂时忽略或显示为 Unknown
                        contract_name = PROVIDER_KEYS.get(key_hex)
                        if contract_name:
                            provider_state[contract_name] = addrs[i]
                            
        except Exception as e:
            logger.warning(f"Failed to fetch provider state: {e}")

        # 构建合约列表
        contract_list = []
        needs_update_count = 0

        # 项目配置
        project_configs = {
            "common": {"name": "common", "label": "公共合约", "color": "blue", "order": 1},
            "vanke": {"name": "vanke", "label": "万科项目", "color": "green", "order": 2},
            "mock": {"name": "mock", "label": "Mock合约", "color": "orange", "order": 3},
        }

        for contract in contracts:
            # 判断状态
            db_addr = contract.address
            chain_addr = provider_state.get(contract.name)
            
            status = "synced"
            if not db_addr:
                status = "not_deployed"
            elif chain_addr and db_addr.lower() != chain_addr.lower():
                status = "mismatch" # DB与链上不一致
                needs_update_count += 1
            elif not chain_addr and contract.name in PROVIDER_KEYS.values():
                 # 应该是注册的合约，但链上没查到
                 status = "missing_on_chain"
            
            # 构造返回数据
            contract_list.append({
                "name": contract.name,
                "project": contract.project_name or "common",
                "address": db_addr,
                "deploy_step": contract.name,
                "deployed": bool(db_addr),
                "deployed_at": contract.created_at.isoformat() if contract.created_at else None,
                "dependency_status": status, # 复用字段，实际表示注册状态
                "deployment_status": "deployed_and_binded" if status == "synced" else "deployed_needs_binding",
                "dependencies": [], # 注册制下不再详细展示每个依赖的绑定状态，由 Provider 保证
                "provider_address": chain_addr, # 新增字段：链上 Provider 记录的地址
                "type": "common" if contract.project_name == "common" else "exclusive"
            })

        return {
            "contracts": contract_list,
            "projects": list(project_configs.values()),
            "network": self.network,
            "needs_update_count": needs_update_count,
        }

    async def sync_from_provider(self) -> Dict[str, Any]:
        """
        从链上 Provider 同步状态到本地 DB
        """
        provider_contract = await ContractModel.filter(name="AddressProvider", network=self.network).first()
        if not provider_contract or not provider_contract.address:
            raise Exception("AddressProvider not found or not deployed")

        updated_count = 0
        async with get_async_web3_adapter(abi=ADDRESS_PROVIDER_ABI) as web3:
            result = await web3.call_function(
                contract_address=provider_contract.address,
                function_name="get_all_addresses",
                parameters=[]
            )
            keys = result[0]
            addrs = result[1]

            for i, k in enumerate(keys):
                key_hex = k.hex()
                contract_name = PROVIDER_KEYS.get(key_hex)
                if contract_name:
                    new_addr = addrs[i]
                    # 更新 DB
                    contract = await ContractModel.filter(name=contract_name, network=self.network).first()
                    if contract and contract.address != new_addr:
                        contract.address = new_addr
                        await contract.save()
                        updated_count += 1
                        logger.info(f"Synced contract {contract_name}: {new_addr}")
        
        return {"updated": updated_count}

    async def update_registry_record(self, contract_name: str, address: str):
        """
        手动更新本地注册记录
        """
        contract = await ContractModel.filter(name=contract_name, network=self.network).first()
        if not contract:
            # 如果不存在，尝试创建（或者是报错，视业务逻辑而定，这里选择报错以防误操作）
            raise Exception(f"Contract {contract_name} not found in DB")
        
        contract.address = address
        await contract.save()
        logger.info(f"Manually updated contract {contract_name} to {address}")
        return contract

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
