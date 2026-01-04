#!/usr/bin/env python3
"""
部署工具模块
提供统一的部署账户获取、合约部署检查和记录功能
"""

import argparse
import re
import sys
from typing import Any, List, Optional

from ape import accounts, networks
from falib.adapter.minio import SyncMinIOAdapter
from falib.utils.tools import PathTools

from src.models import Account, Contract, DeployInfo
from src.shared.common.adapters import get_db_adapter, get_minio_adapter
from src.shared.schemas.enums import ContractModule, ContractStatus, NetWork

minio_adapter: SyncMinIOAdapter = get_minio_adapter()
# ============================================
# 命令行参数解析
# ============================================


def parse_deploy_args() -> argparse.Namespace:
    """
    解析部署脚本的命令行参数

    注意：网络通过 ape 的 --network 参数传递，如：
        ape run 0-common-kyc --network ethereum:local

    Returns:
        命名空间
    """
    parser = argparse.ArgumentParser(description="合约部署脚本")
    # 忽略 ape 传入的其他参数
    args, _ = parser.parse_known_args()
    return args


def get_current_network() -> str:
    """
    从 ape 上下文获取当前网络名称

    Returns:
        网络名称 (如 "dev", "sepolia", "mainnet")
    """
    provider = networks.active_provider
    if provider is None:
        raise RuntimeError("❌ 未连接到网络，请使用 --network 参数指定网络")

    # 返回网络名称（如 "dev", "sepolia", "mainnet"）
    return provider.network.name


# ============================================
# 数据库操作
# ============================================

_db_adapter = None


def get_db():
    """获取数据库适配器（单例）"""
    global _db_adapter
    if _db_adapter is None:
        _db_adapter = get_db_adapter()
    return _db_adapter


def check_deployed(
    name: str, chain_id: int, modules: ContractModule, network: NetWork
) -> Contract | None:
    """
    检查合约是否已部署

    Args:
        name: 合约名称
        chain_id: 链ID
        modules: 合约模块
        network: 网络类型

    Returns:
        Contract 对象如果已部署，否则 None
    """
    with get_db() as db:
        return db.query(
            Contract.filter(
                name=name,
                chain_id=chain_id,
                modules=modules,
                network=network,
                status=ContractStatus.ACTIVE,
            ).first()
        )


def get_deployed_address(
    deploy_step: str, contract_name: str, network: str
) -> str | None:
    """
    获取已部署合约的地址

    Args:
        deploy_step: 部署阶段
        contract_name: 合约名称
        network: 网络名称

    Returns:
        合约地址字符串，未找到返回 None
    """
    info = check_deployed(deploy_step, contract_name, network)
    return info.contract_address if info else None


def save_contract(
    name: str,
    address: str,
    deployer_address: str,
    network: NetWork,
    chain_id: int,
    modules: ContractModule,
    project_name: str,
    tx_hash: str,
    remote_abi_path: str,
):
    with get_db() as db:
        existing = db.query(
            Contract.filter(
                name=name,
                chain_id=chain_id,
                modules=modules,
                network=network,
                status=ContractStatus.ACTIVE,
            ).first()
        )
        if existing:
            db.query(
                Contract.filter(id=existing.id).update(
                    address=address,
                    deployer_address=deployer_address,
                    network=network,
                    modules=modules,
                    project_name=project_name,
                    tx_hash=tx_hash,
                    status=ContractStatus.ACTIVE,
                )
            )
        else:
            db.query(
                Contract.create(
                    name=name,
                    address=address,
                    deployer_address=deployer_address,
                    network=network,
                    chain_id=chain_id,
                    modules=modules,
                    project_name=project_name,
                    tx_hash=tx_hash,
                    status=ContractStatus.ACTIVE,
                    abi_path=remote_abi_path,
                )
            )


# ============================================
# MinIO 操作
# ============================================


def check_abi_exists(
    contract_module: ContractModule, contract_name: str, project_name: str = ""
) -> bool:
    """
    检查 ABI 文件是否存在(本地以及 MinIO)
    """
    root_path = PathTools.get_root_path()
    abi_path = PathTools.combine_path(
        root_path, ".build", "abi", f"{contract_name}.json"
    )
    if not abi_path.exists():
        print(f"❌ ABI 本地文件不存在: {abi_path}")
        return False, abi_path
    else:
        print(f"✅ ABI 本地文件存在: {abi_path}")
        return True, abi_path


def upload_abi(
    contract_module: ContractModule, contract_name: str, project_name: str = ""
) -> bool:
    """
    上传 ABI 文件
    """
    root_path = PathTools.get_root_path()
    abi_path = PathTools.combine_path(
        root_path, ".build", "abi", f"{contract_name}.json"
    )
    filtered_list: List[str] = [
        x for x in [contract_module.value, project_name, f"{contract_name}.json"] if x
    ]
    filtered_list.insert(0, "abi")
    object_name: str = "/".join(filtered_list)
    with minio_adapter as minio:
        status = minio.upload_file(str(abi_path), object_name)
        if status:
            print(f"✅ ABI 文件上传成功: {object_name}")
            return object_name
        else:
            print(f"❌ ABI 文件上传失败: {object_name}")
            return False


# ============================================
# 部署账户获取
# ============================================


def get_deployer_from_db(network: NetWork = NetWork.HARDHAT, tag: str = "admin"):
    """
    从数据库获取部署账户

    Args:
        network: 网络类型
        tag: 账户标签（默认 admin）

    Returns:
        Ape 账户对象
    """
    with get_db() as db:
        data = db.query(Account.filter(tag=tag, network=network).first())

    if not data:
        raise ValueError(
            f"❌ 未找到 {tag} 账户\n"
            f"   网络: {network}\n"
            f"   请确保数据库中存在 tag='{tag}', network='{network}' 的账户"
        )

    target_address = data.address.lower()

    # 在 ape 的 test accounts 中查找匹配的账户
    deployer = None
    for i, test_account in enumerate(accounts.test_accounts):
        if test_account.address.lower() == target_address:
            deployer = test_account
            print(f"✅ 找到匹配的测试账户 [index={i}]")
            break

    if deployer is None:
        # 列出可用的测试账户
        print(f"❌ 数据库地址 {data.address} 不在测试账户列表中")
        print(f"   可用的测试账户:")
        for i, ta in enumerate(accounts.test_accounts[:5]):
            print(f"   [{i}] {ta.address}")
        print(f"   ... 共 {len(accounts.test_accounts)} 个")
        raise ValueError(
            f"❌ 账户不在 test_accounts 中\n"
            f"   数据库地址: {data.address}\n"
            f"   请确保数据库中的账户是 hardhat 测试账户"
        )

    print(f"✅ 部署账户: {deployer.address}")
    print(f"   余额: {deployer.balance / 10**18:.4f} ETH")

    return deployer


# ============================================
# 通用合约部署
# ============================================


def deploy_contract(
    contract_class: Any,
    contract_name: str,
    deployer,
    network: NetWork,
    chain_id: int,
    remote_abi_path: str,
    modules: ContractModule = ContractModule.PROJECT,
    project_name: Optional[str] = "",
    **deploy_args,
) -> tuple[Any, bool]:
    """
    通用部署函数：部署 -> 记录

    每次运行都会部署新合约（区块链上是新地址）。
    旧的部署记录会被标记为 is_active=False。
    部署后通过 admin/contracts 页面管理依赖绑定。

    Args:
        contract_class: Ape 项目中的合约类 (如 project.MockUSDT)
        contract_name: 合约名称 (如 "MockUSDT")
        deployer: 部署账户
        deploy_step: 部署阶段 (如 "0-common-kyc")
        network: 网络名称
        project: 项目标识 (common, mock, fake, ...)
        dependencies: 依赖的合约地址字典
        modules: 合约模块
        project_name: 项目名称
        **deploy_args: 传递给 deploy() 的额外参数

    Returns:
        (contract_instance, is_new_deployment)
    """
    # 1. 执行部署（每次都是新合约）
    print(f"🚀 正在部署 {contract_name}...")
    print(f"   部署参数: {deploy_args}")

    tx_hash = None
    contract = None

    # 从 deploy_args 中提取构造函数参数
    # ape 的 deploy 方法需要位置参数，不能使用 **kwargs
    constructor_args = list(deploy_args.values())
    print(f"   构造函数参数: {constructor_args}")

    # 执行部署并获取交易哈希
    # ape 的 deploy 返回 ContractInstance
    contract = contract_class.deploy(*constructor_args, sender=deployer)

    # 获取交易哈希
    # creation_metadata 包含 txn_hash, block, deployer, factory, receipt
    creation_metadata = contract.creation_metadata
    if creation_metadata:
        tx_hash = str(creation_metadata.txn_hash)
    else:
        # 如果 creation_metadata 不可用（节点不支持），使用空字符串
        tx_hash = ""

    print(f"   部署交易哈希: {tx_hash}")

    # 4. 保存部署记录
    save_contract(
        name=contract_name,
        address=str(contract.address),
        deployer_address=deployer.address,
        network=network,
        chain_id=chain_id,
        modules=modules,
        project_name=project_name,
        tx_hash=tx_hash,
        remote_abi_path=remote_abi_path,
    )

    print(f"✅ {contract_name} 已部署: {contract.address}")

    return contract, True


def require_deployed(
    deploy_step: str, contract_name: str, network: str, contract_class: Any = None
) -> str | Any:
    """
    获取必需的已部署合约地址（如果不存在则报错）

    Args:
        deploy_step: 部署阶段
        contract_name: 合约名称
        network: 网络名称
        contract_class: 如果提供，返回合约实例而非地址

    Returns:
        合约地址字符串，或合约实例（如果提供了 contract_class）

    Raises:
        ValueError: 如果合约未部署
    """
    address = get_deployed_address(deploy_step, contract_name, network)

    if not address:
        raise ValueError(
            f"❌ 依赖的合约 {contract_name} 未部署！\n   请先运行对应的部署脚本"
        )

    if contract_class:
        return contract_class.at(address)

    return address


# ============================================
# 防止 ape 警告（此文件为工具模块，不直接运行）
# ============================================


def main():
    """工具模块，不直接运行"""
    print("⚠️  deploy_utils.py 是工具模块，请运行具体的部署脚本：")
    print("    ape run 0-common-kyc --network ethereum:dev")
    print("    ape run 0-mock-tokens --network ethereum:dev")
    print("    ape run 1-vanke-project --network ethereum:dev")
    print("    ape run 2-vanke-oracle --network ethereum:dev")
