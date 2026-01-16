#!/usr/bin/env python3
"""
项目部署配置
============

每个项目独立一个配置文件，便于维护和扩展。

目录结构:
    projects/
    ├── __init__.py      # 项目注册表
    ├── vanke/           # Vanke 项目配置
    └── greenland/       # Greenland 项目配置 (示例)

Usage:
    ape run deploy_vanke --network ethereum:hardhat
"""
