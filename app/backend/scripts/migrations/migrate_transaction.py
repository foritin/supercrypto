#!/usr/bin/env python3
"""
Transaction → TransactionAudit 数据迁移脚本
==========================================

将 Transaction 表中的数据迁移到 TransactionAudit 表。

字段映射:
- tx_hash → tx_hash
- from_address → from_address
- to_address → to_address
- amount → value (Decimal → str, Wei)
- network → network
- status → status (TransactionStatus → TransactionAuditStatus)
- tx_type → tx_type (TransactionType → TransactionAuditType)
- gas_price → gas_price
- gas_used → gas_used
- block_number → block_number
- block_timestamp → block_timestamp
- wallet_id → operator_id (语义变化)
- note → description

Usage:
    # 预览模式 (不执行实际变更)
    cd app/backend && source .venv/bin/activate && PYTHONPATH=. python scripts/migrations/migrate_transaction.py --dry-run
    
    # 执行迁移
    cd app/backend && source .venv/bin/activate && PYTHONPATH=. python scripts/migrations/migrate_transaction.py

Requirements: 1.1, 1.4
"""

import sys
from decimal import Decimal
from pathlib import Path
from typing import Optional

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from falib.utils.log import get_logger
from tortoise import Tortoise

from scripts.migrations.base import MigrationBase, MigrationResult, MigrationStatus
from src.models.transaction import Transaction
from src.models.transaction_audit import TransactionAudit
from src.schemas.enums import TransactionStatus, TransactionType
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType


logger = get_logger("supercrypto.migration.transaction")


# ==================== 枚举映射 ====================

# TransactionStatus → TransactionAuditStatus 映射
STATUS_MAPPING: dict[TransactionStatus, TransactionAuditStatus] = {
    TransactionStatus.PENDING: TransactionAuditStatus.PENDING,
    TransactionStatus.CONFIRMED: TransactionAuditStatus.CONFIRMED,
    TransactionStatus.FAILED: TransactionAuditStatus.FAILED,
    TransactionStatus.CANCELLED: TransactionAuditStatus.DROPPED,  # cancelled → dropped
}

# TransactionType → TransactionAuditType 映射
TYPE_MAPPING: dict[TransactionType, TransactionAuditType] = {
    # 业务交易类型映射
    TransactionType.SUBSCRIPTION: TransactionAuditType.CONTRACT_CALL,
    TransactionType.REDEEM: TransactionAuditType.CONTRACT_CALL,
    TransactionType.STAKE: TransactionAuditType.STAKING,
    TransactionType.UNSTAKE: TransactionAuditType.UNSTAKING,
    TransactionType.CLAIM: TransactionAuditType.CLAIM_REWARD,
    # 链上交易类型映射
    TransactionType.TRANSFER: TransactionAuditType.TRANSFER,
    TransactionType.APPROVE: TransactionAuditType.TOKEN_APPROVE,
    TransactionType.MINT: TransactionAuditType.CONTRACT_CALL,
    # 其他
    TransactionType.OTHER: TransactionAuditType.OTHER,
}


def map_status(status: TransactionStatus) -> TransactionAuditStatus:
    """
    映射 TransactionStatus 到 TransactionAuditStatus
    
    Args:
        status: 原始交易状态
        
    Returns:
        映射后的审计交易状态
    """
    return STATUS_MAPPING.get(status, TransactionAuditStatus.PENDING)


def map_type(tx_type: TransactionType) -> TransactionAuditType:
    """
    映射 TransactionType 到 TransactionAuditType
    
    Args:
        tx_type: 原始交易类型
        
    Returns:
        映射后的审计交易类型
    """
    return TYPE_MAPPING.get(tx_type, TransactionAuditType.OTHER)


def convert_amount_to_wei(amount: Decimal) -> str:
    """
    将 Decimal 金额转换为 Wei 字符串
    
    TransactionAudit.value 存储的是 Wei 字符串
    假设 Transaction.amount 存储的是 ETH 单位
    
    Args:
        amount: Decimal 金额 (ETH 单位)
        
    Returns:
        Wei 字符串
    """
    # 将 ETH 转换为 Wei (1 ETH = 10^18 Wei)
    wei_value = amount * Decimal("1000000000000000000")
    # 转换为整数字符串
    return str(int(wei_value))


def get_chain_id_from_network(network: str) -> int:
    """
    根据网络名称获取 chain_id
    
    Args:
        network: 网络名称
        
    Returns:
        chain_id
    """
    network_chain_map = {
        "ethereum": 1,
        "mainnet": 1,
        "sepolia": 11155111,
        "goerli": 5,
        "hardhat": 31337,
        "local": 31337,
    }
    return network_chain_map.get(network.lower(), 1)


class TransactionMigration(MigrationBase):
    """
    Transaction → TransactionAudit 迁移
    
    将 Transaction 表中的数据迁移到 TransactionAudit 表，
    支持 dry-run 模式预览变更和错误回滚。
    
    **Validates: Requirements 1.1, 1.4**
    """
    
    name = "transaction_to_transaction_audit"
    description = "将 Transaction 表数据迁移到 TransactionAudit 表"
    
    def get_backup_tables(self) -> list[str]:
        """
        获取需要备份的表列表
        
        Returns:
            需要备份的表名列表
        """
        return ["transaction", "transaction_audit"]
    
    async def migrate(self) -> MigrationResult:
        """
        执行迁移逻辑
        
        流程:
        1. 查询所有 Transaction 记录
        2. 检查 TransactionAudit 中是否已存在相同 tx_hash
        3. 转换字段并创建 TransactionAudit 记录
        4. 统计迁移结果
        
        Returns:
            迁移结果
        """
        result = MigrationResult(status=MigrationStatus.RUNNING)
        
        # 1. 查询所有 Transaction 记录
        transactions = await Transaction.all()
        total_count = len(transactions)
        
        logger.info(f"找到 {total_count} 条 Transaction 记录待迁移")
        result.details["total_records"] = total_count
        
        if total_count == 0:
            logger.info("没有需要迁移的记录")
            result.status = MigrationStatus.SUCCESS if not self.dry_run else MigrationStatus.DRY_RUN
            return result
        
        # 2. 获取已存在的 tx_hash 集合 (用于跳过重复)
        existing_hashes = set()
        existing_audits = await TransactionAudit.all().values_list("tx_hash", flat=True)
        existing_hashes = set(existing_audits)
        
        logger.info(f"TransactionAudit 中已存在 {len(existing_hashes)} 条记录")
        result.details["existing_audit_records"] = len(existing_hashes)
        
        # 3. 迁移每条记录
        migrated_records = []
        
        for tx in transactions:
            try:
                # 检查是否已存在
                if tx.tx_hash in existing_hashes:
                    logger.debug(f"跳过已存在的记录: {tx.tx_hash}")
                    result.skipped_count += 1
                    result.add_warning(f"tx_hash 已存在，跳过: {tx.tx_hash}")
                    continue
                
                # 转换字段
                audit_data = self._convert_transaction(tx)
                
                if self.dry_run:
                    # dry-run 模式: 只记录，不执行
                    logger.debug(f"[dry-run] 将迁移: {tx.tx_hash}")
                    migrated_records.append({
                        "tx_hash": tx.tx_hash,
                        "from_address": tx.from_address,
                        "to_address": tx.to_address,
                        "value": audit_data["value"],
                        "status": audit_data["status"].value,
                        "tx_type": audit_data["tx_type"].value,
                    })
                else:
                    # 实际执行: 创建 TransactionAudit 记录
                    await TransactionAudit.create(**audit_data)
                    logger.debug(f"已迁移: {tx.tx_hash}")
                
                result.migrated_count += 1
                
            except Exception as e:
                error_msg = f"迁移记录 {tx.tx_hash} 失败: {str(e)}"
                logger.error(error_msg)
                result.add_error(error_msg)
        
        # 4. 记录详细信息
        if self.dry_run:
            result.details["preview_records"] = migrated_records[:10]  # 只保留前 10 条预览
            if len(migrated_records) > 10:
                result.details["preview_truncated"] = True
        
        result.details["migrated_count"] = result.migrated_count
        result.details["skipped_count"] = result.skipped_count
        result.details["error_count"] = result.error_count
        
        # 5. 设置最终状态
        if result.error_count > 0:
            result.status = MigrationStatus.FAILED
        elif self.dry_run:
            result.status = MigrationStatus.DRY_RUN
        else:
            result.status = MigrationStatus.SUCCESS
        
        logger.info(
            f"迁移完成: 成功 {result.migrated_count}, "
            f"跳过 {result.skipped_count}, 错误 {result.error_count}"
        )
        
        return result
    
    def _convert_transaction(self, tx: Transaction) -> dict:
        """
        转换 Transaction 记录为 TransactionAudit 字段
        
        Args:
            tx: Transaction 记录
            
        Returns:
            TransactionAudit 字段字典
        """
        # 获取 chain_id
        chain_id = get_chain_id_from_network(tx.network)
        
        # 转换金额为 Wei 字符串
        value = convert_amount_to_wei(tx.amount) if tx.amount else "0"
        
        # 映射状态和类型
        status = map_status(tx.status)
        tx_type = map_type(tx.tx_type)
        
        # 构建 TransactionAudit 数据
        audit_data = {
            # 基本信息
            "tx_hash": tx.tx_hash,
            "chain_id": chain_id,
            "network": tx.network,
            # 地址信息
            "from_address": tx.from_address,
            "to_address": tx.to_address,
            "value": value,
            # 类型和状态
            "tx_type": tx_type,
            "status": status,
            # Gas 信息
            "gas_price": tx.gas_price,
            "gas_used": int(tx.gas_used) if tx.gas_used else None,
            # 区块信息
            "block_number": tx.block_number,
            "block_timestamp": tx.block_timestamp,
            # 关联信息 (wallet_id → operator_id)
            "operator_id": tx.wallet_id,
            # 描述 (note → description)
            "description": tx.note,
            # 额外数据: 保存原始信息用于追溯
            "extra_data": {
                "migrated_from": "transaction",
                "original_amount": str(tx.amount) if tx.amount else None,
                "original_status": tx.status.value if tx.status else None,
                "original_tx_type": tx.tx_type.value if tx.tx_type else None,
            },
        }
        
        return audit_data
    
    async def rollback(self, result: MigrationResult) -> bool:
        """
        回滚迁移
        
        删除本次迁移创建的 TransactionAudit 记录
        (通过 extra_data.migrated_from = 'transaction' 识别)
        
        Args:
            result: 迁移结果
            
        Returns:
            是否回滚成功
        """
        # 首先尝试从备份恢复
        if result.backup_info:
            logger.info("尝试从备份恢复数据...")
            return await self.restore_backup(result.backup_info)
        
        # 如果没有备份，尝试删除迁移的记录
        logger.info("没有备份，尝试删除迁移的记录...")
        try:
            # 查找并删除本次迁移创建的记录
            # 注意: TransactionAudit 禁止删除，这里需要特殊处理
            # 实际上应该通过备份恢复，这里只是记录警告
            logger.warning(
                "TransactionAudit 表禁止删除操作，"
                "请通过数据库备份手动恢复数据"
            )
            return False
        except Exception as e:
            logger.error(f"回滚失败: {e}")
            return False


# ==================== 命令行入口 ====================

if __name__ == "__main__":
    TransactionMigration.run_cli()
