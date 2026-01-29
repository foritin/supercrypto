#!/usr/bin/env python3
"""
[ARCHIVED - MIGRATION COMPLETE]
===============================

This migration script has been completed and archived as part of the
contract table consolidation refactoring (contract-table-consolidation spec).

Original Purpose:
    Contract + ContractDeploymentStatus → ContractDeployment 迁移脚本
    将 Contract 和 ContractDeploymentStatus 表的数据合并迁移到 ContractDeployment 表。

Migration Status: COMPLETED
Archived Date: 2024
Reason: The source models (Contract, ContractDeploymentStatus, ProjectContractConfig)
        have been deleted from the codebase. This script is kept for historical
        reference only.

WARNING: DO NOT RUN THIS SCRIPT
    This script references deleted models and will fail with ImportError:
    - src.models.contracts.contract.Contract (DELETED)
    - src.models.project_registry.ContractDeploymentStatus (DELETED)
    - src.models.project_registry.ProjectContractConfig (DELETED)

The data has been successfully migrated to:
    - ContractConfig (src/models/contracts/contract_config.py)
    - ContractDeployment (src/models/contracts/contract_deployment.py)

Original Migration Logic:
    1. 从 Contract 读取部署记录
    2. 从 ContractDeploymentStatus 读取状态信息
    3. 按 address 合并相同合约的记录
    4. 建立与 ContractConfig 的外键关联
    5. 写入 ContractDeployment 表

Original Field Mapping:
    - Contract:
      - name → name
      - address → address
      - deployer_address → deployer_address
      - network → network
      - chain_id → chain_id
      - scope → scope
      - contract_type → contract_type
      - project_name → project_name
      - tx_hash → tx_hash
      - abi_path → abi_path
      - status → status
      - is_primary → is_primary
      - symbol → symbol

    - ContractDeploymentStatus:
      - bindings → bindings
      - deploy_block → deploy_block

    - 外键关联:
      - 通过 contract_name 查找 ContractConfig.id → config_id

Requirements: 3.2, 3.6 (from contract-table-consolidation spec)
"""

# =============================================================================
# ARCHIVED CODE - DO NOT USE
# =============================================================================
# The following code is preserved for historical reference only.
# It will not execute as the imported models have been deleted.
# =============================================================================

raise RuntimeError(
    "This migration script has been archived and cannot be run. "
    "The source models (Contract, ContractDeploymentStatus) have been deleted. "
    "See the docstring for details."
)

# Original imports (commented out - models deleted):
# from src.models.contracts.contract import Contract
# from src.models.contracts.contract_config import ContractConfig
# from src.models.contracts.contract_deployment import ContractDeployment
# from src.models.project_registry import ContractDeploymentStatus

# Original code preserved below for reference (will not execute due to RuntimeError above)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from falib.utils.log import get_logger
from scripts.migrations.base import MigrationBase, MigrationResult, MigrationStatus

logger = get_logger("supercrypto.migration.contract_deployment")


class MigrateContractDeployment(MigrationBase):
    # Migration class implementation was here
    # See git history for original implementation
    pass
"""
