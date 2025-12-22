"""
Contract Binding Model
合约绑定关系模型

记录合约部署时实际绑定的依赖地址，用于：
1. 检测某个依赖合约重新部署后，哪些合约需要更新绑定
2. 追踪绑定地址的变更历史
"""
from tortoise import fields
from tortoise.models import Model


class ContractBinding(Model):
    """
    合约绑定关系表
    
    记录合约部署时实际使用的依赖地址。
    当依赖合约重新部署后，通过比较：
      bound_address vs deploy_info 最新地址
    来判断是否需要更新。
    """
    
    id = fields.IntField(pk=True)
    
    # 主合约（使用依赖的合约）
    contract_name = fields.CharField(
        max_length=100, 
        description="主合约名称，如 Subscription"
    )
    contract_address = fields.CharField(
        max_length=100, 
        description="主合约地址"
    )
    
    # 依赖合约
    dependency_name = fields.CharField(
        max_length=100, 
        description="依赖合约名称，如 KYCManager"
    )
    bound_address = fields.CharField(
        max_length=100, 
        description="实际绑定的依赖合约地址"
    )
    
    # 更新函数
    set_function = fields.CharField(
        max_length=100, 
        description="用于更新地址的 set 函数名，如 setKYCManager"
    )
    
    # 网络
    network = fields.CharField(
        max_length=50, 
        description="网络类型：local/sepolia/mainnet"
    )
    
    # 更新记录
    last_updated_at = fields.DatetimeField(
        auto_now=True,
        description="最后更新时间"
    )
    last_updated_tx = fields.CharField(
        max_length=100, 
        null=True, 
        description="最后更新的交易哈希"
    )
    
    # 时间戳
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "contract_binding"
        unique_together = (("contract_name", "dependency_name", "network"),)
        ordering = ["contract_name", "dependency_name"]

    def __str__(self):
        return f"{self.contract_name} -> {self.dependency_name} ({self.bound_address[:10]}...)"


# 依赖关系配置（用于确定 set 函数名）
DEPENDENCY_SET_FUNCTIONS = {
    # (contract_name, dependency_name): set_function
    ("RWATokenSTO", "KYCManager"): "setKYCManager",
    ("Subscription", "KYCManager"): "setKYCManager",
    ("Subscription", "MockUSDT"): "setUSDT",
    ("Subscription", "RWATokenSTO"): "setRWAToken",
    ("Staking", "KYCManager"): "setKYCManager",
    ("Staking", "RWATokenSTO"): "setRWAToken",
    ("Staking", "PlatformToken"): "setPlatformToken",
    ("Staking", "Subscription"): "setSubscription",
    ("LiquidityMining", "KYCManager"): "setKYCManager",
    ("LiquidityMining", "PlatformToken"): "setPlatformToken",
}


def get_set_function(contract_name: str, dependency_name: str) -> str:
    """获取对应的 set 函数名"""
    return DEPENDENCY_SET_FUNCTIONS.get(
        (contract_name, dependency_name), 
        f"set{dependency_name}"
    )


# 保留旧模型的别名，方便兼容
ContractDependencySync = ContractBinding
PRESET_DEPENDENCIES = []  # 不再需要预置数据

