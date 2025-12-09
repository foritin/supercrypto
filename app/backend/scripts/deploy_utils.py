#!/usr/bin/env python3
"""
部署工具模块
提供统一的部署账户获取方式
"""

from pathlib import Path
import yaml
from ape import accounts


def get_deployer():
    """
    从 deploy_config.yaml 读取地址和私钥，验证后返回部署账户
    
    Returns:
        部署账户对象
    """
    config_file = Path(__file__).parent / "deploy_config.yaml"
    
    if not config_file.exists():
        raise FileNotFoundError(
            "❌ 配置文件不存在！\n"
            "   请创建 scripts/deploy_config.yaml 并填写 address 和 private_key"
        )
    
    with open(config_file, "r") as f:
        config = yaml.safe_load(f)
    
    address = config.get("address", "")
    private_key = config.get("private_key", "")
    
    # 验证配置
    if not private_key:
        raise ValueError(
            "❌ 私钥未设置！\n"
            "   请在 scripts/deploy_config.yaml 中填写 private_key"
        )
    
    if not address:
        raise ValueError(
            "❌ 地址未设置！\n"
            "   请在 scripts/deploy_config.yaml 中填写 address"
        )
    
    # 确保私钥格式正确
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key
    
    # 从私钥创建账户
    deployer = accounts.from_key(private_key)
    
    # 验证地址匹配
    if deployer.address.lower() != address.lower():
        raise ValueError(
            f"❌ 地址与私钥不匹配！\n"
            f"   配置的地址: {address}\n"
            f"   私钥对应地址: {deployer.address}\n"
            f"   请检查 deploy_config.yaml 中的配置"
        )
    
    print(f"✅ 部署账户验证通过")
    print(f"   地址: {deployer.address}")
    print(f"   余额: {deployer.balance / 10**18:.4f} ETH")
    
    return deployer
