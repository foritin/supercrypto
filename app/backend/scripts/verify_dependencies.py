#!/usr/bin/env python3
"""
合约依赖关系验证脚本

检查所有合约的依赖绑定状态，生成依赖报告

Usage:
    ape run verify_dependencies --network ethereum:hardhat
    ape run verify_dependencies --network ethereum:sepolia
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from ape import project, accounts
from deploy_utils import get_current_network, get_deployer_from_db

# 合约依赖配置
CONTRACT_DEPENDENCIES = {
    "KYCManager": {
        "dependencies": [],
        "description": "核心合约 - 无外部依赖"
    },
    "MultiSigManager": {
        "dependencies": [],
        "description": "预言机核心合约 - 无外部依赖"
    },
    "RWATokenSTO": {
        "dependencies": ["KYCManager"],
        "description": "RWA证券型代币"
    },
    "Subscription": {
        "dependencies": ["USDT", "RWATokenSTO", "KYCManager"],
        "description": "权益代币认购合约"
    },
    "Staking": {
        "dependencies": ["RWATokenSTO", "PlatformToken", "Subscription", "KYCManager"],
        "description": "质押挖矿合约"
    },
    "LiquidityMining": {
        "dependencies": ["LPToken", "PlatformToken", "KYCManager"],
        "description": "流动性挖矿合约"
    },
    "Timelock": {
        "dependencies": ["MultiSigManager"],
        "description": "时间锁合约"
    },
    "RWAOracle": {
        "dependencies": ["MultiSigManager", "Timelock"],
        "description": "RWA资产预言机"
    },
    "DataAggregator": {
        "dependencies": ["RWAOracle"],
        "description": "数据聚合器"
    },
    "OracleConsumer": {
        "dependencies": ["DataAggregator", "RWAOracle"],
        "description": "预言机消费者"
    }
}


def get_contract_instance(contract_name: str, network: str):
    """
    获取已部署的合约实例

    Args:
        contract_name: 合约名称
        network: 网络名称

    Returns:
        合约实例或None
    """
    try:
        from src.models.contract import Contract

        contract = Contract.select().where(
            Contract.name == contract_name,
            Contract.is_active == True
        ).first()

        if contract:
            contract_class = getattr(project, contract_name, None)
            if contract_class:
                return contract_class.at(contract.address)

        return None
    except Exception as e:
        print(f"  ⚠️  获取合约实例失败: {e}")
        return None


def verify_contract_dependencies(contract_name: str, network: str) -> dict:
    """
    验证单个合约的依赖绑定状态

    Args:
        contract_name: 合约名称
        network: 网络名称

    Returns:
        包含验证结果的字典
    """
    result = {
        "contract": contract_name,
        "bound": False,
        "dependencies": [],
        "missing": [],
        "configured": []
    }

    contract = get_contract_instance(contract_name, network)
    if not contract:
        result["error"] = "合约未部署"
        return result

    try:
        # 调用 getDependencies()
        deps = contract.getDependencies()
        result["dependencies"] = [str(d) for d in deps]

        # 调用 checkDependenciesBound()
        result["bound"] = contract.checkDependenciesBound()

        # 分析依赖状态
        zero_address = "0x0000000000000000000000000000000000000000"
        for dep in deps:
            dep_str = str(dep)
            if dep_str == zero_address:
                result["missing"].append(dep_str)
            else:
                result["configured"].append(dep_str)

    except Exception as e:
        result["error"] = str(e)

    return result


def print_dependency_report(results: list, network: str):
    """
    打印依赖绑定状态报告

    Args:
        results: 验证结果列表
        network: 网络名称
    """
    print("\n" + "=" * 70)
    print(f"📊 合约依赖绑定状态报告")
    print(f"   网络: {network}")
    print("=" * 70)

    bound_count = 0
    total_count = len(results)

    for result in results:
        contract_name = result["contract"]
        description = CONTRACT_DEPENDENCIES.get(contract_name, {}).get("description", "")

        # 状态图标
        if "error" in result:
            status_icon = "❌"
            status_text = f"错误: {result['error']}"
        elif result["bound"]:
            status_icon = "✅"
            status_text = "已绑定"
            bound_count += 1
        else:
            status_icon = "⚠️ "
            status_text = f"未配置 ({len(result['missing'])} 个依赖)"

        print(f"\n{status_icon} {contract_name}")
        print(f"   描述: {description}")
        print(f"   状态: {status_text}")

        if result["configured"]:
            print(f"   已配置:")
            for dep in result["configured"]:
                print(f"      • {dep}")

        if result["missing"]:
            print(f"   未配置:")
            for dep in result["missing"]:
                print(f"      • {dep}")

    # 汇总统计
    print("\n" + "=" * 70)
    print(f"📈 汇总统计")
    print(f"   总合约数: {total_count}")
    print(f"   已配置: {bound_count}")
    print(f"   未配置: {total_count - bound_count}")
    print(f"   完成率: {bound_count * 100 // total_count if total_count > 0 else 0}%")
    print("=" * 70)


def get_dependency_chain(contract_name: str, network: str) -> list:
    """
    获取合约的完整依赖链

    Args:
        contract_name: 合约名称
        network: 网络名称

    Returns:
        依赖链列表
    """
    visited = set()
    chain = []

    def visit(name: str):
        if name in visited:
            return
        visited.add(name)

        deps = CONTRACT_DEPENDENCIES.get(name, {}).get("dependencies", [])
        for dep in deps:
            visit(dep)

        chain.append(name)

    visit(contract_name)
    return chain


def print_dependency_chains(network: str):
    """
    打印所有合约的依赖链

    Args:
        network: 网络名称
    """
    print("\n" + "=" * 70)
    print(f"🔗 合约依赖链")
    print(f"   网络: {network}")
    print("=" * 70)

    for contract_name in CONTRACT_DEPENDENCIES.keys():
        deps = CONTRACT_DEPENDENCIES[contract_name]["dependencies"]
        if deps:
            chain = get_dependency_chain(contract_name, network)
            print(f"\n{contract_name}:")
            print(f"   → 依赖链: {' → '.join(reversed(chain))}")


def main():
    """主函数"""
    network = get_current_network()

    print("=" * 70)
    print("🔍 合约依赖关系验证工具")
    print(f"   网络: {network}")
    print("=" * 70)

    results = []

    # 验证所有合约
    for contract_name in CONTRACT_DEPENDENCIES.keys():
        print(f"\n检查 {contract_name}...")
        result = verify_contract_dependencies(contract_name, network)
        results.append(result)

    # 打印报告
    print_dependency_report(results, network)

    # 打印依赖链
    print_dependency_chains(network)

    # 返回结果
    all_bound = all(r.get("bound", False) for r in results if "error" not in r)

    if all_bound:
        print("\n✅ 所有合约依赖已正确配置！")
        return 0
    else:
        print("\n⚠️  存在未配置的依赖，请检查后重试")
        return 1


if __name__ == "__main__":
    sys.exit(main())
