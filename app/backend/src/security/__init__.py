"""
共享安全模块

拆分为独立模块以避免循环依赖：
- jwt.py: JWT 令牌管理（无外部依赖）
- wallet.py: 钱包签名验证（仅依赖 web3）
- deps.py: FastAPI 权限依赖（可导入 services/models）
- exceptions.py: 认证异常类型
"""

# JWT 工具
# FastAPI 依赖
from src.security.deps import (
    extract_token_from_header,
    require_admin,
    require_contract_owner,
    require_multisig_signer,
    require_user,
    verify_jwt_and_get_address,
)

# 异常类型
from src.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.security.jwt import (
    REFRESH_TOKEN_COOKIE,
    create_access_token,
    create_refresh_token,
    refresh_tokens,
    verify_token,
)

# 钱包签名
from src.security.wallet import (
    SensitiveOperationRequest,
    create_sensitive_operation_message,
    verify_sensitive_operation_signature,
    verify_wallet_signature,
)

__all__ = [
    # JWT
    "REFRESH_TOKEN_COOKIE",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "refresh_tokens",
    # Wallet
    "verify_wallet_signature",
    "create_sensitive_operation_message",
    "verify_sensitive_operation_signature",
    "SensitiveOperationRequest",
    # Deps
    "extract_token_from_header",
    "verify_jwt_and_get_address",
    "require_user",
    "require_admin",
    "require_multisig_signer",
    "require_contract_owner",
    # Exceptions
    "AccessTokenExpiredException",
    "RefreshTokenExpiredException",
]
