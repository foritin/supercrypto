"""
Contract Domain - Schemas

项目就绪状态与 Asset 绑定相关的响应 Schema 定义
"""

from typing import Optional

from pydantic import BaseModel, Field

# ============ 就绪状态 Schemas ============


class ReadinessDetails(BaseModel):
    """就绪状态详情 - 三个条件的具体状态"""

    all_registered: bool = Field(description="所有合约已注册到 Provider")
    no_missing_deps: bool = Field(description="没有必须依赖未绑定")
    has_primary: bool = Field(description="已设置主合约")


# ============ 绑定状态 Schemas ============


class BoundAssetInfo(BaseModel):
    """绑定的 Asset 信息"""

    asset_id: int = Field(description="资产 ID")
    asset_name: str = Field(description="资产名称")


# ============ 合约操作权限 Schemas ============


class ContractActions(BaseModel):
    """合约操作权限"""

    can_set_primary: bool = Field(description="是否可设为主合约")
    can_unset_primary: bool = Field(description="是否可取消主合约")
    disabled_reason: Optional[str] = Field(None, description="禁用原因")


# ============ Provider 注册/注销 Request Schemas ============


class PrepareRegisterRequest(BaseModel):
    """准备注册请求"""

    contract_name: str
    provider_key: Optional[str] = None
    external_address: Optional[str] = None


class ConfirmRegisterRequest(BaseModel):
    """确认注册请求"""

    contract_name: str
    provider_key: str
    tx_hash: str


class PrepareUnregisterRequest(BaseModel):
    """准备注销请求"""

    contract_name: str
    provider_key: Optional[str] = None


class ConfirmUnregisterRequest(BaseModel):
    """确认注销请求"""

    contract_name: str
    provider_key: str
    tx_hash: str


class ContractAddressUpdateRequest(BaseModel):
    """手动更新合约地址请求"""

    contract_name: str
    address: str


# ============ 合约验证 Schemas ============


class ValidateContractRequest(BaseModel):
    """合约地址验证请求"""

    addresses: list[str] = Field(
        ..., min_length=1, max_length=10, description="要验证的合约地址列表，最多10个"
    )
    check_rwa_binding: bool = Field(
        default=False, description="是否检查 RWA Token 绑定状态"
    )
    rwa_token_name: Optional[str] = Field(
        default=None, description="RWA Token 名称，check_rwa_binding=True 时必填"
    )


class ContractValidationResult(BaseModel):
    """单个合约验证结果"""

    address: str
    format_valid: bool
    exists_on_chain: bool
    message: str


class ValidateContractResponse(BaseModel):
    """合约验证响应"""

    results: dict[str, ContractValidationResult]
    all_valid: bool
    rwa_binding: Optional[dict] = None
