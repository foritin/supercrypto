"""
Contract Service Schemas
合约服务数据模型
"""

from typing import Optional

from pydantic import BaseModel


class ProviderSyncRequest(BaseModel):
    """
    Provider 同步请求
    """

    network: Optional[str] = None


class ManualRegistryUpdateRequest(BaseModel):
    """
    手动更新注册表请求
    """

    contract_name: str
    address: str
    network: Optional[str] = None
