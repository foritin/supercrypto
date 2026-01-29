"""
Contract Sync Service - 合约同步与主合约管理服务
_Requirements: 3.1_

负责合约记录更新和主合约标记管理
"""

from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.contracts.contract_deployment import ContractDeployment
from src.shared.schemas.enums import ContractScope, ErrorCode
from src.shared.common.exceptions import BusinessException

logger = get_logger("contract.sync_service")


class ContractSyncService:
    """合约同步与主合约管理服务"""

    def __init__(self, network: Optional[str] = None):
        self.network = network or SETTINGS.NETWORK

    async def update_registry_record(self, contract_name: str, address: str) -> ContractDeployment:
        """
        手动更新本地合约记录

        Args:
            contract_name: 合约名称
            address: 新的合约地址

        Returns:
            更新后的合约对象

        Raises:
            Exception: 合约不存在
        """
        contract = await ContractDeployment.filter(
            name=contract_name, network=self.network
        ).first()
        if not contract:
            raise Exception(f"Contract {contract_name} not found in DB")

        contract.address = address
        await contract.save()
        logger.info(f"Manually updated contract {contract_name} to {address}")
        return contract

    async def set_primary(self, contract_id: int) -> ContractDeployment:
        """
        设置合约为主合约

        验证规则:
        1. 合约必须存在
        2. 合约必须是 PROJECT scope（只有项目专属合约可以设为主合约）
        3. 项目不能已有主合约（每个项目只能有一个主合约）

        Args:
            contract_id: 合约 ID

        Returns:
            更新后的合约对象

        Raises:
            BusinessException: 合约不存在、scope 不正确、或项目已有主合约
        """
        # 1. 验证合约存在
        contract = await ContractDeployment.filter(id=contract_id).first()
        if not contract:
            raise BusinessException(
                code=404,
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail={"contract_id": contract_id},
            )

        # 2. 验证合约是 PROJECT scope
        if contract.scope != ContractScope.PROJECT:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.CONTRACT_NOT_PROJECT_SCOPE,
                detail={"contract_id": contract_id, "scope": contract.scope.value if contract.scope else None},
            )

        # 3. 检查项目是否已有主合约
        existing_primary = await ContractDeployment.filter(
            project_name=contract.project_name,
            network=self.network,
            is_primary=True,
        ).first()

        if existing_primary:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_ALREADY_HAS_PRIMARY,
                detail={
                    "project_name": contract.project_name,
                    "existing_primary_id": existing_primary.id,
                    "existing_primary_name": existing_primary.name,
                },
            )

        # 4. 设置为主合约
        contract.is_primary = True
        await contract.save()

        logger.info(
            f"Set contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract

    async def unset_primary(self, contract_id: int) -> ContractDeployment:
        """
        取消合约的主合约标记

        验证规则:
        1. 合约必须存在
        2. 合约必须是当前的主合约（is_primary=True）

        Args:
            contract_id: 合约 ID

        Returns:
            更新后的合约对象

        Raises:
            BusinessException: 合约不存在或合约不是主合约
        """
        # 1. 验证合约存在
        contract = await ContractDeployment.filter(id=contract_id).first()
        if not contract:
            raise BusinessException(
                code=404,
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail={"contract_id": contract_id},
            )

        # 2. 验证合约是主合约
        if not contract.is_primary:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.CONTRACT_NOT_PRIMARY,
                detail={"contract_id": contract_id, "contract_name": contract.name},
            )

        # 3. 取消主合约标记
        contract.is_primary = False
        await contract.save()

        logger.info(
            f"Unset contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract


def get_contract_sync_service(network: Optional[str] = None) -> ContractSyncService:
    """获取合约同步服务实例"""
    return ContractSyncService(network)
