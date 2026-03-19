""""""

import hashlib
import json

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response

from src.common.adapters import get_async_redis_adapter
from src.common.dependencies import get_contract_service, get_storage_service
from src.schemas import AddressInfo, ChainInfo, InfoResponse
from src.services.contract_service import ContractService
from src.services.storage_service import StorageService

logger = get_logger("business.api.public.info")

router = APIRouter()

# ---- Redis 缓存常量 ----
CACHE_KEY = "platform:info"
CACHE_TTL = 300  # 5 分钟


async def invalidate_info_cache() -> None:
    """
    手动失效 info 缓存（合约部署/更新后调用）

    跨进程/跨 Worker 生效（底层是 Redis DEL）
    """
    async with get_async_redis_adapter() as redis:
        await redis.delete(CACHE_KEY)
    logger.info("info Redis 缓存已手动清除")


def _compute_etag(payload: str) -> str:
    """对 JSON 字符串计算 MD5 作为 ETag"""
    return hashlib.md5(payload.encode()).hexdigest()


def _make_304(etag: str) -> Response:
    return Response(
        status_code=304,
        headers={
            "ETag": f'"{etag}"',
            "Cache-Control": f"public, max-age={CACHE_TTL}",
        },
    )


def _make_json_response(body: str, etag: str) -> JSONResponse:
    """从已序列化的 JSON 字符串构建响应（避免重复序列化）"""
    return JSONResponse(
        content=json.loads(body),
        headers={
            "ETag": f'"{etag}"',
            "Cache-Control": f"public, max-age={CACHE_TTL}",
        },
    )


@router.get(
    "/info",
    summary="获取基础信息",
    description="获取平台的基础信息，如版本号、公告、合约链信息等",
)
async def get_base_info(
    request: Request,
    storage_service: StorageService = Depends(get_storage_service),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    获取基础信息（Redis 缓存 + ETag 支持）

    - **chain_info**: 链配置（chain_id, rpc_url 等）
    - **address_info**: 当前网络活跃合约地址及 ABI
    - Redis 缓存 TTL: 5 分钟（多 Worker 共享）
    - 支持 If-None-Match → 304 Not Modified（节省带宽）
    """
    client_etag = request.headers.get("if-none-match")

    # ---- 1. 尝试 Redis 缓存 ----
    async with get_async_redis_adapter() as redis:
        cached_json = await redis.get(CACHE_KEY)

    if cached_json:
        logger.debug("info 命中 Redis 缓存")
        etag = _compute_etag(cached_json)

        # 客户端已有相同版本 → 304
        if client_etag and client_etag.strip('"') == etag:
            return _make_304(etag)

        return _make_json_response(cached_json, etag)

    # ---- 2. 缓存未命中，重新构建 ----
    chain_info = ChainInfo(
        network=SETTINGS.CHAIN.NETWORK,
        chain_id=SETTINGS.CHAIN.CHAIN_ID,
        rpc_url=SETTINGS.CHAIN.RPC_URL,
        chain_name=SETTINGS.CHAIN.NAME,
    )
    contracts = await contract_service.get_all_contracts()
    address_info = [
        AddressInfo(
            id=c.id,
            scope=c.scope,
            contract_type=c.contract_type,
            status=c.status,
            address=c.address,
            deployer_address=c.deployer_address,
            name=c.name,
            abi_info=list(await storage_service.get_json(c.abi_path) or []),
        )
        for c in contracts
    ]

    # 构建标准响应结构 (与 create_success_response 格式一致)
    response_data = {
        "code": 200,
        "data": {
            "msg": "",
            "list_data": [],
            "object_data": InfoResponse(
                chain_info=chain_info, address_info=address_info
            ).model_dump(),
            "pagination": None,
        },
    }

    # 序列化并写入 Redis
    result_json = json.dumps(response_data, ensure_ascii=False, default=str)
    async with get_async_redis_adapter() as redis:
        await redis.set(CACHE_KEY, result_json, ex=CACHE_TTL)

    etag = _compute_etag(result_json)
    logger.info("info Redis 缓存已刷新（%d 个合约）" % len(address_info))

    # 客户端 ETag 仍可能匹配（缓存刚好过期但数据没变）
    if client_etag and client_etag.strip('"') == etag:
        return _make_304(etag)

    return _make_json_response(result_json, etag)
