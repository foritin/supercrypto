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
