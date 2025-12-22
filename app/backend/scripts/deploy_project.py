#!/usr/bin/env python3
"""
一键部署项目脚本

按顺序部署项目所需的所有合约

Usage:
    # 部署 Fake 项目（本地）
    python scripts/deploy_project.py --project fake --network local
    
    # 部署 Fake 项目（测试网）
    python scripts/deploy_project.py --project fake --network sepolia
"""

import argparse
import subprocess
import sys
from pathlib import Path


# 项目配置：定义每个项目需要部署的脚本顺序
PROJECT_SCRIPTS = {
    "fake": [
        # (脚本名, 是否为依赖脚本, 是否仅 local)
        ("0-common-kyc", True, False),      # 公共 KYC
        ("1-mock-tokens", True, True),      # Mock 稳定币（仅 local）
        ("2-fake-tokens", False, False),    # Fake 代币
        ("3-fake-business", False, False),  # Fake 业务
    ],
}


def run_deploy_script(script_name: str, network: str) -> bool:
    """运行部署脚本"""
    cmd = ["ape", "run", script_name, "--network", f"ethereum:{network}"]
    
    print(f"\n{'='*60}")
    print(f"🚀 运行: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="一键部署项目合约")
    parser.add_argument(
        "--project", "-p",
        required=True,
        choices=list(PROJECT_SCRIPTS.keys()),
        help="项目名称"
    )
    parser.add_argument(
        "--network", "-n",
        default="local",
        choices=["local", "sepolia", "mainnet"],
        help="部署网络"
    )
    parser.add_argument(
        "--skip-deps",
        action="store_true",
        help="跳过依赖脚本（公共合约和 Mock）"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print(f"📦 一键部署项目: {args.project}")
    print(f"   网络: {args.network}")
    print(f"   跳过依赖: {args.skip_deps}")
    print("=" * 60)
    
    scripts = PROJECT_SCRIPTS[args.project]
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for script_name, is_dependency, local_only in scripts:
        # 如果跳过依赖且这是依赖脚本
        if args.skip_deps and is_dependency:
            print(f"\n⏭️  跳过依赖: {script_name}")
            skip_count += 1
            continue
        
        # Mock 脚本只在 local 运行
        if local_only and args.network != "local":
            print(f"\n⏭️  跳过 (非 local): {script_name}")
            skip_count += 1
            continue
        
        # 运行脚本
        if run_deploy_script(script_name, args.network):
            success_count += 1
        else:
            fail_count += 1
            print(f"\n❌ 脚本失败: {script_name}")
            if not is_dependency:
                # 项目脚本失败则中止
                print("中止部署")
                break
    
    # 总结
    print("\n" + "=" * 60)
    print("📊 部署总结")
    print("=" * 60)
    print(f"  ✅ 成功: {success_count}")
    print(f"  ⏭️  跳过: {skip_count}")
    print(f"  ❌ 失败: {fail_count}")
    print()
    print("📖 部署完成后，请访问 admin/contracts 页面：")
    print("   - 查看合约状态")
    print("   - 确认/更新依赖绑定")
    print("=" * 60)
    
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
