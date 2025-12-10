#!/usr/bin/env python3
"""
部署工具模块
提供统一的部署账户获取、合约部署检查和记录功能
"""

import argparse
import sys
from typing import Any

from ape import accounts, networks

from src.models import Account, DeployInfo
from src.shared.dependencies import get_db_adapter

# ============================================
# 命令行参数解析
# ============================================


def parse_deploy_args() -> argparse.Namespace:
    """
    解析部署脚本的命令行参数

    注意：网络通过 ape 的 --network 参数传递，如：
        ape run 1_deploy_mocks --network ethereum:dev -- --force

    Returns:
        包含 force 参数的命名空间
    """
    parser = argparse.ArgumentParser(description="合约部署脚本")
    parser.add_argument(
        "--force", "-f", action="store_true", help="强制重新部署（即使已存在）"
    )
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
    deploy_step: str, contract_name: str, network: str
) -> DeployInfo | None:
    """
    检查合约是否已部署

    Args:
        deploy_step: 部署阶段 (1_mocks, 2_sto_base, etc.)
        contract_name: 合约名称 (MockUSDT, KYCManager, etc.)
        network: 网络名称 (local, sepolia, mainnet)

    Returns:
        DeployInfo 对象如果已部署，否则 None
    """
    with get_db() as db:
        return db.query(
            DeployInfo.filter(
                deploy_step=deploy_step,
                contract_name=contract_name,
                network=network,
                is_active=True,
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


def save_deployment(
    deploy_step: str,
    contract_name: str,
    contract_address: str,
    network: str,
    deployer_address: str,
    tx_hash: str = None,
    dependencies: dict = None,
    contract_version: str = "1.0.0",
) -> DeployInfo:
    """
    保存部署记录到数据库

    Args:
        deploy_step: 部署阶段
        contract_name: 合约名称
        contract_address: 合约地址
        network: 网络名称
        deployer_address: 部署者地址
        tx_hash: 交易哈希（可选）
        dependencies: 依赖的合约地址（可选）
        contract_version: 合约版本（默认 1.0.0）

    Returns:
        创建的 DeployInfo 对象
    """
    with get_db() as db:
        # 先将旧的同名部署标记为非活跃
        existing = db.query(
            DeployInfo.filter(
                deploy_step=deploy_step,
                contract_name=contract_name,
                network=network,
                is_active=True,
            ).first()
        )

        if existing:
            # 使用 queryset.update() 来更新记录
            db.query(DeployInfo.filter(id=existing.id).update(is_active=False))

        # 创建新记录 - 使用 Tortoise ORM 的 create 方法
        deploy_info = db.query(
            DeployInfo.create(
                deploy_step=deploy_step,
                contract_name=contract_name,
                contract_address=contract_address,
                network=network,
                deployer_address=deployer_address,
                tx_hash=tx_hash,
                dependencies=dependencies,
                contract_version=contract_version,
                is_active=True,
            )
        )

    return deploy_info


# ============================================
# 部署账户获取
# ============================================


def get_deployer_from_db(network: str = "local", tag: str = "admin"):
    """
    从数据库获取部署账户

    Args:
        network: 网络类型 (local, test, main)
        tag: 账户标签（默认 admin）

    Returns:
        Ape 账户对象
    """
    with get_db() as db:
        data = db.query(Account.filter(tag=tag, net_type=network).first())

    if not data:
        raise ValueError(
            f"❌ 未找到 {tag} 账户\n"
            f"   网络: {network}\n"
            f"   请确保数据库中存在 tag='{tag}', net_type='{network}' 的账户"
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
    deploy_step: str,
    network: str,
    force: bool = False,
    dependencies: dict = None,
    **deploy_args,
) -> tuple[Any, bool]:
    """
    通用部署函数：检查 -> 部署 -> 记录

    Args:
        contract_class: Ape 项目中的合约类 (如 project.MockUSDT)
        contract_name: 合约名称 (如 "MockUSDT")
        deployer: 部署账户
        deploy_step: 部署阶段 (如 "1_mocks")
        network: 网络名称
        force: 是否强制重新部署
        dependencies: 依赖的合约地址字典
        **deploy_args: 传递给 deploy() 的额外参数

    Returns:
        (contract_instance, is_new_deployment)
    """
    # 1. 检查是否已部署（非强制模式）
    if not force:
        existing = check_deployed(deploy_step, contract_name, network)
        if existing:
            print(f"⏭️  {contract_name} 已部署，跳过")
            print(f"   地址: {existing.contract_address}")
            # 返回已部署的合约实例
            contract = contract_class.at(existing.contract_address)
            return contract, False
    else:
        print(f"🔄 强制重新部署 {contract_name}...")

    # 2. 执行部署
    print(f"🚀 正在部署 {contract_name}...")

    tx_hash = None
    contract = None

    try:
        contract = contract_class.deploy(sender=deployer, **deploy_args)
        # 获取交易哈希（如果可用）
        if hasattr(contract, "receipt") and contract.receipt:
            tx_hash = str(contract.receipt.txn_hash)
    except Exception as e:
        # ape 有时候无法正确检测部署的合约，即使部署成功了
        # 我们尝试从错误信息中提取交易哈希，然后查询合约地址
        error_msg = str(e)
        if "did not create a contract" in error_msg:
            import re

            # 从错误信息中提取交易哈希
            tx_hash_match = re.search(r"'(0x[a-fA-F0-9]{64})'", error_msg)
            if tx_hash_match:
                tx_hash = tx_hash_match.group(1)
                print(f"⚠️  ape 检测失败，但交易已确认: {tx_hash}")

                # 获取交易 receipt 来找到合约地址
                from ape import chain

                receipt = chain.provider.get_receipt(tx_hash)
                if receipt and receipt.contract_address:
                    contract_address = receipt.contract_address
                    print(f"✅ 从 receipt 中获取合约地址: {contract_address}")
                    contract = contract_class.at(contract_address)
                else:
                    raise ValueError(f"无法从交易 {tx_hash} 获取合约地址")
            else:
                raise e
        else:
            raise e

    # 4. 保存部署记录
    save_deployment(
        deploy_step=deploy_step,
        contract_name=contract_name,
        contract_address=str(contract.address),
        network=network,
        deployer_address=deployer.address,
        tx_hash=tx_hash,
        dependencies=dependencies,
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
    print("    ape run 1_deploy_mocks --network ethereum:dev")
    print("    ape run 2_deploy_sto_base --network ethereum:dev")
    print("    ape run 3_deploy_sto_business --network ethereum:dev")
    print("    ape run 4_deploy_oracle --network ethereum:dev")
