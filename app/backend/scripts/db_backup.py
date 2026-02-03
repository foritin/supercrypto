#!/usr/bin/env python3
"""
PostgreSQL 数据库备份脚本

使用方法:
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/db_backup.py [备份文件名]

如果不指定文件名，将自动生成带时间戳的文件名
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

from falib.utils.config import SETTINGS


def get_db_config() -> dict:
    """从 falib 配置获取数据库连接信息"""
    pg = SETTINGS.postgresql
    return {
        "host": pg.host,
        "port": pg.port,
        "user": pg.user,
        "password": pg.password,
        "database": pg.database,
    }


def backup_database(output_file: str | None = None) -> str:
    """
    备份 PostgreSQL 数据库

    Args:
        output_file: 输出文件名（不含路径），如果为 None 则自动生成

    Returns:
        备份文件的完整路径
    """
    config = get_db_config()

    # 确定输出目录
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "output"
    output_dir.mkdir(exist_ok=True)

    # 生成文件名
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"rwa_backup_{timestamp}.sql"

    output_path = output_dir / output_file

    # 构建 pg_dump 命令
    cmd = [
        "pg_dump",
        "-h", str(config["host"]),
        "-p", str(config["port"]),
        "-U", config["user"],
        "-d", config["database"],
        "-F", "p",  # plain text format
        "-f", str(output_path),
        "--clean",  # 添加 DROP 语句
        "--if-exists",  # DROP IF EXISTS
    ]

    # 设置密码环境变量
    env = {"PGPASSWORD": config["password"]}

    print(f"正在备份数据库 {config['database']}...")
    print(f"主机: {config['host']}:{config['port']}")
    print(f"输出文件: {output_path}")

    try:
        result = subprocess.run(
            cmd,
            env={**subprocess.os.environ, **env},
            capture_output=True,
            text=True,
            check=True,
        )
        print(f"✓ 备份成功: {output_path}")
        print(f"  文件大小: {output_path.stat().st_size / 1024:.2f} KB")
        return str(output_path)
    except subprocess.CalledProcessError as e:
        print(f"✗ 备份失败: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("✗ 错误: 未找到 pg_dump 命令，请确保已安装 PostgreSQL 客户端工具")
        sys.exit(1)


def main():
    output_file = sys.argv[1] if len(sys.argv) > 1 else None
    backup_database(output_file)


if __name__ == "__main__":
    main()
