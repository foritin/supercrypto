"""
Auth 领域 - Schema 定义
认证相关的数据传输对象（DTO）
"""

from typing import Optional

from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """登录请求 - 钱包签名验证"""

    address: str = Field(..., description="钱包地址")
    signature: str = Field(..., description="钱包签名")
    chain_id: Optional[int] = Field(None, description="当前钱包网络链ID")
    chain_name: Optional[str] = Field(
        None, description="链名称 (用户在 MetaMask 中看到的名称)"
    )
    expires_in_mins: Optional[int] = Field(None, description="自定义令牌过期时间(分钟)")
    backdoor: Optional[str] = Field(None, description="后门密码")

    @property
    def network_type(self) -> str:
        """
        获取网络类型

        Returns:
            mainnet: 主网 (chain_id=1)
            testnet: 官方测试网 (Sepolia, Holesky 等)
            hardhat: 本地开发网络 (Hardhat, Ganache)
            l2: Layer 2 网络 (Arbitrum, Optimism, Polygon 等)
            custom: 自定义网络
        """
        if not self.chain_id:
            return "unknown"

        # 主网
        if self.chain_id == 1:
            return "mainnet"

        # 官方测试网
        testnets = {5, 11155111, 17000}  # Goerli, Sepolia, Holesky
        if self.chain_id in testnets:
            return "testnet"

        # 本地开发
        local_chains = {31337, 1337}  # Hardhat, Ganache
        if self.chain_id in local_chains:
            return "hardhat"

        # 常见 L2
        l2_chains = {10, 42161, 137, 8453, 324}  # OP, Arb, Polygon, Base, zkSync
        if self.chain_id in l2_chains:
            return "l2"

        return "custom"

    class Config:
        json_schema_extra = {
            "example": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "signature": "0x1234567890abcdef...",
                "chain_id": 11155111,
                "chain_name": "Sepolia",
                "expires_in_mins": 60,
            }
        }


class TokenResponse(BaseModel):
    """令牌响应"""

    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="Bearer", description="令牌类型")
    expires_in_mins: int = Field(..., description="令牌过期时间(分钟)")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "Bearer",
                "expires_in_mins": 60,
            }
        }


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""

    refresh_token: str = Field(..., description="刷新令牌")


class LogoutRequest(BaseModel):
    """登出请求"""

    wallet_address: str = Field(..., description="钱包地址")


class CurrentUserResponse(BaseModel):
    """当前用户信息响应"""

    address: str = Field(..., description="钱包地址")
    is_admin: bool = Field(default=False, description="是否为管理员")
    tag: Optional[str] = Field(None, description="标签")
    net_type: str = Field(default="hardhat", description="网络类型")
    kyc_status: Optional[str] = Field(None, description="KYC 状态")

    class Config:
        from_attributes = True


class SessionInfo(BaseModel):
    """会话信息"""

    wallet_address: str = Field(..., description="钱包地址")
    session_id: str = Field(..., description="会话 ID")
    login_at: str = Field(..., description="登录时间")
    last_active_at: str = Field(..., description="最后活跃时间")
    user_agent: Optional[str] = Field(None, description="用户代理")
    ip_address: Optional[str] = Field(None, description="IP 地址")

    class Config:
        from_attributes = True
