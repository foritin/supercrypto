#!/usr/bin/env python3
"""
SuperCrypto 合约部署框架
========================

统一的部署工具和配置管理。

目录结构:
    scripts/
    ├── deploy/
    │   ├── __init__.py          # 包入口
    │   ├── base.py              # 基础类和配置
    │   ├── executor.py          # 部署执行器
    │   └── projects/            # 项目配置
    │       ├── __init__.py
    │       └── vanke/

Usage:
    # 1. 部署公共合约
    ape run deploy_common --network ethereum:hardhat

    # 2. 部署 Vanke 项目
    ape run deploy_vanke --network ethereum:hardhat

新增项目:
    1. 在 deploy/projects/ 下创建配置文件 (如 greenland.py)
    2. 在 deploy/projects/__init__.py 中注册
    3. 创建 deploy_greenland.py 脚本
"""

# 确保 scripts 目录在 Python 路径中，以便 ape run 能够正确导入子模块
import sys
from pathlib import Path

_scripts_dir = Path(__file__).parent.parent
if str(_scripts_dir) not in sys.path:
    sys.path.insert(0, str(_scripts_dir))
