"""
开发者工具 Service
处理测试数据重置等开发辅助功能
"""
from typing import List
from src.models import UserKyc, Transaction, Account
from src.domains.dev.schemas import ResetDataType, ResetableDataInfo, TokenRecipient
from falib.utils.config import SETTINGS


class DevToolsService:
    """开发者工具服务"""
    
    def __init__(self):
        self.environment = SETTINGS.environment or "local"
    
    async def get_resetable_data_info(self) -> ResetableDataInfo:
        """获取可重置数据的统计信息"""
        # 只统计当前环境的数据
        kyc_count = await UserKyc.filter(environment=self.environment).count()
        
        # Transaction 没有 environment 字段，统计所有
        transaction_count = await Transaction.all().count()
        
        return ResetableDataInfo(
            kyc_count=kyc_count,
            transaction_count=transaction_count,
            environment=self.environment
        )
    
    async def reset_data(self, data_types: List[ResetDataType]) -> dict:
        """
        重置测试数据
        
        Args:
            data_types: 要重置的数据类型列表
            
        Returns:
            各类型重置的记录数
        """
        reset_counts = {}
        
        # 检查是否重置全部
        reset_all = ResetDataType.ALL in data_types
        
        # 重置 KYC 数据
        if reset_all or ResetDataType.KYC in data_types:
            deleted_count = await UserKyc.filter(environment=self.environment).delete()
            reset_counts["kyc"] = deleted_count
        
        # 重置交易数据（仅在 local 环境重置所有交易）
        if reset_all or ResetDataType.TRANSACTION in data_types:
            if self.environment == "local":
                deleted_count = await Transaction.all().delete()
                reset_counts["transaction"] = deleted_count
            else:
                # 非 local 环境不重置交易数据（链上数据无法清除）
                reset_counts["transaction"] = 0
                reset_counts["transaction_note"] = "Non-local env: chain data cannot be reset"
        
        return reset_counts
    
    def is_reset_allowed(self) -> bool:
        """检查当前环境是否允许数据重置"""
        # 只有 local 环境允许重置
        return self.environment == "local"
    
    def get_environment(self) -> str:
        """获取当前环境"""
        return self.environment
    
    async def get_token_recipients(self, exclude_address: str) -> List[TokenRecipient]:
        """
        获取可接收测试代币的用户列表
        
        Args:
            exclude_address: 要排除的地址（通常是 admin 自己）
            
        Returns:
            可接收代币的用户列表
        """
        recipients = []
        
        # 获取当前环境的所有账户
        accounts = await Account.filter(net_type=self.environment).all()
        
        for account in accounts:
            # 排除指定地址
            if account.address.lower() == exclude_address.lower():
                continue
            
            # 查询 KYC 状态
            kyc = await UserKyc.filter(
                wallet_address=account.address,
                environment=self.environment
            ).first()
            
            kyc_status = kyc.status.value if kyc else None
            
            # 构建显示标签
            parts = [account.address[:6] + "..." + account.address[-4:]]
            if account.tag:
                parts.append(f"({account.tag})")
            if kyc_status:
                parts.append(f"[KYC: {kyc_status}]")
            
            recipients.append(TokenRecipient(
                address=account.address,
                kyc_status=kyc_status,
                tag=account.tag,
                label=" ".join(parts)
            ))
        
        return recipients

