#!/usr/bin/env python3
"""
检查合约是否已部署
==================

检查指定地址是否存在合约代码。

Usage:
    ape run tools_check_contract --network ethereum:hardhat:node 0xc7111E85865d99b61C3c03C4c7be64215cDE8602
    ape run tools_check_contract --network ethereum:sepolia:alchemy 0x...
"""

import click
from ape import networks
from ape.cli import ConnectedProviderCommand


@click.command(cls=ConnectedProviderCommand)
@click.argument("address")
def cli(network, address: str):
    """检查合约是否已部署到指定地址"""
    provider = networks.active_provider
    
    print(f"🔍 检查合约: {address}")
    print(f"   网络: {provider.network.name}")
    print(f"   RPC: {provider.uri}")
    print("-" * 60)
    
    # 获取合约代码
    code = provider.get_code(address)
    
    if code and len(code) > 0:
        print(f"✅ 合约已部署")
        print(f"   代码长度: {len(code)} bytes")
        
        # 尝试获取余额
        balance = provider.get_balance(address)
        print(f"   余额: {balance / 10**18:.6f} ETH")
    else:
        print(f"❌ 该地址没有合约代码")
        print(f"   可能是 EOA 账户或未部署")
