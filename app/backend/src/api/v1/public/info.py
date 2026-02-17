""""""

from falib.utils.config import SETTINGS
from falib.utils.handlers import create_success_response
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends

from src.common.dependencies import get_contract_service, get_storage_service
from src.schemas import ChainInfo, InfoResponse
from src.services.contract_service import ContractService
from src.services.storage_service import StorageService

logger = get_logger("business.api.public.info")

router = APIRouter()


@router.get(
    "/info",
    summary="获取基础信息",
    response_model=InfoResponse,
    description="获取平台的基础信息，如版本号、公告、合约链信息等",
)
async def get_base_info(
    storage_service: StorageService = Depends(get_storage_service),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    获取基础信息

    - **version**: 平台版本号
    - **announcement**: 公告信息
    - **contract_chains**: 支持的合约链列表
    """
    chain_info = ChainInfo(
        network=SETTINGS.CHAIN.NETWORK,
        chain_id=SETTINGS.CHAIN.CHAIN_ID,
        rpc_url=SETTINGS.CHAIN.RPC_URL,
        chain_name=SETTINGS.CHAIN.NAME,
    )
    return create_success_response(base_info)
