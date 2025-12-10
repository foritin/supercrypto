"""
部署信息记录
"""
from tortoise import fields
from src.models.base import AbstractModel, TimestampMixin


class DeployInfo(AbstractModel, TimestampMixin):
    """
    合约部署记录
    
    用于追踪每个合约的部署状态，支持：
    - 检查是否已部署（避免重复部署）
    - 记录部署历史
    - 跨脚本共享合约地址
    """
    
    # 部署阶段标识
    deploy_step = fields.CharField(
        max_length=32, 
        index=True,
        description="部署阶段: 1_mocks, 2_sto_base, 3_sto_business, 4_oracle"
    )
    
    # 合约标识
    contract_name = fields.CharField(
        max_length=64, 
        index=True,
        description="合约名称: MockUSDT, KYCManager, RWATokenSTO..."
    )
    
    # 部署结果
    contract_address = fields.CharField(
        max_length=128, 
        description="合约地址"
    )
    
    # 部署环境
    network = fields.CharField(
        max_length=32, 
        index=True,
        description="部署网络: local, sepolia, mainnet"
    )
    
    # 部署账户（关联，不存私钥）
    deployer_address = fields.CharField(
        max_length=128, 
        description="部署者地址"
    )
    
    # 交易追踪
    tx_hash = fields.CharField(
        max_length=128, 
        null=True,
        description="部署交易哈希"
    )
    
    # 合约版本（可选，用于追踪升级）
    contract_version = fields.CharField(
        max_length=32, 
        null=True,
        default="1.0.0",
        description="合约版本"
    )
    
    # 依赖的其他合约地址（JSON格式存储）
    dependencies = fields.JSONField(
        null=True,
        description="依赖的合约地址, 如 {'KYCManager': '0x...'}"
    )
    
    # 是否为当前活跃版本
    is_active = fields.BooleanField(
        default=True,
        index=True,
        description="是否为当前活跃部署"
    )

    class Meta:
        table = "deploy_info"
        table_description = "合约部署记录"
        unique_together = [
            ("deploy_step", "contract_name", "network", "is_active")
        ]
    
    def __str__(self):
        return f"{self.contract_name}@{self.network} ({self.contract_address[:10]}...)"
