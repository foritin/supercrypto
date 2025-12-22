#!/usr/bin/env python3
"""
设置管理员 KYC 验证
为 admin 账户在 KYCManager 合约中完成 KYC 验证

Usage:
    ape run setup_admin_kyc --network ethereum:local
"""

import json
import sys
from pathlib import Path

from ape import accounts, project, networks


def get_current_network() -> str:
    """获取当前网络名称"""
    provider = networks.active_provider
    if provider is None:
        raise RuntimeError("❌ 未连接到网络")
    return provider.network.name


def main():
    """为 admin 设置 KYC 验证"""
    network = get_current_network()

    print("=" * 60)
    print("🔐 设置管理员 KYC 验证")
    print(f"   网络: {network}")
    print("=" * 60)

    # 使用测试账户 #19 作为 admin
    admin = accounts.test_accounts[19]
    admin_address = admin.address
    print(f"👤 Admin: {admin_address}")

    # 从 output 文件读取 KYCManager 地址
    output_file = Path(__file__).parent.parent / "output" / "deployed_2_sto_base.json"
    if not output_file.exists():
        print("❌ 未找到部署文件，请先运行 2_deploy_sto_base")
        return
    
    with open(output_file) as f:
        deployed = json.load(f)
    
    kyc_address = deployed["contracts"]["KYCManager"]
    kyc_manager = project.KYCManager.at(kyc_address)

    print(f"\n📋 KYCManager: {kyc_manager.address}")
    print(f"👤 Admin: {admin_address}")

    # 检查 admin 是否已验证
    is_verified = kyc_manager.isVerified(admin_address)
    print(f"\n当前 KYC 状态: {'✅ 已验证' if is_verified else '❌ 未验证'}")

    if is_verified:
        print("\n✅ Admin 已通过 KYC 验证，无需操作")
        return

    # 为 admin 完成 KYC 验证
    print("\n🚀 正在为 Admin 完成 KYC 验证...")

    # addInvestor 参数：
    # _investor: address - 投资者地址
    # _country: String[2] - 国家代码 (如 "US", "CN")
    # _accreditedInvestor: bool - 是否为合格投资者
    try:
        tx = kyc_manager.addInvestor(
            admin_address,
            "US",   # 国家代码
            True,   # 合格投资者
            sender=admin
        )
        print(f"   交易哈希: {tx.txn_hash}")
    except Exception as e:
        print(f"   ⚠️ 交易错误: {e}")

    # 验证结果
    is_verified = kyc_manager.isVerified(admin_address)
    is_accredited = kyc_manager.isAccredited(admin_address)

    print(f"\n📊 验证结果:")
    print(f"   KYC 状态: {'✅ 已验证' if is_verified else '❌ 未验证'}")
    print(f"   合格投资者: {'✅ 是' if is_accredited else '❌ 否'}")

    if is_verified:
        print("\n🎉 Admin KYC 设置成功！")
    else:
        print("\n❌ Admin KYC 设置失败，请检查错误")

    print("=" * 60)


if __name__ == "__main__":
    main()

