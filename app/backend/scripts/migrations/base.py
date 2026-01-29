#!/usr/bin/env python3
"""
迁移脚本基类
============

提供数据迁移的基础设施，支持:
- dry-run 模式预览变更
- 数据备份和恢复
- 自动回滚
- 迁移报告生成

Usage:
    from scripts.migrations.base import MigrationBase, MigrationResult
    
    class MyMigration(MigrationBase):
        name = "my_migration"
        description = "迁移描述"
        
        async def migrate(self) -> MigrationResult:
            # 实现迁移逻辑
            pass
    
    # 执行迁移
    migration = MyMigration(dry_run=True)
    await migration.run()

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
"""

import argparse
import asyncio
import json
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from falib.utils.log import get_logger
from tortoise import Tortoise

from src.shared.aerich_redirect import TORTOISE_ORM


logger = get_logger("supercrypto.migration")


class MigrationStatus(str, Enum):
    """迁移状态枚举"""
    
    PENDING = "pending"       # 待执行
    RUNNING = "running"       # 执行中
    SUCCESS = "success"       # 成功
    FAILED = "failed"         # 失败
    ROLLED_BACK = "rolled_back"  # 已回滚
    DRY_RUN = "dry_run"       # 预览模式完成


@dataclass
class BackupInfo:
    """备份信息"""
    
    backup_path: str          # 备份文件路径
    backup_time: datetime     # 备份时间
    tables: list[str]         # 备份的表列表
    record_counts: dict[str, int]  # 每个表的记录数
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "backup_path": self.backup_path,
            "backup_time": self.backup_time.isoformat(),
            "tables": self.tables,
            "record_counts": self.record_counts,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "BackupInfo":
        """从字典创建"""
        return cls(
            backup_path=data["backup_path"],
            backup_time=datetime.fromisoformat(data["backup_time"]),
            tables=data["tables"],
            record_counts=data["record_counts"],
        )


@dataclass
class MigrationResult:
    """迁移结果"""
    
    status: MigrationStatus   # 迁移状态
    migrated_count: int = 0   # 迁移记录数
    skipped_count: int = 0    # 跳过记录数
    error_count: int = 0      # 错误记录数
    duration_seconds: float = 0.0  # 耗时 (秒)
    errors: list[str] = field(default_factory=list)  # 错误信息列表
    warnings: list[str] = field(default_factory=list)  # 警告信息列表
    details: dict[str, Any] = field(default_factory=dict)  # 详细信息
    backup_info: Optional[BackupInfo] = None  # 备份信息
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "status": self.status.value,
            "migrated_count": self.migrated_count,
            "skipped_count": self.skipped_count,
            "error_count": self.error_count,
            "duration_seconds": round(self.duration_seconds, 2),
            "errors": self.errors,
            "warnings": self.warnings,
            "details": self.details,
            "backup_info": self.backup_info.to_dict() if self.backup_info else None,
        }
    
    def add_error(self, error: str):
        """添加错误信息"""
        self.errors.append(error)
        self.error_count += 1
    
    def add_warning(self, warning: str):
        """添加警告信息"""
        self.warnings.append(warning)
    
    @property
    def is_success(self) -> bool:
        """是否成功"""
        return self.status in (MigrationStatus.SUCCESS, MigrationStatus.DRY_RUN)


class MigrationBase(ABC):
    """
    迁移脚本基类
    
    提供数据迁移的基础设施，包括:
    - dry-run 模式预览变更 (Requirement 6.2)
    - 数据备份功能 (Requirement 6.1)
    - 自动回滚功能 (Requirement 6.3)
    - 迁移报告生成 (Requirement 6.4)
    
    子类需要实现:
    - name: 迁移名称
    - description: 迁移描述
    - migrate(): 迁移逻辑
    - get_backup_tables(): 需要备份的表列表 (可选)
    - rollback(): 回滚逻辑 (可选)
    """
    
    # 子类必须定义
    name: str = "base_migration"
    description: str = "基础迁移"
    
    # 备份目录
    BACKUP_DIR = Path(__file__).parent.parent.parent / "output" / "migration_backups"
    
    # 报告目录
    REPORT_DIR = Path(__file__).parent.parent.parent / "output" / "migration_reports"
    
    def __init__(self, dry_run: bool = False, skip_backup: bool = False):
        """
        初始化迁移
        
        Args:
            dry_run: 是否为预览模式 (不执行实际变更)
            skip_backup: 是否跳过备份 (仅用于测试)
        """
        self.dry_run = dry_run
        self.skip_backup = skip_backup
        self._start_time: Optional[datetime] = None
        self._backup_info: Optional[BackupInfo] = None
        self._db_initialized = False
        
        # 确保目录存在
        self.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        self.REPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    async def init_db(self):
        """初始化数据库连接"""
        if not self._db_initialized:
            await Tortoise.init(config=TORTOISE_ORM)
            self._db_initialized = True
            logger.info("数据库连接已初始化")
    
    async def close_db(self):
        """关闭数据库连接"""
        if self._db_initialized:
            await Tortoise.close_connections()
            self._db_initialized = False
            logger.info("数据库连接已关闭")


    def get_backup_tables(self) -> list[str]:
        """
        获取需要备份的表列表
        
        子类可以重写此方法指定需要备份的表
        默认返回空列表 (不备份)
        
        Returns:
            表名列表
        """
        return []
    
    async def create_backup(self) -> Optional[BackupInfo]:
        """
        创建数据备份 (Requirement 6.1)
        
        在执行迁移前备份相关表的数据
        
        Returns:
            备份信息，如果没有需要备份的表则返回 None
        """
        tables = self.get_backup_tables()
        if not tables:
            logger.info("没有需要备份的表")
            return None
        
        backup_time = datetime.now(timezone.utc)
        backup_name = f"{self.name}_{backup_time.strftime('%Y%m%d_%H%M%S')}"
        backup_path = self.BACKUP_DIR / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        record_counts = {}
        
        for table in tables:
            try:
                # 使用原始 SQL 查询导出数据
                conn = Tortoise.get_connection("default")
                result = await conn.execute_query(f"SELECT * FROM {table}")
                rows = result[1]  # (count, rows)
                
                record_counts[table] = len(rows)
                
                # 保存为 JSON 文件
                table_backup_file = backup_path / f"{table}.json"
                with open(table_backup_file, "w", encoding="utf-8") as f:
                    # 将行数据转换为可序列化格式
                    serializable_rows = []
                    for row in rows:
                        serializable_row = {}
                        for key, value in row.items():
                            if isinstance(value, datetime):
                                serializable_row[key] = value.isoformat()
                            elif hasattr(value, "__str__"):
                                serializable_row[key] = str(value)
                            else:
                                serializable_row[key] = value
                        serializable_rows.append(serializable_row)
                    json.dump(serializable_rows, f, ensure_ascii=False, indent=2)
                
                logger.info(f"已备份表 {table}: {len(rows)} 条记录")
                
            except Exception as e:
                logger.error(f"备份表 {table} 失败: {e}")
                raise
        
        backup_info = BackupInfo(
            backup_path=str(backup_path),
            backup_time=backup_time,
            tables=tables,
            record_counts=record_counts,
        )
        
        # 保存备份元数据
        meta_file = backup_path / "backup_meta.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(backup_info.to_dict(), f, ensure_ascii=False, indent=2)
        
        logger.info(f"备份完成: {backup_path}")
        return backup_info


    async def restore_backup(self, backup_info: BackupInfo) -> bool:
        """
        从备份恢复数据 (Requirement 6.3)
        
        Args:
            backup_info: 备份信息
            
        Returns:
            是否恢复成功
        """
        backup_path = Path(backup_info.backup_path)
        if not backup_path.exists():
            logger.error(f"备份目录不存在: {backup_path}")
            return False
        
        conn = Tortoise.get_connection("default")
        
        for table in backup_info.tables:
            try:
                table_backup_file = backup_path / f"{table}.json"
                if not table_backup_file.exists():
                    logger.warning(f"备份文件不存在: {table_backup_file}")
                    continue
                
                with open(table_backup_file, "r", encoding="utf-8") as f:
                    rows = json.load(f)
                
                if not rows:
                    logger.info(f"表 {table} 备份为空，跳过恢复")
                    continue
                
                # 清空表
                await conn.execute_query(f"DELETE FROM {table}")
                
                # 恢复数据
                for row in rows:
                    columns = ", ".join(row.keys())
                    placeholders = ", ".join([f"${i+1}" for i in range(len(row))])
                    values = list(row.values())
                    
                    await conn.execute_query(
                        f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
                        values
                    )
                
                logger.info(f"已恢复表 {table}: {len(rows)} 条记录")
                
            except Exception as e:
                logger.error(f"恢复表 {table} 失败: {e}")
                return False
        
        logger.info("数据恢复完成")
        return True


    @abstractmethod
    async def migrate(self) -> MigrationResult:
        """
        执行迁移逻辑 (子类必须实现)
        
        注意:
        - 在 dry_run 模式下，应该只预览变更，不执行实际修改
        - 可以通过 self.dry_run 判断当前模式
        - 返回的 MigrationResult 应包含迁移统计信息
        
        Returns:
            迁移结果
        """
        pass
    
    async def rollback(self, result: MigrationResult) -> bool:
        """
        回滚迁移 (Requirement 6.3)
        
        默认实现: 从备份恢复数据
        子类可以重写此方法实现自定义回滚逻辑
        
        Args:
            result: 迁移结果 (包含备份信息)
            
        Returns:
            是否回滚成功
        """
        if result.backup_info:
            return await self.restore_backup(result.backup_info)
        
        logger.warning("没有备份信息，无法回滚")
        return False


    async def run(self) -> MigrationResult:
        """
        执行迁移流程
        
        流程:
        1. 初始化数据库连接
        2. 创建数据备份 (非 dry-run 模式)
        3. 执行迁移
        4. 如果失败，自动回滚
        5. 生成迁移报告
        6. 关闭数据库连接
        
        Returns:
            迁移结果
        """
        self._start_time = datetime.now(timezone.utc)
        result = MigrationResult(status=MigrationStatus.PENDING)
        
        try:
            # 1. 初始化数据库
            await self.init_db()
            
            # 2. 创建备份 (非 dry-run 且未跳过备份)
            if not self.dry_run and not self.skip_backup:
                logger.info("正在创建数据备份...")
                self._backup_info = await self.create_backup()
                result.backup_info = self._backup_info
            
            # 3. 执行迁移
            result.status = MigrationStatus.RUNNING
            logger.info(f"开始执行迁移: {self.name}")
            logger.info(f"模式: {'预览 (dry-run)' if self.dry_run else '执行'}")
            
            result = await self.migrate()
            result.backup_info = self._backup_info
            
            # 设置状态
            if self.dry_run:
                result.status = MigrationStatus.DRY_RUN
            elif result.error_count == 0:
                result.status = MigrationStatus.SUCCESS
            else:
                result.status = MigrationStatus.FAILED
            
        except Exception as e:
            logger.exception(f"迁移执行失败: {e}")
            result.status = MigrationStatus.FAILED
            result.add_error(str(e))
            
            # 4. 自动回滚 (非 dry-run 模式)
            if not self.dry_run and self._backup_info:
                logger.info("正在执行自动回滚...")
                try:
                    rollback_success = await self.rollback(result)
                    if rollback_success:
                        result.status = MigrationStatus.ROLLED_BACK
                        logger.info("回滚成功")
                    else:
                        logger.error("回滚失败")
                except Exception as rollback_error:
                    logger.exception(f"回滚过程中发生错误: {rollback_error}")
        
        finally:
            # 计算耗时
            end_time = datetime.now(timezone.utc)
            result.duration_seconds = (end_time - self._start_time).total_seconds()
            
            # 5. 生成报告
            await self.generate_report(result)
            
            # 6. 关闭数据库连接
            await self.close_db()
        
        return result


    async def generate_report(self, result: MigrationResult) -> str:
        """
        生成迁移报告 (Requirement 6.4)
        
        报告包含:
        - 迁移名称和描述
        - 执行模式 (dry-run / 实际执行)
        - 迁移统计 (记录数、耗时、错误)
        - 备份信息
        - 错误和警告详情
        
        Args:
            result: 迁移结果
            
        Returns:
            报告文件路径
        """
        report_time = datetime.now(timezone.utc)
        report_name = f"{self.name}_{report_time.strftime('%Y%m%d_%H%M%S')}.md"
        report_path = self.REPORT_DIR / report_name
        
        # 构建报告内容
        lines = [
            f"# 迁移报告: {self.name}",
            "",
            f"**描述**: {self.description}",
            f"**执行时间**: {report_time.strftime('%Y-%m-%d %H:%M:%S')} UTC",
            f"**执行模式**: {'预览 (dry-run)' if self.dry_run else '实际执行'}",
            "",
            "---",
            "",
            "## 执行结果",
            "",
            f"| 指标 | 值 |",
            f"|------|-----|",
            f"| 状态 | {result.status.value} |",
            f"| 迁移记录数 | {result.migrated_count} |",
            f"| 跳过记录数 | {result.skipped_count} |",
            f"| 错误记录数 | {result.error_count} |",
            f"| 耗时 | {result.duration_seconds:.2f} 秒 |",
            "",
        ]
        
        # 备份信息
        if result.backup_info:
            lines.extend([
                "## 备份信息",
                "",
                f"- **备份路径**: `{result.backup_info.backup_path}`",
                f"- **备份时间**: {result.backup_info.backup_time.strftime('%Y-%m-%d %H:%M:%S')} UTC",
                f"- **备份表**: {', '.join(result.backup_info.tables)}",
                "",
                "### 备份记录数",
                "",
                "| 表名 | 记录数 |",
                "|------|--------|",
            ])
            for table, count in result.backup_info.record_counts.items():
                lines.append(f"| {table} | {count} |")
            lines.append("")
        
        # 详细信息
        if result.details:
            lines.extend([
                "## 详细信息",
                "",
                "```json",
                json.dumps(result.details, ensure_ascii=False, indent=2),
                "```",
                "",
            ])
        
        # 警告信息
        if result.warnings:
            lines.extend([
                "## 警告",
                "",
            ])
            for warning in result.warnings:
                lines.append(f"- ⚠️ {warning}")
            lines.append("")
        
        # 错误信息
        if result.errors:
            lines.extend([
                "## 错误",
                "",
            ])
            for error in result.errors:
                lines.append(f"- ❌ {error}")
            lines.append("")
        
        # 写入报告文件
        report_content = "\n".join(lines)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        logger.info(f"迁移报告已生成: {report_path}")
        
        # 同时输出到控制台
        self._print_summary(result)
        
        return str(report_path)


    def _print_summary(self, result: MigrationResult):
        """打印迁移摘要到控制台"""
        print("")
        print("=" * 60)
        print(f"📦 迁移报告: {self.name}")
        print("=" * 60)
        print(f"📝 描述: {self.description}")
        print(f"🔧 模式: {'预览 (dry-run)' if self.dry_run else '实际执行'}")
        print("-" * 60)
        
        # 状态图标
        status_icons = {
            MigrationStatus.SUCCESS: "✅",
            MigrationStatus.DRY_RUN: "👀",
            MigrationStatus.FAILED: "❌",
            MigrationStatus.ROLLED_BACK: "↩️",
            MigrationStatus.PENDING: "⏳",
            MigrationStatus.RUNNING: "🔄",
        }
        icon = status_icons.get(result.status, "❓")
        
        print(f"📊 执行结果:")
        print(f"   {icon} 状态: {result.status.value}")
        print(f"   📈 迁移记录: {result.migrated_count}")
        print(f"   ⏭️  跳过记录: {result.skipped_count}")
        print(f"   ❌ 错误记录: {result.error_count}")
        print(f"   ⏱️  耗时: {result.duration_seconds:.2f} 秒")
        
        if result.backup_info:
            print("-" * 60)
            print(f"💾 备份信息:")
            print(f"   📁 路径: {result.backup_info.backup_path}")
            total_records = sum(result.backup_info.record_counts.values())
            print(f"   📊 总记录: {total_records}")
        
        if result.warnings:
            print("-" * 60)
            print(f"⚠️  警告 ({len(result.warnings)}):")
            for warning in result.warnings[:5]:  # 最多显示 5 条
                print(f"   • {warning}")
            if len(result.warnings) > 5:
                print(f"   ... 还有 {len(result.warnings) - 5} 条警告")
        
        if result.errors:
            print("-" * 60)
            print(f"❌ 错误 ({len(result.errors)}):")
            for error in result.errors[:5]:  # 最多显示 5 条
                print(f"   • {error}")
            if len(result.errors) > 5:
                print(f"   ... 还有 {len(result.errors) - 5} 条错误")
        
        print("=" * 60)
        
        if self.dry_run and result.migrated_count > 0:
            print("")
            print("💡 提示: 移除 --dry-run 参数执行实际迁移")


    @classmethod
    def create_cli_parser(cls) -> argparse.ArgumentParser:
        """
        创建命令行参数解析器
        
        Returns:
            ArgumentParser 实例
        """
        parser = argparse.ArgumentParser(
            description=cls.description,
            formatter_class=argparse.RawDescriptionHelpFormatter,
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="预览模式，不执行实际变更 (Requirement 6.2)",
        )
        parser.add_argument(
            "--skip-backup",
            action="store_true",
            help="跳过数据备份 (仅用于测试，不推荐在生产环境使用)",
        )
        return parser
    
    @classmethod
    def run_cli(cls):
        """
        运行命令行接口
        
        Usage:
            class MyMigration(MigrationBase):
                name = "my_migration"
                description = "迁移描述"
                
                async def migrate(self) -> MigrationResult:
                    pass
            
            if __name__ == "__main__":
                MyMigration.run_cli()
        """
        parser = cls.create_cli_parser()
        args = parser.parse_args()
        
        migration = cls(dry_run=args.dry_run, skip_backup=args.skip_backup)
        result = asyncio.run(migration.run())
        
        # 根据结果设置退出码
        if result.is_success:
            sys.exit(0)
        else:
            sys.exit(1)


# 便捷函数
def run_migration(migration_class: type[MigrationBase], dry_run: bool = False) -> MigrationResult:
    """
    运行迁移的便捷函数
    
    Args:
        migration_class: 迁移类
        dry_run: 是否为预览模式
        
    Returns:
        迁移结果
    """
    migration = migration_class(dry_run=dry_run)
    return asyncio.run(migration.run())
