"""Concurrent contract dependency synchronization task."""

import asyncio

from falib.utils.log import get_logger
from tortoise import Tortoise

from src.models.contracts.contract import Contract
from src.models.contracts.contract_dependency import ContractDependency
from src.shared.aerich_redirect import TORTOISE_ORM
from src.shared.common.adapters import get_async_minio_adapter, get_async_web3_adapter
from src.shared.schemas.enums import ChainID, ContractStatus

minio_adapter = get_async_minio_adapter()
web3_adapter = get_async_web3_adapter()
schedule_logger = get_logger("schedule.contract_task")


async def get_network_chain():
    """"""
    async with web3_adapter as adapter:
        chain_id = await adapter.get_chain_id()
        network = ChainID.from_value_to_name(chain_id)
        return str(network), chain_id


async def get_contract_instances(network: str, chain_id: int):
    """获取合约实例"""
    contracts = await Contract.filter(
        network=network, chain_id=chain_id, status=ContractStatus.ACTIVE
    ).all()
    return contracts


async def async_chain_contracts_info():
    """
    同步链合约信息
    """
    await Tortoise.init(config=TORTOISE_ORM)
    network, chain_id = await get_network_chain()
    contracts = await get_contract_instances(network, chain_id)
    for contract in contracts:
        address = contract.address
        abi_path = contract.abi_path
        abi_content = await minio_adapter.get_json(abi_path)
        web3_adapter.register_contract(address, abi_content)

    async with web3_adapter as adapter:
        # 并发获取所有合约依赖
        addresses = list(adapter._contract_abis.keys())
        schedule_logger.info(
            f"Fetching dependencies for {len(addresses)} contracts concurrently..."
        )

        fetch_tasks = [
            adapter.call_function(addr, "get_dependencies") for addr in addresses
        ]
        all_dependencies = await asyncio.gather(*fetch_tasks)

        # 处理结果
        for inner_address, dependencies in zip(addresses, all_dependencies):
            schedule_logger.info(f"{inner_address} Dependencies: {dependencies}")

            need_dependencies, done_dependencies, optional_dependencies = dependencies
            inner_contract_instance = await Contract.filter(
                address__iexact=inner_address, status=ContractStatus.ACTIVE
            ).first()
            for dependencies_contract_name in need_dependencies:
                dependencies_contract_instance = await Contract.filter(
                    name=dependencies_contract_name, status=ContractStatus.ACTIVE
                ).first()
                if not dependencies_contract_instance:
                    await ContractDependency.update_or_create(
                        contract_id=inner_contract_instance.id,
                        dependency_id=None,
                        defaults={
                            "contract_id": inner_contract_instance.id,
                            "contract_name": inner_contract_instance.name,
                            "contract_address": inner_address,
                            "dependency_name": dependencies_contract_name,
                            "is_binded": False,
                            "is_deployed": False,
                        },
                    )
                else:
                    await ContractDependency.update_or_create(
                        contract_id=inner_contract_instance.id,
                        dependency_id=dependencies_contract_instance.id,
                        defaults={
                            "contract_address": inner_address,
                            "dependency_address": dependencies_contract_instance.address,
                            "contract_name": inner_contract_instance.name,
                            "dependency_name": dependencies_contract_instance.name,
                            "is_binded": False,
                            "is_deployed": True,
                        },
                    )
                # contract_instance = await Contract.filter(address=inner_address).first()
                # assert contract_instance
                # # 解析依赖：(unbound_required, bound_all, unbound_optional)
                # unbound_required, bound_all, unbound_optional = dependencies
                # dependency_record = await ContractDependency.filter(
                #     contract_id=contract_instance.id,
                # )


if __name__ == "__main__":
    asyncio.run(async_chain_contracts_info())
