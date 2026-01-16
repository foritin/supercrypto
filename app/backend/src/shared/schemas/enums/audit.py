"""
审计相关枚举

合并自 models/audit.py 和 models/audit_log.py
"""
from enum import Enum


class AuditCategory(str, Enum):
    """审计类别枚举"""
    ACCOUNT = "account"          # 账户相关
    PERMISSION = "permission"    # 权限相关
    CONTRACT = "contract"        # 合约相关
    ASSET = "asset"              # 资产相关
    AUTH = "auth"                # 认证相关
    SYSTEM = "system"            # 系统操作
    KYC = "kyc"                  # KYC 相关
    STAKING = "staking"          # 质押相关


class AuditAction(str, Enum):
    """
    审计操作类型枚举 - 统一合并版
    
    命名规范: {类别}.{动作} 或 {类别}_{动作}
    """
    
    # ========== 账户操作 ==========
    ACCOUNT_CREATE = "account.create"
    ACCOUNT_UPDATE = "account.update"
    ACCOUNT_DELETE = "account.delete"
    ACCOUNT_BLOCK = "account.block"
    ACCOUNT_UNBLOCK = "account.unblock"
    ACCOUNT_RESTORE = "account.restore"
    ACCOUNT_FREEZE = "account_freeze"
    ACCOUNT_UNFREEZE = "account_unfreeze"
    
    # ========== 权限操作 ==========
    PERMISSION_GRANT = "permission.grant"
    PERMISSION_REVOKE = "permission.revoke"
    
    # ========== 认证操作 ==========
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_LOGIN_FAILED = "auth.login_failed"
    AUTH_PASSWORD_CHANGE = "auth.password_change"
    AUTH_REFRESH = "auth.refresh"
    USER_SESSION_REVOKE = "user_session_revoke"
    USER_BLACKLIST_REMOVE = "user_blacklist_remove"
    
    # ========== KYC 操作 ==========
    KYC_APPROVE = "kyc_approve"
    KYC_REJECT = "kyc_reject"
    KYC_RESET = "kyc_reset"
    KYC_REVIEW = "kyc_review"
    KYC_SYNC_RETRY = "kyc_sync_retry"
    
    # ========== 资产操作 ==========
    ASSET_CREATE = "asset_create"
    ASSET_UPDATE = "asset_update"
    ASSET_PAUSE = "asset_pause"
    ASSET_RESUME = "asset_resume"
    ASSET_DELETE = "asset_delete"
    ASSET_DEPOSIT = "asset.deposit"
    ASSET_WITHDRAW = "asset.withdraw"
    ASSET_TRANSFER = "asset.transfer"
    ASSET_APPROVE = "asset.approve"
    ASSET_STATUS_CHANGE = "asset_status_change"
    ASSET_PRICE_UPDATE = "asset_price_update"
    ASSET_BIND_CONTRACT = "asset_bind_contract"
    ASSET_UNBIND_CONTRACT = "asset_unbind_contract"
    
    # ========== 合约操作 ==========
    CONTRACT_DEPLOY = "contract.deploy"
    CONTRACT_CALL = "contract.call"
    CONTRACT_ADMIN_ADD = "contract.admin_add"
    CONTRACT_ADMIN_REMOVE = "contract.admin_remove"
    CONTRACT_UPGRADE = "contract.upgrade"
    CONTRACT_PAUSE = "contract.pause"
    CONTRACT_UNPAUSE = "contract.unpause"
    CONTRACT_BIND = "contract_bind"
    CONTRACT_UNBIND = "contract_unbind"
    CONTRACT_UPDATE = "contract_update"
    CONTRACT_RESET = "contract_reset"
    CONTRACT_REGISTER = "contract.register"
    CONTRACT_UNREGISTER = "contract.unregister"
    CONTRACT_SYNC = "contract.sync"
    
    # ========== 质押挖矿 ==========
    STAKING_CONFIG_UPDATE = "staking_config_update"
    STAKING_PAUSE = "staking_pause"
    STAKING_RESUME = "staking_resume"
    
    # ========== 代币管理 ==========
    TOKEN_AIRDROP = "token_airdrop"
    TOKEN_MINT = "token_mint"
    
    # ========== 预言机 ==========
    ORACLE_PRICE_UPDATE = "oracle_price_update"
    
    # ========== 紧急控制 ==========
    EMERGENCY_PAUSE = "emergency_pause"
    EMERGENCY_UNPAUSE = "emergency_unpause"
    BLACKLIST_ADD = "blacklist_add"
    BLACKLIST_REMOVE = "blacklist_remove"
    
    # ========== 系统操作 ==========
    SYSTEM_CONFIG_UPDATE = "system.config_update"
    SYSTEM_MAINTENANCE = "system.maintenance"
    
    # ========== 开发工具 ==========
    DEV_QUICK_KYC = "dev_quick_kyc"
    DEV_MINT_TOKEN = "dev_mint_token"
    DEV_RESET_DATA = "dev_reset_data"
    
    # ========== 其他 ==========
    OTHER = "other"


class AuditStatus(str, Enum):
    """操作结果状态"""
    SUCCESS = "success"      # 成功
    FAILED = "failed"        # 失败
    PENDING = "pending"      # 待处理
    REVERTED = "reverted"    # 已回滚


class TransactionAuditType(str, Enum):
    """链上交易类型"""
    TRANSFER = "transfer"              # ETH 转账
    TOKEN_TRANSFER = "token_transfer"  # Token 转账
    TOKEN_APPROVE = "token_approve"    # Token 授权
    CONTRACT_DEPLOY = "contract_deploy"  # 合约部署
    CONTRACT_CALL = "contract_call"    # 合约调用
    STAKING = "staking"                # 质押
    UNSTAKING = "unstaking"            # 解除质押
    CLAIM_REWARD = "claim_reward"      # 领取奖励
    SWAP = "swap"                      # 兑换
    OTHER = "other"                    # 其他


class TransactionAuditStatus(str, Enum):
    """链上交易状态"""
    PENDING = "pending"        # 待确认
    CONFIRMED = "confirmed"    # 已确认
    FAILED = "failed"          # 失败
    REVERTED = "reverted"      # 已回滚
    DROPPED = "dropped"        # 已丢弃

