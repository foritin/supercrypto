#!/usr/bin/env python3
"""
PostgreSQL 数据库恢复脚本

使用方法:
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/db_restore.py <备份文件名>

备份文件会自动从 app/backend/output 目录查找
"""

import subprocess
import sys
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


def list_backups() -> list[Path]:
    """列出所有可用的备份文件"""
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "output"

    if not output_dir.exists():
        return []

    return sorted(
        output_dir.glob("*.sql"), key=lambda p: p.stat().st_mtime, reverse=True
    )


def restore_database(backup_file: str) -> None:
    """
    恢复 PostgreSQL 数据库

    Args:
        backup_file: 备份文件名（不含路径）
    """
    config = get_db_config()

    # 确定备份文件路径
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "output"
    backup_path = output_dir / backup_file

    if not backup_path.exists():
        print(f"✗ 错误: 备份文件不存在: {backup_path}")
        print("\n可用的备份文件:")
        for f in list_backups():
            print(f"  - {f.name}")
        sys.exit(1)

    # 设置密码环境变量
    env = {"PGPASSWORD": config["password"]}

    print(f"正在恢复数据库 {config['database']}...")
    print(f"主机: {config['host']}:{config['port']}")
    print(f"备份文件: {backup_path}")
    print(f"⚠️  警告: 此操作将完全覆盖现有数据库!")

    # 确认操作
    confirm = input("\n确认恢复? (输入 'yes' 继续): ")
    if confirm.lower() != "yes":
        print("已取消恢复操作")
        sys.exit(0)

    # 构建 psql 命令
    cmd = [
        "psql",
        "-h",
        str(config["host"]),
        "-p",
        str(config["port"]),
        "-U",
        config["user"],
        "-d",
        config["database"],
        "-f",
        str(backup_path),
        "-v",
        "ON_ERROR_STOP=1",
    ]

    print("\n正在执行恢复...")

    try:
        result = subprocess.run(
            cmd,
            env={**subprocess.os.environ, **env},
            capture_output=True,
            text=True,
            check=True,
        )
        print(f"✓ 恢复成功!")
    except subprocess.CalledProcessError as e:
        print(f"✗ 恢复失败: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("✗ 错误: 未找到 psql 命令，请确保已安装 PostgreSQL 客户端工具")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/db_restore.py <备份文件名>")
        print("\n可用的备份文件:")
        backups = list_backups()
        if backups:
            for f in backups:
                size = f.stat().st_size / 1024
                print(f"  - {f.name} ({size:.2f} KB)")
        else:
            print("  (无备份文件)")
        sys.exit(1)

    restore_database(sys.argv[1])


if __name__ == "__main__":
    main()
