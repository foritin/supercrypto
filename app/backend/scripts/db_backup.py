#!/usr/bin/env python3
"""
SQLite 数据库备份脚本

使用方法:
    cd app/backend && source .venv/bin/activate
    PYTHONPATH=. python scripts/db_backup.py [备份文件名]

如果不指定文件名，将自动生成带时间戳的文件名
"""

import shutil
import sys
from datetime import datetime
from pathlib import Path

from falib.utils.config import SETTINGS


def get_db_path() -> Path:
    """从配置获取 SQLite 数据库文件路径"""
    db_config = getattr(SETTINGS, "sqlite", None)
    db_path = getattr(db_config, "path", "E:/cryptoplatform-data/py_backend.db") if db_config else "E:/cryptoplatform-data/py_backend.db"
    return Path(db_path)


def backup_database(output_file: str | None = None) -> str:
    """
    备份 SQLite 数据库（复制数据库文件）

    Args:
        output_file: 输出文件名（不含路径），如果为 None 则自动生成

    Returns:
        备份文件的完整路径
    """
    db_path = get_db_path()

    if not db_path.exists():
        print(f"✗ 错误: 数据库文件不存在: {db_path}")
        sys.exit(1)

    # 确定输出目录
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "output"
    output_dir.mkdir(exist_ok=True)

    # 生成文件名
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"rwa_backup_{timestamp}.db"

    output_path = output_dir / output_file

    print(f"正在备份数据库: {db_path}")
    print(f"输出文件: {output_path}")

    try:
        shutil.copy2(str(db_path), str(output_path))
        print(f"✓ 备份成功: {output_path}")
        print(f"  文件大小: {output_path.stat().st_size / 1024:.2f} KB")
        return str(output_path)
    except Exception as e:
        print(f"✗ 备份失败: {e}")
        sys.exit(1)


def main():
    output_file = sys.argv[1] if len(sys.argv) > 1 else None
    backup_database(output_file)


if __name__ == "__main__":
    main()
