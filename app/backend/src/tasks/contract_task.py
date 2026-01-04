from falib.utils.config import SETTINGS
from tortoise import Tortoise

from src.models.contract import Contract
from src.shared.aerich_redirect import TORTOISE_ORM
from src.shared.common.adapters import get_async_minio_adapter, get_async_web3_adapter
from src.shared.schemas.enums import ChainID, ContractStatus

minio_adapter = get_async_minio_adapter()
web3_adapter = get_async_web3_adapter()


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


async def local_test():
    await Tortoise.init(config=TORTOISE_ORM)
    network, chain_id = await get_network_chain()
    contracts = await get_contract_instances(network, chain_id)
    for contract in contracts:
        address = contract.address
        abi_path = contract.abi_path
        abi_content = await minio_adapter.get_json(abi_path)
        web3_adapter.register_contract(address, abi_content)

    async with web3_adapter as adapter:
        for inner_address, abi_list in adapter._contract_abis.items():
            dependencies = await adapter.call_function(
                inner_address, "check_dependencies_bound"
            )
            if dependencies:
                print(f"Dependencies: {dependencies}")
            else:
                print(f"No dependencies found for {inner_address}")

    print()

    print(f"Contracts: {contracts}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(local_test())
