#!/usr/bin/env python3
"""
项目部署配置
============

每个项目独立一个配置文件，便于维护和扩展。

目录结构:
    projects/
    ├── __init__.py      # 项目注册表
    ├── vanke.py         # Vanke 项目配置
    └── greenland.py     # Greenland 项目配置 (示例)

Usage:
    from deploy.projects import get_project_config, list_projects

    # 获取项目配置
    config = get_project_config("vanke")

    # 列出所有项目
    projects = list_projects()
"""

from .vanke import VANKE_PROJECT

# ============================================
# 项目注册表
# ============================================

PROJECTS = {
    "vanke": VANKE_PROJECT,
    # 未来可添加更多项目:
    # "greenland": GREENLAND_PROJECT,
}


def get_project_config(project_name: str):
    """
    获取项目配置

    Args:
        project_name: 项目名称 (如 "vanke")

    Returns:
        ProjectConfig 实例

    Raises:
        ValueError: 未知项目
    """
    if project_name not in PROJECTS:
        available = ", ".join(PROJECTS.keys())
        raise ValueError(f"未知项目: {project_name}，可用项目: {available}")
    return PROJECTS[project_name]


def list_projects() -> list[str]:
    """列出所有可用项目名称"""
    return list(PROJECTS.keys())


__all__ = [
    "PROJECTS",
    "get_project_config",
    "list_projects",
    "VANKE_PROJECT",
]
