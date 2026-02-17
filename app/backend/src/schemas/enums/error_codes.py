"""
业务错误码枚举

前后端共享的错误码定义，前端根据错误码进行国际化翻译

错误码规范:
- 1xxx: 认证相关
- 2xxx: 资产相关
- 3xxx: 合约相关
- 4xxx: KYC 相关
- 5xxx: 认购相关
- 6xxx: 环境限制
- 9xxx: 通用错误
"""

from enum import IntEnum
from typing import NamedTuple


class ErrorInfo(NamedTuple):
    """错误信息"""

    code: int
    message: str  # 默认英文消息（用于日志和无翻译时的回退）


class ErrorCode(IntEnum):
    """业务错误码"""

    # ============ 认证相关 (1xxx) ============
    AUTH_TOKEN_EXPIRED = 1001
    AUTH_TOKEN_INVALID = 1002
    AUTH_SIGNATURE_INVALID = 1003
    AUTH_NONCE_INVALID = 1004
    AUTH_SESSION_REVOKED = 1005

    # ============ 资产相关 (2xxx) ============
    ASSET_NOT_FOUND = 2001
    ASSET_SYMBOL_EXISTS = 2002
    ASSET_NOT_AVAILABLE = 2003
    ASSET_SUPPLY_EXCEEDED = 2004

    # ============ 合约绑定相关 (3xxx) ============
    PROJECT_NO_PRIMARY_CONTRACT = 3001
    PROJECT_NO_CONTRACTS = 3002
    CONTRACTS_NOT_FOUND = 3003
    CONTRACT_ALREADY_BOUND = 3004
    CONTRACT_NOT_BOUND = 3005
    CONTRACT_DEPLOYMENT_NOT_FOUND = 3006
    PROJECT_NOT_READY = 3007
    PROJECT_BOUND_CANNOT_MODIFY = 3008
    PROJECT_ALREADY_HAS_PRIMARY = 3009
    CONTRACT_NOT_PROJECT_SCOPE = 3010
    CONTRACT_NOT_PRIMARY = 3011
    ADDRESS_PROVIDER_NOT_FOUND = 3012
    CONTRACT_CONFIG_NOT_FOUND = 3013
    CONTRACT_NO_PROVIDER_KEY = 3014
    CONTRACT_NOT_DEPLOYED = 3015
    CONTRACT_NOT_REGISTERED = 3016
    PROVIDER_REGISTRY_NOT_FOUND = 3017

    # ============ KYC 相关 (4xxx) ============
    KYC_NOT_FOUND = 4001
    KYC_ALREADY_PENDING = 4002
    KYC_ALREADY_APPROVED = 4003
    KYC_INVALID_STATUS = 4004
    KYC_ALREADY_SYNCED = 4005
    KYC_SYNC_NOT_REQUIRED = 4006
    KYC_REQUIRED = 4007

    # ============ 认购相关 (5xxx) ============
    SUBSCRIPTION_NOT_FOUND = 5001
    SUBSCRIPTION_MIN_AMOUNT = 5002
    SUBSCRIPTION_SUPPLY_EXCEEDED = 5003
    SUBSCRIPTION_CONFLICT = 5004
    SUBSCRIPTION_PROCESSING = 5005

    # ============ 环境限制 (6xxx) ============
    ENV_NOT_ALLOWED = 6001
    ENV_HARDHAT_ONLY = 6002
    ENV_DEV_ONLY = 6003

    # ============ 审计相关 (7xxx) ============
    AUDIT_LOG_IMMUTABLE = 7001
    TRANSACTION_AUDIT_IMMUTABLE = 7002

    # ============ 配置/媒体相关 (8xxx) ============
    CONFIG_LOAD_ERROR = 8001
    CYCLIC_DEPENDENCY = 8002
    CONTRACT_VALIDATION_FAILED = 8003
    MEDIA_UPLOAD_FAILED = 8004

    # ============ 通用错误 (9xxx) ============
    UNKNOWN_ERROR = 9000
    VALIDATION_ERROR = 9001
    NOT_FOUND = 9002
    UNAUTHORIZED = 9003
    FORBIDDEN = 9004
    CONFLICT = 9005

    @property
    def default_message(self) -> str:
        """获取错误码的默认消息"""
        return ERROR_MESSAGES.get(self, "Unknown error")


# 错误码默认消息映射（英文，用于日志和无翻译时的回退）
ERROR_MESSAGES: dict[ErrorCode, str] = {
    # 认证相关
    ErrorCode.AUTH_TOKEN_EXPIRED: "Session expired, please login again",
    ErrorCode.AUTH_TOKEN_INVALID: "Invalid authentication token",
    ErrorCode.AUTH_SIGNATURE_INVALID: "Signature verification failed",
    ErrorCode.AUTH_NONCE_INVALID: "Invalid nonce",
    ErrorCode.AUTH_SESSION_REVOKED: "Session revoked, please login again",
    # 资产相关
    ErrorCode.ASSET_NOT_FOUND: "Asset not found",
    ErrorCode.ASSET_SYMBOL_EXISTS: "Asset symbol already exists",
    ErrorCode.ASSET_NOT_AVAILABLE: "Asset is not available for subscription",
    ErrorCode.ASSET_SUPPLY_EXCEEDED: "Subscription amount exceeds remaining supply",
    # 合约绑定相关
    ErrorCode.PROJECT_NO_PRIMARY_CONTRACT: "Project has no primary contract set",
    ErrorCode.PROJECT_NO_CONTRACTS: "No available contracts for project",
    ErrorCode.CONTRACTS_NOT_FOUND: "Specified contracts not found",
    ErrorCode.CONTRACT_ALREADY_BOUND: "Contract is already bound to another asset",
    ErrorCode.CONTRACT_NOT_BOUND: "Contract is not bound",
    ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND: "Contract deployment record not found",
    ErrorCode.PROJECT_NOT_READY: "Project is not ready, cannot bind to Asset",
    ErrorCode.PROJECT_BOUND_CANNOT_MODIFY: "Project is bound to Asset, please unbind first before modifying",
    ErrorCode.PROJECT_ALREADY_HAS_PRIMARY: "Project already has a primary contract, please unset it first",
    ErrorCode.CONTRACT_NOT_PROJECT_SCOPE: "Only PROJECT scope contracts can be set as primary",
    ErrorCode.CONTRACT_NOT_PRIMARY: "Contract is not a primary contract",
    ErrorCode.ADDRESS_PROVIDER_NOT_FOUND: "AddressProvider contract not found or not deployed",
    ErrorCode.CONTRACT_CONFIG_NOT_FOUND: "Contract configuration not found",
    ErrorCode.CONTRACT_NO_PROVIDER_KEY: "No provider key configured for contract",
    ErrorCode.CONTRACT_NOT_DEPLOYED: "Contract is not deployed (no address)",
    ErrorCode.CONTRACT_NOT_REGISTERED: "Contract is not registered in Provider",
    ErrorCode.PROVIDER_REGISTRY_NOT_FOUND: "Provider registry record not found",
    # KYC 相关
    ErrorCode.KYC_NOT_FOUND: "KYC record not found",
    ErrorCode.KYC_ALREADY_PENDING: "KYC application is pending review",
    ErrorCode.KYC_ALREADY_APPROVED: "KYC is already approved",
    ErrorCode.KYC_INVALID_STATUS: "KYC status does not allow this operation",
    ErrorCode.KYC_ALREADY_SYNCED: "KYC is already synced on-chain",
    ErrorCode.KYC_SYNC_NOT_REQUIRED: "On-chain sync not required for this environment",
    ErrorCode.KYC_REQUIRED: "Please complete KYC verification first",
    # 认购相关
    ErrorCode.SUBSCRIPTION_NOT_FOUND: "Subscription record not found",
    ErrorCode.SUBSCRIPTION_MIN_AMOUNT: "Subscription amount is below minimum",
    ErrorCode.SUBSCRIPTION_SUPPLY_EXCEEDED: "Subscription amount exceeds remaining supply",
    ErrorCode.SUBSCRIPTION_CONFLICT: "Subscription conflict, please retry",
    ErrorCode.SUBSCRIPTION_PROCESSING: "Request is being processed, please wait",
    # 环境限制
    ErrorCode.ENV_NOT_ALLOWED: "This operation is not allowed in current environment",
    ErrorCode.ENV_HARDHAT_ONLY: "This operation is only available in Hardhat environment",
    ErrorCode.ENV_DEV_ONLY: "This operation is only available in development environment",
    # 审计相关
    ErrorCode.AUDIT_LOG_IMMUTABLE: "Audit log is immutable",
    ErrorCode.TRANSACTION_AUDIT_IMMUTABLE: "Transaction audit field is immutable",
    # 配置/媒体相关
    ErrorCode.CONFIG_LOAD_ERROR: "Configuration load error",
    ErrorCode.CYCLIC_DEPENDENCY: "Cyclic dependency detected",
    ErrorCode.CONTRACT_VALIDATION_FAILED: "Contract validation failed",
    ErrorCode.MEDIA_UPLOAD_FAILED: "Media upload failed",
    # 通用错误
    ErrorCode.UNKNOWN_ERROR: "Unknown error",
    ErrorCode.VALIDATION_ERROR: "Validation failed",
    ErrorCode.NOT_FOUND: "Resource not found",
    ErrorCode.UNAUTHORIZED: "Unauthorized, please login",
    ErrorCode.FORBIDDEN: "Permission denied",
    ErrorCode.CONFLICT: "Resource conflict",
}
