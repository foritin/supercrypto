"""
认证异常类型
"""

from src.common.exceptions import UnauthorizedException


class AccessTokenExpiredException(UnauthorizedException):
    """Access Token 过期异常 - 前端应使用 refresh token 刷新"""

    def __init__(self):
        super().__init__("access_token_expired")


class RefreshTokenExpiredException(UnauthorizedException):
    """Refresh Token 过期异常 - 前端应断开 MetaMask 并重新登录"""

    def __init__(self):
        super().__init__("refresh_token_expired")
