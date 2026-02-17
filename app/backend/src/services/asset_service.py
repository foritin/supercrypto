"""
资产领域 - 业务服务层
===================

单一 AssetService 类，通过注释分割线组织方法分区：
- Asset CRUD: 资产增删改查
- Contract Validation: 合约地址验证
- Media Management: 媒体文件管理
- Binding: 项目合约绑定（含未来逻辑下沉占位）
"""

import re
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

import httpx
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from fastapi import UploadFile

from src.common.exceptions import (
    BusinessException,
    FileSizeExceeded,
    InvalidFileType,
    MediaServiceError,
)
from src.common.utils import calculate_total_pages
from src.models import Asset, AssetMedia
from src.models.asset import (
    AssetContractBinding,
    AssetPriceHistory,
    AssetStatus,
    AssetType,
)
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.subscription import Subscription
from src.schemas.asset import (
    AssetCreateRequest,
    AssetDetailResponse,
    AssetListItem,
    AssetPriceHistoryItem,
    AssetUpdateRequest,
    ContractBindingStatus,
    ProjectContractInfo,
    RecentInvestor,
)
from src.schemas.enums import (
    ContractScope,
    ContractStatus,
    ErrorCode,
    MediaType,
)
from src.schemas.enums.subscription import SubscriptionStatus
from src.services.storage_service import StorageService

logger = get_logger("business.asset")


class AssetService:
    """
    资产服务

    合并自原 ContractValidator、MediaService、AssetService 三个类。
    通过注释分割线组织为四个方法分区：
    - Asset CRUD
    - Contract Validation
    - Media Management
    - Binding - 项目合约绑定
    """

    # 合约验证缓存: {address: (exists, timestamp)}
    _validation_cache: dict[str, tuple[bool, float]] = {}
    CACHE_TTL = 300  # 5分钟

    # 以太坊地址正则
    ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")

    def __init__(self):
        self.storage = StorageService()

    @property
    def network(self) -> str:
        """获取当前网络"""
        return SETTINGS.network

    # ============ Asset CRUD ============

    async def list_assets(
        self,
        status: Optional[AssetStatus] = None,
        asset_type: Optional[AssetType] = None,
        page: int = 1,
        page_size: int = 10,
        public_only: bool = False,
    ) -> Tuple[List[AssetListItem], int, int]:
        """
        获取资产列表

        参数:
            status: 状态筛选
            asset_type: 类型筛选
            page: 页码
            page_size: 每页数量
            public_only: 是否只返回可见资产（用于 Public API）

        返回:
            (列表, 总数, 总页数)
        """
        from decimal import Decimal as D

        from tortoise.expressions import Q

        from src.models.asset_media import AssetMedia
        from src.schemas.enums import MediaType

        query = Asset.filter(environment=self.network)

        if status:
            query = query.filter(status=status)
        if asset_type:
            query = query.filter(asset_type=asset_type)

        # 可见性过滤：只返回满足条件的资产
        if public_only:
            zero = D("0")
            query = query.filter(
                Q(contract_address__not_isnull=True)
                & Q(contract_address__not="")
                & (Q(apy_3m__gt=zero) | Q(apy_6m__gt=zero) | Q(apy_12m__gt=zero))
            )

        total = await query.count()
        total_pages = calculate_total_pages(total, page_size)

        offset = (page - 1) * page_size
        assets = await query.order_by("-created_at").offset(offset).limit(page_size)

        # 获取所有资产的主封面图
        asset_ids = [a.id for a in assets]
        cover_images: dict[int, str] = {}  # asset_id -> url

        logo_images: dict[int, str] = {}  # asset_id -> logo presigned url

        if asset_ids:
            # 查询所有资产的主封面图（is_primary=True 且 media_type=COVER）
            primary_covers = await AssetMedia.filter(
                asset_id__in=asset_ids,
                media_type=MediaType.COVER,
                is_primary=True,
            ).all()

            # 查询所有资产的 Logo
            logos = await AssetMedia.filter(
                asset_id__in=asset_ids,
                media_type=MediaType.LOGO,
            ).all()

            # 收集所有需要生成预签名 URL 的文件路径（封面图 + Logo）
            cover_paths = [m.url for m in primary_covers if m.url]
            logo_paths = [m.url for m in logos if m.url]
            all_paths = cover_paths + logo_paths

            if all_paths:
                # 批量生成预签名 URL
                presigned_urls = await self.storage.get_presigned_urls_batch(all_paths)

                # 构建 asset_id -> presigned_url 映射（封面图）
                for media in primary_covers:
                    if media.url and media.url in presigned_urls:
                        cover_images[media.asset_id] = presigned_urls[media.url]

                # 构建 asset_id -> presigned_url 映射（Logo）
                for media in logos:
                    if media.url and media.url in presigned_urls:
                        logo_images[media.asset_id] = presigned_urls[media.url]

        return (
            [
                self._to_list_item(a, cover_images.get(a.id), logo_images.get(a.id))
                for a in assets
            ],
            total,
            total_pages,
        )

    async def get_asset(
        self, asset_id: int, public_only: bool = False
    ) -> Optional[AssetDetailResponse]:
        """
        获取资产详情

        参数:
            asset_id: 资产ID
            public_only: 是否只返回可见资产（用于 Public API）

        返回:
            资产详情或 None
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            return None

        # 可见性检查
        if public_only and not asset.is_visible_to_public:
            return None

        return await self._to_detail_response(asset)

    async def get_asset_by_symbol(
        self, symbol: str, public_only: bool = False
    ) -> Optional[AssetDetailResponse]:
        """
        根据符号获取资产

        参数:
            symbol: 资产符号
            public_only: 是否只返回可见资产（用于 Public API）

        返回:
            资产详情或 None
        """
        asset = await Asset.filter(
            symbol=symbol.upper(), environment=self.network
        ).first()

        if not asset:
            return None

        # 可见性检查
        if public_only and not asset.is_visible_to_public:
            return None

        return await self._to_detail_response(asset)

    async def create_asset(
        self, data: AssetCreateRequest, created_by: Optional[int] = None
    ) -> AssetDetailResponse:
        """
        创建新资产 (管理员)

        参数:
            data: 创建数据
            created_by: 创建人ID

        返回:
            创建的资产详情
        """
        # 检查符号是否已存在
        existing = await Asset.filter(
            symbol=data.symbol.upper(), environment=self.network
        ).first()

        if existing:
            raise BusinessException(
                code=400, message=f"Asset with symbol '{data.symbol}' already exists"
            )

        asset = await Asset.create(
            name=data.name,
            symbol=data.symbol.upper(),
            description=data.description,
            asset_type=data.asset_type,
            image_url=data.image_url,
            document_url=data.document_url,
            location=data.location,
            total_supply=data.total_supply,
            min_subscription=data.min_subscription,
            current_price=data.current_price,
            apy_3m=data.apy_3m,
            apy_6m=data.apy_6m,
            apy_12m=data.apy_12m,
            project=data.project,
            contract_address=data.contract_address,
            environment=self.network,
            created_by=created_by,
            price_updated_at=datetime.now(timezone.utc)
            if data.current_price > 0
            else None,
        )

        # 处理合约绑定
        if data.bound_contracts:
            for binding in data.bound_contracts:
                await AssetContractBinding.create(
                    asset=asset,
                    contract_name=binding.get("contract_name"),
                    contract_address=binding.get("contract_address"),
                    contract_type=binding.get("contract_type", "project"),
                    is_primary=binding.get("is_primary", False),
                )

        # 如果有初始价格，记录价格历史
        if data.current_price > 0:
            await AssetPriceHistory.create(
                asset=asset, price=data.current_price, source="initial"
            )

        return await self._to_detail_response(asset)

    async def update_asset(
        self, asset_id: int, data: AssetUpdateRequest
    ) -> AssetDetailResponse:
        """
        更新资产信息 (管理员)

        参数:
            asset_id: 资产ID
            data: 更新数据

        返回:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 更新非空字段
        update_data = data.model_dump(exclude_unset=True)

        # 如果更新了价格，记录价格历史
        if (
            "current_price" in update_data
            and update_data["current_price"] != asset.current_price
        ):
            await AssetPriceHistory.create(
                asset=asset, price=update_data["current_price"], source="manual_update"
            )
            update_data["price_updated_at"] = datetime.now(timezone.utc)

        # 如果更新符号，检查是否已存在
        if "symbol" in update_data:
            update_data["symbol"] = update_data["symbol"].upper()
            existing = (
                await Asset.filter(
                    symbol=update_data["symbol"], environment=self.network
                )
                .exclude(id=asset_id)
                .first()
            )
            if existing:
                raise BusinessException(
                    code=400,
                    message=f"Asset with symbol '{update_data['symbol']}' already exists",
                )

        # 处理合约绑定更新（如果有）
        if "bound_contracts" in update_data:
            bound_contracts = update_data.pop("bound_contracts")
            if bound_contracts is not None:
                # 删除旧的绑定
                await AssetContractBinding.filter(asset=asset).delete()
                # 创建新的绑定
                for binding in bound_contracts:
                    await AssetContractBinding.create(
                        asset=asset,
                        contract_name=binding.get("contract_name"),
                        contract_address=binding.get("contract_address"),
                        contract_type=binding.get("contract_type", "project"),
                        is_primary=binding.get("is_primary", False),
                    )

        for key, value in update_data.items():
            setattr(asset, key, value)

        await asset.save()

        return await self._to_detail_response(asset)

    async def update_asset_status(
        self, asset_id: int, status: AssetStatus
    ) -> AssetDetailResponse:
        """
        更新资产状态 (管理员)

        参数:
            asset_id: 资产ID
            status: 新状态

        返回:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        asset.status = status
        await asset.save()

        return await self._to_detail_response(asset)

    async def update_price(
        self, asset_id: int, price: Decimal, source: str = "oracle"
    ) -> AssetDetailResponse:
        """
        更新资产价格 (预言机/管理员)

        参数:
            asset_id: 资产ID
            price: 新价格
            source: 价格来源

        返回:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 记录价格历史
        await AssetPriceHistory.create(asset=asset, price=price, source=source)

        asset.current_price = price
        asset.price_updated_at = datetime.now(timezone.utc)
        await asset.save()

        return await self._to_detail_response(asset)

    async def get_price_history(
        self, asset_id: int, limit: int = 50
    ) -> List[AssetPriceHistoryItem]:
        """
        获取资产价格历史

        参数:
            asset_id: 资产ID
            limit: 返回条数

        返回:
            价格历史列表
        """
        history = (
            await AssetPriceHistory.filter(asset_id=asset_id)
            .order_by("-created_at")
            .limit(limit)
        )

        return [
            AssetPriceHistoryItem(
                id=h.id, price=h.price, source=h.source, created_at=h.created_at
            )
            for h in history
        ]

    async def update_subscribed_amount(
        self,
        asset_id: int,
        amount: Decimal,
        is_add: bool = True,
        using_db=None,
    ) -> AssetDetailResponse:
        """
        更新已认购金额 (内部调用)

        参数:
            asset_id: 资产ID
            amount: 金额
            is_add: True=增加, False=减少
            using_db: 可选的数据库连接（用于事务上下文）

        返回:
            更新后的资产详情
        """
        query = Asset.filter(id=asset_id, environment=self.network)
        if using_db:
            query = query.using_db(using_db)
        asset = await query.first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        if is_add:
            new_amount = asset.subscribed_amount + amount
            if new_amount > asset.total_supply:
                raise BusinessException(
                    code=400, message="Subscription amount exceeds total supply"
                )
            asset.subscribed_amount = new_amount

            # 如果已售罄，更新状态
            if asset.subscribed_amount >= asset.total_supply:
                asset.status = AssetStatus.SOLD_OUT
        else:
            new_amount = asset.subscribed_amount - amount
            if new_amount < 0:
                new_amount = Decimal(0)
            asset.subscribed_amount = new_amount

            # 如果从售罄恢复，更新状态
            if asset.status == AssetStatus.SOLD_OUT and new_amount < asset.total_supply:
                asset.status = AssetStatus.ACTIVE

        await asset.save(using_db=using_db)

        return await self._to_detail_response(asset)

    async def delete_asset(self, asset_id: int) -> dict:
        """
        永久删除资产及所有关联数据 (管理员危险操作)

        清理顺序:
        1. 检查是否存在认购记录 (Subscription FK RESTRICT，有认购则拒绝删除)
        2. 删除 MinIO 上的所有媒体文件 (按 assets/{asset_id}/ 前缀清理)
        3. 删除 AssetMedia 记录 (on_delete=CASCADE 会自动处理，但 MinIO 文件需手动删)
        4. 删除 AssetPriceHistory 记录 (on_delete=SET_NULL，手动清理避免孤立数据)
        5. 删除 AssetContractBinding (on_delete=CASCADE 自动)
        6. 删除 AssetFeatures (on_delete=CASCADE 自动)
        7. 删除 Asset 本身

        参数:
            asset_id: 资产ID

        返回:
            删除结果摘要

        异常:
            BusinessException: 资产不存在或有活跃认购记录
        """
        from src.models.asset_media import AssetMedia

        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 1. 检查认购记录 (RESTRICT 约束)
        subscription_count = await Subscription.filter(asset_id=asset_id).count()
        if subscription_count > 0:
            raise BusinessException(
                code=400,
                message=f"Cannot delete asset with {subscription_count} subscription(s). "
                f"Please cancel or close all subscriptions first.",
            )

        asset_name = asset.name
        asset_symbol = asset.symbol

        # 2. 删除 MinIO 文件 (按前缀批量删除)
        deleted_files = 0
        try:
            deleted_files = await self.storage.delete_by_prefix(f"assets/{asset_id}/")
            logger.info(f"Deleted {deleted_files} MinIO files for asset #{asset_id}")
        except Exception as e:
            logger.error(f"Failed to delete MinIO files for asset #{asset_id}: {e}")
            # 不阻断删除流程，继续清理数据库

        # 3. 手动清理 AssetMedia (虽然 CASCADE 会删, 但日志需要计数)
        media_count = await AssetMedia.filter(asset_id=asset_id).count()

        # 4. 清理 AssetPriceHistory (SET_NULL 不会自动删除, 手动清理)
        price_history_count = await AssetPriceHistory.filter(asset_id=asset_id).count()
        if price_history_count > 0:
            await AssetPriceHistory.filter(asset_id=asset_id).delete()

        # 5. 清理 AssetContractBinding (计数用于日志)
        binding_count = await AssetContractBinding.filter(asset_id=asset_id).count()

        # 6. 删除 Asset (会触发 CASCADE 自动删除 AssetMedia, AssetContractBinding, AssetFeatures)
        await asset.delete()

        logger.info(
            f"Asset #{asset_id} '{asset_name}' permanently deleted. "
            f"Cleaned: {deleted_files} files, {media_count} media, "
            f"{price_history_count} price history, {binding_count} bindings"
        )

        return {
            "id": asset_id,
            "name": asset_name,
            "symbol": asset_symbol,
            "deleted_files": deleted_files,
            "deleted_media": media_count,
            "deleted_price_history": price_history_count,
            "deleted_bindings": binding_count,
        }

    def _to_list_item(
        self,
        asset: Asset,
        cover_image_url: Optional[str] = None,
        logo_url: Optional[str] = None,
    ) -> AssetListItem:
        """转换为列表项"""
        return AssetListItem(
            id=asset.id,
            name=asset.name,
            symbol=asset.symbol,
            asset_type=asset.asset_type,
            image_url=asset.image_url,
            cover_image_url=cover_image_url,
            logo_url=logo_url,
            frame_style=getattr(asset, "frame_style", None),
            current_price=asset.current_price,
            apy_3m=asset.apy_3m,
            apy_6m=asset.apy_6m,
            apy_12m=asset.apy_12m,
            status=asset.status,
            total_supply=asset.total_supply,
            subscribed_amount=asset.subscribed_amount,
            subscription_progress=asset.subscription_progress,
            is_available=asset.is_available,
        )

    async def _to_detail_response(
        self, asset: Asset, include_visibility: bool = True
    ) -> AssetDetailResponse:
        """转换为详情响应

        参数:
            asset: 资产实例
            include_visibility: 是否包含可见性信息（Admin API 使用）
        """
        # 获取合约绑定
        bindings = await AssetContractBinding.filter(asset=asset).all()
        bound_contracts = (
            [
                {
                    "contract_name": b.contract_name,
                    "contract_address": b.contract_address,
                    "contract_type": b.contract_type,
                    "is_primary": b.is_primary,
                }
                for b in bindings
            ]
            if bindings
            else None
        )

        # 可见性信息
        is_visible = None
        visibility_issues = None
        if include_visibility:
            is_visible = asset.is_visible_to_public
            visibility_issues = asset.visibility_issues if not is_visible else []

        # 投资者统计 (P2-8)
        # 有效状态：ACTIVE, MATURED, REDEEMED（排除 PENDING 和 CANCELLED）
        valid_statuses = [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.MATURED,
            SubscriptionStatus.REDEEMED,
        ]

        # 统计唯一投资者数量
        investor_count = (
            await Subscription.filter(
                asset_id=asset.id,
                status__in=valid_statuses,
            )
            .distinct()
            .values_list("wallet_address", flat=True)
        )
        unique_investor_count = len(set(investor_count))

        # 获取最近5个投资者（按时间倒序，去重钱包）
        recent_subs = (
            await Subscription.filter(
                asset_id=asset.id,
                status__in=valid_statuses,
            )
            .order_by("-created_at")
            .limit(20)
        )  # 多取一些用于去重

        seen_wallets = set()
        recent_investors = []
        for sub in recent_subs:
            if sub.wallet_address not in seen_wallets and len(recent_investors) < 5:
                seen_wallets.add(sub.wallet_address)
                # 钱包地址脱敏：显示前6位和后4位
                addr = sub.wallet_address
                masked_addr = f"{addr[:6]}...{addr[-4:]}" if len(addr) > 10 else addr
                recent_investors.append(
                    RecentInvestor(
                        wallet_address=masked_addr,
                        amount=float(sub.amount),
                        invested_at=sub.created_at,
                    )
                )

        # 查询 Logo
        from src.models.asset_media import AssetMedia
        from src.schemas.enums import MediaType

        logo_media = await AssetMedia.filter(
            asset_id=asset.id, media_type=MediaType.LOGO
        ).first()
        logo_url = None
        if logo_media and logo_media.url:
            logo_url = await self.storage.get_presigned_url(logo_media.url)

        return AssetDetailResponse(
            id=asset.id,
            name=asset.name,
            symbol=asset.symbol,
            description=asset.description,
            asset_type=asset.asset_type,
            image_url=asset.image_url,
            document_url=asset.document_url,
            location=asset.location,
            logo_url=logo_url,
            frame_style=getattr(asset, "frame_style", None),
            current_price=asset.current_price,
            price_updated_at=asset.price_updated_at,
            total_supply=asset.total_supply,
            subscribed_amount=asset.subscribed_amount,
            min_subscription=asset.min_subscription,
            remaining_amount=asset.remaining_amount,
            subscription_progress=asset.subscription_progress,
            apy_3m=asset.apy_3m,
            apy_6m=asset.apy_6m,
            apy_12m=asset.apy_12m,
            project=asset.project,
            bound_contracts=bound_contracts,
            contract_address=asset.contract_address,
            status=asset.status,
            is_available=asset.is_available,
            environment=asset.environment,
            investor_count=unique_investor_count,
            recent_investors=recent_investors if recent_investors else None,
            is_visible=is_visible,
            visibility_issues=visibility_issues,
            created_at=asset.created_at,
            updated_at=asset.updated_at,
        )

    # ============ Contract Validation ============

    @classmethod
    def validate_address_format(cls, address: str) -> tuple[bool, str]:
        """
        验证以太坊地址格式

        参数:
            address: 合约地址

        返回:
            (is_valid, error_message)
        """
        if not address:
            return False, "地址不能为空"

        if not address.startswith("0x"):
            return False, "地址必须以 0x 开头"

        if len(address) != 42:
            return False, f"地址长度必须为 42 字符（当前 {len(address)}）"

        if not cls.ADDRESS_PATTERN.match(address):
            return False, "地址包含非法字符（只允许 0-9, a-f, A-F）"

        return True, ""

    @classmethod
    def get_validation_cache(cls, address: str) -> Optional[bool]:
        """从缓存获取验证结果"""
        address = address.lower()
        if address in cls._validation_cache:
            exists, timestamp = cls._validation_cache[address]
            if time.time() - timestamp < cls.CACHE_TTL:
                return exists
            else:
                del cls._validation_cache[address]
        return None

    @classmethod
    def set_validation_cache(cls, address: str, exists: bool):
        """设置验证缓存"""
        cls._validation_cache[address.lower()] = (exists, time.time())

    @classmethod
    async def validate_contract_exists(
        cls,
        address: str,
        use_cache: bool = True,
    ) -> tuple[bool, str]:
        """
        链上验证合约存在

        参数:
            address: 合约地址
            use_cache: 是否使用缓存

        返回:
            (exists, message)
        """
        # 先验证格式
        is_valid, error = cls.validate_address_format(address)
        if not is_valid:
            return False, error

        # 检查缓存
        if use_cache:
            cached = cls.get_validation_cache(address)
            if cached is not None:
                logger.debug(f"使用缓存的验证结果: {address} -> {cached}")
                return cached, "合约存在" if cached else "该地址不是合约地址（缓存）"

        # 链上验证 - 使用 JSON-RPC eth_getCode
        try:
            rpc_url = SETTINGS.CRYPTO.MAINNET_URL

            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_getCode",
                    "params": [address, "latest"],
                    "id": 1,
                }
                response = await client.post(rpc_url, json=payload)
                result = response.json()

                if "error" in result:
                    return (
                        False,
                        f"RPC 错误: {result['error'].get('message', 'unknown')}",
                    )

                code = result.get("result", "0x")

                # 判断是否是合约
                # 如果返回 '0x' 或空，说明不是合约（是 EOA 或不存在）
                if code in ("0x", "", None):
                    cls.set_validation_cache(address, False)
                    return False, "该地址不是合约地址（无合约代码）"

                cls.set_validation_cache(address, True)
                return True, "合约存在"

        except httpx.TimeoutException:
            return False, "链上验证超时"
        except Exception as e:
            logger.error(f"链上验证失败: {address}, error: {e}")
            return False, f"链上验证失败: {str(e)}"

    @classmethod
    async def validate_contracts_batch(
        cls,
        addresses: list[str],
    ) -> dict[str, tuple[bool, str]]:
        """
        批量验证合约

        参数:
            addresses: 地址列表

        返回:
            {address: (exists, message)}
        """
        results = {}
        for address in addresses:
            exists, message = await cls.validate_contract_exists(address)
            results[address] = (exists, message)
        return results

    @classmethod
    def clear_validation_cache(cls):
        """清空验证缓存"""
        cls._validation_cache.clear()

    @classmethod
    async def validate_rwa_token_binding(
        cls,
        contract_addresses: list[str],
        rwa_token_name: str = "VankeRWAToken",
    ) -> tuple[bool, str, Optional[str]]:
        """
        验证合约绑定是否包含 RWA Token

        参数:
            contract_addresses: 绑定的合约地址列表
            rwa_token_name: RWA Token 合约名称

        返回:
            (has_rwa_token, message, rwa_token_address)
        """
        from src.models import Contract

        if not contract_addresses:
            return False, "未绑定任何合约", None

        # 查询绑定的合约中是否有 RWA Token
        for address in contract_addresses:
            contract = await Contract.filter(
                address__iexact=address,
                name__icontains="RWAToken",
            ).first()

            if contract:
                return True, f"已绑定 RWA Token: {contract.name}", address

        return False, "未绑定 RWA Token 合约（必需）", None

    # ============ Media Management ============

    async def get_presigned_url(self, file_path: str, expires: int = 3600) -> str:
        """
        获取文件的预签名临时访问 URL

        参数:
            file_path: 文件相对路径
            expires: 过期时间（秒），默认 1 小时

        返回:
            预签名的临时访问 URL
        """
        return await self.storage.get_presigned_url(file_path, expires)

    async def get_presigned_urls_batch(
        self, file_paths: list[str], expires: int = 3600
    ) -> dict[str, str]:
        """
        批量获取文件的预签名临时访问 URL（复用连接）

        参数:
            file_paths: 文件相对路径列表
            expires: 过期时间（秒），默认 1 小时

        返回:
            {原始路径: 预签名URL} 的字典
        """
        return await self.storage.get_presigned_urls_batch(file_paths, expires)

    async def upload_media(
        self,
        asset_id: int,
        file: UploadFile,
        media_type: MediaType,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> AssetMedia:
        """
        上传媒体文件

        参数:
            asset_id: 资产 ID
            file: 上传的文件
            media_type: 媒体类型
            title: 标题
            description: 描述

        返回:
            创建的 AssetMedia 实例

        异常:
            MediaServiceError: 上传失败
            FileSizeExceeded: 文件大小超出限制
            InvalidFileType: 不支持的文件类型
        """
        # 检查资产是否存在
        asset = await Asset.filter(id=asset_id).first()
        if not asset:
            raise MediaServiceError(f"资产 {asset_id} 不存在")

        # Logo 数量限制：每个资产最多 1 张
        if media_type == MediaType.LOGO:
            existing_logo_count = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.LOGO
            ).count()
            if existing_logo_count >= 1:
                raise MediaServiceError("每个资产最多只能上传 1 张 Logo")

        # 上传文件到存储
        try:
            url = await self.storage.upload_file(
                file=file,
                asset_id=asset_id,
                category=media_type.value,
                filename=file.filename,
            )
        except (FileSizeExceeded, InvalidFileType):
            raise
        except Exception as e:
            logger.error(f"文件上传失败: {e}")
            raise MediaServiceError(f"文件上传失败: {e}")

        # 获取当前最大排序号
        max_order = (
            await AssetMedia.filter(asset_id=asset_id, media_type=media_type)
            .order_by("-sort_order")
            .first()
        )
        next_order = (max_order.sort_order + 1) if max_order else 0

        # 如果是封面图且是第一张，自动设为主图
        is_primary = False
        if media_type == MediaType.COVER:
            existing = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.COVER
            ).count()
            is_primary = existing == 0

        # 创建媒体记录
        media = await AssetMedia.create(
            asset_id=asset_id,
            media_type=media_type,
            title=title or file.filename,
            description=description,
            url=url,
            file_name=file.filename,
            file_size=file.size,
            mime_type=file.content_type,
            sort_order=next_order,
            is_primary=is_primary,
        )

        logger.info(
            f"媒体上传成功: asset_id={asset_id}, media_id={media.id}, type={media_type.value}"
        )
        return media

    async def upload_media_batch(
        self,
        asset_id: int,
        files: list[UploadFile],
        media_type: MediaType,
    ) -> list[tuple[bool, AssetMedia | None, str | None]]:
        """
        批量上传媒体文件（复用连接）

        参数:
            asset_id: 资产 ID
            files: 上传的文件列表
            media_type: 媒体类型

        返回:
            列表，每个元素为 (success, media, error_msg)
        """
        if not files:
            return []

        # 检查资产是否存在
        asset = await Asset.filter(id=asset_id).first()
        if not asset:
            raise MediaServiceError(f"资产 {asset_id} 不存在")

        # Logo 数量限制：每个资产最多 1 张
        if media_type == MediaType.LOGO:
            existing_logo_count = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.LOGO
            ).count()
            if existing_logo_count >= 1:
                raise MediaServiceError("每个资产最多只能上传 1 张 Logo")

        # 获取当前最大排序号
        max_order_record = (
            await AssetMedia.filter(asset_id=asset_id, media_type=media_type)
            .order_by("-sort_order")
            .first()
        )
        next_order = (max_order_record.sort_order + 1) if max_order_record else 0

        # 检查是否需要设置主图（仅封面图）
        existing_cover_count = 0
        if media_type == MediaType.COVER:
            existing_cover_count = await AssetMedia.filter(
                asset_id=asset_id, media_type=MediaType.COVER
            ).count()

        results: list[tuple[bool, AssetMedia | None, str | None]] = []

        # 预处理文件：验证并读取内容
        prepared_files: list[tuple[UploadFile, bytes, int]] = []
        for file in files:
            try:
                # 验证文件
                file_size, _ = self.storage.validate_file(
                    file, media_type.value, file.content_type
                )
                # 读取内容
                content = await file.read()
                prepared_files.append((file, content, file_size))
            except (FileSizeExceeded, InvalidFileType) as e:
                results.append((False, None, str(e)))

        if not prepared_files:
            return results

        # 使用单个连接上传所有文件
        from src.common.adapters import get_async_minio_adapter

        async with get_async_minio_adapter() as minio:
            for file, content, file_size in prepared_files:
                try:
                    # 生成文件路径
                    file_path = self.storage.generate_file_path(
                        asset_id, media_type.value, file.filename
                    )

                    # 上传到 MinIO
                    await minio.put_object(self.storage.bucket, file_path, content)
                    url = self.storage.get_file_url(file_path)

                    logger.info(
                        f"File uploaded to MinIO: {file_path} ({file_size} bytes)"
                    )

                    # 确定是否为主图
                    is_primary = False
                    if media_type == MediaType.COVER and existing_cover_count == 0:
                        is_primary = True
                        existing_cover_count += 1

                    # 创建媒体记录
                    media = await AssetMedia.create(
                        asset_id=asset_id,
                        media_type=media_type,
                        title=file.filename,
                        url=url,
                        file_name=file.filename,
                        file_size=file.size,
                        mime_type=file.content_type,
                        sort_order=next_order,
                        is_primary=is_primary,
                    )
                    next_order += 1

                    logger.info(
                        f"媒体上传成功: asset_id={asset_id}, media_id={media.id}, type={media_type.value}"
                    )
                    results.append((True, media, None))

                except Exception as e:
                    logger.error(f"文件上传失败: {e}")
                    results.append((False, None, str(e)))

        return results

    async def delete_media_batch(
        self, asset_id: int, media_ids: list[int]
    ) -> list[tuple[int, bool, str | None]]:
        """
        批量删除媒体文件（复用连接）

        参数:
            asset_id: 资产 ID
            media_ids: 媒体 ID 列表

        返回:
            列表，每个元素为 (media_id, success, error_msg)
        """
        if not media_ids:
            return []

        # 查询所有媒体记录
        media_list = await AssetMedia.filter(id__in=media_ids, asset_id=asset_id).all()
        media_map = {m.id: m for m in media_list}

        results: list[tuple[int, bool, str | None]] = []

        # 收集需要删除的文件路径
        files_to_delete: list[tuple[int, str, AssetMedia]] = []
        for media_id in media_ids:
            if media_id not in media_map:
                results.append(
                    (media_id, False, f"媒体 {media_id} 不存在或不属于资产 {asset_id}")
                )
            else:
                media = media_map[media_id]
                if media.url:
                    files_to_delete.append((media_id, media.url, media))
                else:
                    # 没有 URL 的直接删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))
                    logger.info(
                        f"媒体删除成功: asset_id={asset_id}, media_id={media_id}"
                    )

        if not files_to_delete:
            return results

        # 使用单个连接删除所有文件
        from src.common.adapters import get_async_minio_adapter

        async with get_async_minio_adapter() as minio:
            for media_id, file_path, media in files_to_delete:
                try:
                    # 移除开头的斜杠
                    object_path = (
                        file_path[1:] if file_path.startswith("/") else file_path
                    )
                    await minio.remove_object(self.storage.bucket, object_path)
                    logger.info(f"File deleted from MinIO: {object_path}")

                    # 删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))
                    logger.info(
                        f"媒体删除成功: asset_id={asset_id}, media_id={media_id}"
                    )

                except Exception as e:
                    logger.warning(f"删除存储文件失败: {e}，继续删除数据库记录")
                    # 即使存储删除失败，也删除数据库记录
                    await media.delete()
                    results.append((media_id, True, None))

        return results

    async def update_media(
        self,
        asset_id: int,
        media_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_primary: Optional[bool] = None,
    ) -> AssetMedia:
        """
        更新媒体信息

        参数:
            asset_id: 资产 ID
            media_id: 媒体 ID
            title: 新标题
            description: 新描述
            is_primary: 是否设为主图

        返回:
            更新后的 AssetMedia 实例
        """
        media = await AssetMedia.filter(id=media_id, asset_id=asset_id).first()
        if not media:
            raise MediaServiceError(f"媒体 {media_id} 不存在或不属于资产 {asset_id}")

        # 更新字段
        if title is not None:
            media.title = title
        if description is not None:
            media.description = description

        # 处理主图设置
        if is_primary is not None and is_primary:
            # 取消同类型其他主图
            await (
                AssetMedia.filter(
                    asset_id=asset_id,
                    media_type=media.media_type,
                    is_primary=True,
                )
                .exclude(id=media_id)
                .update(is_primary=False)
            )
            media.is_primary = True
        elif is_primary is False:
            media.is_primary = False

        await media.save()

        logger.info(f"媒体更新成功: asset_id={asset_id}, media_id={media_id}")
        return media

    async def reorder_media(
        self,
        asset_id: int,
        media_ids: list[int],
    ) -> list[AssetMedia]:
        """
        批量排序媒体

        参数:
            asset_id: 资产 ID
            media_ids: 按新顺序排列的媒体 ID 列表

        返回:
            排序后的媒体列表
        """
        # 验证所有媒体都属于该资产
        existing = await AssetMedia.filter(
            asset_id=asset_id, id__in=media_ids
        ).values_list("id", flat=True)

        if len(existing) != len(media_ids):
            raise MediaServiceError("部分媒体不存在或不属于该资产")

        # 批量更新排序
        for order, media_id in enumerate(media_ids):
            await AssetMedia.filter(id=media_id).update(sort_order=order)

        # 返回排序后的列表
        return (
            await AssetMedia.filter(asset_id=asset_id, id__in=media_ids)
            .order_by("sort_order")
            .all()
        )

    async def list_media(
        self,
        asset_id: int,
        media_type: Optional[MediaType] = None,
    ) -> list[AssetMedia]:
        """
        获取资产的媒体列表

        参数:
            asset_id: 资产 ID
            media_type: 可选，按类型筛选

        返回:
            媒体列表
        """
        query = AssetMedia.filter(asset_id=asset_id)

        if media_type:
            query = query.filter(media_type=media_type)

        return await query.order_by("media_type", "sort_order").all()

    async def get_media_stats(self, asset_id: int) -> dict:
        """
        获取资产的媒体统计

        参数:
            asset_id: 资产 ID

        返回:
            各类型媒体数量统计
        """
        from tortoise.functions import Count

        stats = (
            await AssetMedia.filter(asset_id=asset_id)
            .group_by("media_type")
            .annotate(count=Count("id"))
            .values("media_type", "count")
        )

        # 转换为字典
        return {s["media_type"]: s["count"] for s in stats}

    # ============ Media API Workflows ============

    async def list_media_with_urls(
        self,
        asset_id: int,
        media_type: Optional["MediaType"] = None,
    ) -> list[dict]:
        """
        获取资产媒体列表并转换为带预签名 URL 的响应格式

        参数:
            asset_id: 资产 ID
            media_type: 可选，按类型筛选

        返回:
            带预签名 URL 的媒体字典列表
        """
        from src.schemas.asset_media import MediaListResponse

        media_list = await self.list_media(asset_id, media_type)
        file_paths = [m.url for m in media_list if m.url]
        presigned_urls = (
            await self.get_presigned_urls_batch(file_paths) if file_paths else {}
        )

        result = []
        for m in media_list:
            data = MediaListResponse.model_validate(m).model_dump()
            if m.url and m.url in presigned_urls:
                data["url"] = presigned_urls[m.url]
            result.append(data)
        return result

    async def handle_upload_media_batch(
        self,
        asset_id: int,
        files: list[UploadFile],
        media_type: "MediaType",
    ) -> dict:
        """
        处理批量上传媒体的完整工作流：上传 → 结果处理 → 预签名 URL 转换

        参数:
            asset_id: 资产 ID
            files: 上传的文件列表
            media_type: 媒体类型

        返回:
            MediaBatchUploadResponse 格式的字典
        """
        from src.schemas.asset_media import (
            MediaBatchUploadResponse,
            MediaBatchUploadResult,
            MediaUploadResponse,
        )

        upload_results = await self.upload_media_batch(
            asset_id=asset_id,
            files=files,
            media_type=media_type,
        )

        results: list[MediaBatchUploadResult] = []
        success_count = 0
        failed_count = 0
        success_media: list[tuple[int, object]] = []

        for i, (success, media, error) in enumerate(upload_results):
            file_name = files[i].filename if i < len(files) else "unknown"
            if success and media:
                success_media.append((i, media))
                success_count += 1
            else:
                results.append(
                    MediaBatchUploadResult(
                        success=False,
                        file_name=file_name or "unknown",
                        error=error,
                    )
                )
                failed_count += 1

        if success_media:
            file_paths = [m.url for _, m in success_media if m.url]
            presigned_urls = (
                await self.get_presigned_urls_batch(file_paths) if file_paths else {}
            )
            for idx, media in success_media:
                file_name = files[idx].filename if idx < len(files) else "unknown"
                resp_data = MediaUploadResponse.model_validate(media).model_dump()
                if media.url and media.url in presigned_urls:
                    resp_data["url"] = presigned_urls[media.url]
                results.append(
                    MediaBatchUploadResult(
                        success=True,
                        file_name=file_name or "unknown",
                        media=MediaUploadResponse(**resp_data),
                    )
                )

        response = MediaBatchUploadResponse(
            total=len(files),
            success_count=success_count,
            failed_count=failed_count,
            results=results,
        )
        return response.model_dump(), success_count, failed_count

    async def handle_delete_media_batch(
        self,
        asset_id: int,
        media_ids: list[int],
    ) -> dict:
        """
        处理批量删除媒体的完整工作流：删除 → 结果处理

        参数:
            asset_id: 资产 ID
            media_ids: 媒体 ID 列表

        返回:
            (response_dict, success_count, failed_count)
        """
        from src.schemas.asset_media import (
            MediaBatchDeleteResponse,
            MediaBatchDeleteResult,
        )

        delete_results = await self.delete_media_batch(asset_id, media_ids)
        results: list[MediaBatchDeleteResult] = []
        success_count = 0
        failed_count = 0

        for media_id, success, error in delete_results:
            results.append(
                MediaBatchDeleteResult(
                    media_id=media_id,
                    success=success,
                    error=error,
                )
            )
            if success:
                success_count += 1
            else:
                failed_count += 1

        response = MediaBatchDeleteResponse(
            total=len(media_ids),
            success_count=success_count,
            failed_count=failed_count,
            results=results,
        )
        return response.model_dump(), success_count, failed_count

    async def update_media_with_url(
        self,
        asset_id: int,
        media_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_primary: Optional[bool] = None,
    ) -> dict:
        """
        更新媒体信息并返回带预签名 URL 的响应

        参数:
            asset_id: 资产 ID
            media_id: 媒体 ID
            title: 新标题
            description: 新描述
            is_primary: 是否设为主图

        返回:
            带预签名 URL 的媒体响应字典
        """
        from src.schemas.asset_media import MediaUploadResponse

        media = await self.update_media(
            asset_id=asset_id,
            media_id=media_id,
            title=title,
            description=description,
            is_primary=is_primary,
        )
        response_data = MediaUploadResponse.model_validate(media).model_dump()
        if media.url:
            response_data["url"] = await self.get_presigned_url(media.url)
        return response_data

    async def reorder_media_with_urls(
        self,
        asset_id: int,
        media_ids: list[int],
    ) -> list[dict]:
        """
        批量排序媒体并返回带预签名 URL 的响应

        参数:
            asset_id: 资产 ID
            media_ids: 按新顺序排列的媒体 ID 列表

        返回:
            带预签名 URL 的媒体字典列表
        """
        from src.schemas.asset_media import MediaListResponse

        media_list = await self.reorder_media(asset_id, media_ids)
        file_paths = [m.url for m in media_list if m.url]
        presigned_urls = (
            await self.get_presigned_urls_batch(file_paths) if file_paths else {}
        )

        result = []
        for m in media_list:
            data = MediaListResponse.model_validate(m).model_dump()
            if m.url and m.url in presigned_urls:
                data["url"] = presigned_urls[m.url]
            result.append(data)
        return result

    # ============ Binding - 项目合约绑定 ============

    async def get_available_projects(self) -> list[ProjectContractInfo]:
        """
        获取可绑定的项目列表（含主合约和就绪状态）

        变更 (Requirements 3.1, 3.2, 7.3, 7.4, 7.7):
        1. 返回 has_primary: 是否有主合约
        2. 返回 primary_contract_symbol: 主合约 Symbol
        3. 返回 is_ready: 项目是否就绪（有主合约 + 所有合约已部署）

        返回:
            项目列表，每个项目包含合约数量、详细合约信息、主合约信息和就绪状态
        """
        # 查询所有活跃的合约 (使用 ContractDeployment 模型)
        contracts = await ContractDeployment.filter(status=ContractStatus.ACTIVE).all()

        # 查询所有已绑定的 PROJECT 合约
        all_bindings = await AssetContractBinding.all().prefetch_related("asset")

        # 构建已绑定合约的映射 {contract_address: (asset_name, asset_id)}
        bound_map: dict[str, tuple[str, int]] = {}
        for binding in all_bindings:
            bound_map[binding.contract_address] = (binding.asset.name, binding.asset.id)

        # 按项目分组，同时记录主合约信息
        project_map: dict[str, list[ContractBindingStatus]] = {}
        project_primary_map: dict[str, ContractDeployment] = {}

        for record in contracts:
            if record.project_name not in project_map:
                project_map[record.project_name] = []

            # 检查是否可绑定
            is_available = True
            bound_to_asset = None
            bound_to_asset_id = None

            # PROJECT scope 合约检查是否已被绑定
            if record.scope == ContractScope.PROJECT:
                if record.address in bound_map:
                    is_available = False
                    bound_to_asset, bound_to_asset_id = bound_map[record.address]
            # GLOBAL scope 合约始终可绑定

            project_map[record.project_name].append(
                ContractBindingStatus(
                    contract_name=record.name,
                    contract_address=record.address,
                    contract_type=record.contract_type.value,
                    is_available=is_available,
                    bound_to_asset=bound_to_asset,
                    bound_to_asset_id=bound_to_asset_id,
                )
            )

            # 记录主合约 (Requirements 3.1, 3.2)
            if record.is_primary:
                project_primary_map[record.project_name] = record

        # 转换为响应格式
        result: list[ProjectContractInfo] = []
        for project, contracts_list in sorted(project_map.items()):
            # 获取主合约信息
            primary_contract = project_primary_map.get(project)
            has_primary = primary_contract is not None
            primary_contract_symbol = (
                primary_contract.symbol if primary_contract else None
            )

            # 获取项目就绪状态 (Requirements 7.3, 7.4, 7.7)
            # 就绪条件：有主合约 + 所有合约已部署
            is_ready = has_primary and all(c.contract_address for c in contracts_list)

            result.append(
                ProjectContractInfo(
                    project=project,
                    contract_count=len(contracts_list),
                    contracts=sorted(contracts_list, key=lambda c: c.contract_name),
                    has_primary=has_primary,
                    primary_contract_symbol=primary_contract_symbol,
                    is_ready=is_ready,
                )
            )

        return result

    async def bind_project_contracts(
        self,
        asset_id: int,
        project: str,
        primary_contract: ContractDeployment,
        project_contracts: list[ContractDeployment],
        contract_names: list[str] | None = None,
    ) -> AssetDetailResponse:
        """
        按项目绑定合约（简化版）

        变更 (Requirements 2.1-2.6):
        1. 只绑定 PROJECT scope 合约（不绑定 GLOBAL scope）
        2. 检查项目是否有主合约（is_primary=True）
        3. 自动从主合约获取 symbol 和 address 填充到 Asset

        参数:
            asset_id: 资产ID
            project: 项目标识
            primary_contract: 预获取的主合约部署记录
            project_contracts: 预获取的项目合约部署记录列表
            contract_names: 要绑定的合约名称列表，为空则绑定该项目下所有可用的 PROJECT scope 合约

        返回:
            更新后的资产详情

        异常:
            BusinessException: 资产不存在、合约已被绑定等错误
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(
                code=404,
                error_code=ErrorCode.ASSET_NOT_FOUND,
            )

        contracts = project_contracts

        if not contracts:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_NO_CONTRACTS,
                detail={"project": project},
            )

        # 如果指定了合约名称，只绑定这些合约
        if contract_names:
            contracts = [r for r in contracts if r.name in contract_names]
            if not contracts:
                raise BusinessException(
                    code=400,
                    error_code=ErrorCode.CONTRACTS_NOT_FOUND,
                )

        # 批量检查 PROJECT scope 合约是否已被其他资产绑定
        exclusive_addresses = [r.address for r in contracts]
        if exclusive_addresses:
            existing_bindings = (
                await AssetContractBinding.filter(
                    contract_address__in=exclusive_addresses
                )
                .prefetch_related("asset")
                .all()
            )

            for binding in existing_bindings:
                if binding.asset.id != asset_id:
                    # 找到对应的合约名称
                    contract_name = next(
                        (
                            r.name
                            for r in contracts
                            if r.address == binding.contract_address
                        ),
                        binding.contract_address,
                    )
                    raise BusinessException(
                        code=400,
                        error_code=ErrorCode.CONTRACT_ALREADY_BOUND,
                        detail={
                            "contract_name": contract_name,
                            "bound_asset_name": binding.asset.name,
                        },
                    )

        # 批量查询当前资产已存在的绑定
        existing_bindings = await AssetContractBinding.filter(
            asset=asset, contract_name__in=[r.name for r in contracts]
        ).all()
        existing_map = {b.contract_name: b for b in existing_bindings}

        # 批量创建/更新绑定 (只绑定 PROJECT scope 合约)
        for record in contracts:
            # 判断是否为主合约
            is_primary_binding = record.id == primary_contract.id

            existing = existing_map.get(record.name)

            if existing:
                # 如果已存在，更新地址和主合约标记
                existing.contract_address = record.address
                existing.contract_type = "project"
                existing.is_primary = is_primary_binding
                await existing.save()
            else:
                # 创建新绑定
                await AssetContractBinding.create(
                    asset=asset,
                    contract_name=record.name,
                    contract_address=record.address,
                    contract_type="project",
                    is_primary=is_primary_binding,
                )

        # 更新资产字段 (Requirements 2.5, 2.6)
        # 1. 更新 project 字段
        asset.project = project
        # 2. 从主合约获取 symbol 填充到 Asset.symbol
        if primary_contract.symbol:
            asset.symbol = primary_contract.symbol
        # 3. 从主合约获取 address 填充到 Asset.contract_address
        asset.contract_address = primary_contract.address
        await asset.save()

        return await self._to_detail_response(asset)

    async def unbind_contracts(
        self,
        asset_id: int,
        contract_names: list[str] | None = None,
        project: str | None = None,
        unbind_all: bool = False,
    ) -> AssetDetailResponse:
        """
        解绑合约

        参数:
            asset_id: 资产ID
            contract_names: 要解绑的合约名称列表（可选）
            project: 要解绑的项目标识（可选）
            unbind_all: 是否解绑所有合约

        返回:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.network).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        if unbind_all:
            # 解绑所有合约
            await AssetContractBinding.filter(asset=asset).delete()
            # 清空资产的项目和主合约信息
            asset.project = None
            asset.contract_address = None
            await asset.save()
        elif contract_names:
            # 解绑指定的合约
            await AssetContractBinding.filter(
                asset=asset, contract_name__in=contract_names
            ).delete()

            # 检查主合约是否被解绑
            primary_binding = await AssetContractBinding.filter(
                asset=asset, is_primary=True
            ).first()
            if not primary_binding:
                asset.contract_address = None
                await asset.save()

            # 检查是否还有绑定，如果没有则清空项目字段
            remaining = await AssetContractBinding.filter(asset=asset).count()
            if remaining == 0:
                asset.project = None
                await asset.save()
        elif project:
            # 解绑指定项目的合约
            # 先获取该项目的合约名称列表
            contracts = await ContractDeployment.filter(project_name=project).all()
            names_to_unbind = [r.name for r in contracts]

            if names_to_unbind:
                await AssetContractBinding.filter(
                    asset=asset, contract_name__in=names_to_unbind
                ).delete()

            # 如果解绑的是资产当前绑定的项目，清空项目字段
            if asset.project == project:
                asset.project = None
                # 检查主合约是否被解绑
                primary_binding = await AssetContractBinding.filter(
                    asset=asset, is_primary=True
                ).first()
                if not primary_binding:
                    asset.contract_address = None
                await asset.save()
        else:
            raise BusinessException(
                code=400,
                message="Must specify 'contract_names', 'project', or 'unbind_all=true'",
            )

        return await self._to_detail_response(asset)

    async def check_binding_readiness(
        self,
        project: str,
    ) -> dict:
        """
        检查项目绑定就绪状态

        承接 admin/assets/binding.py 路由中的就绪性检查逻辑。
        （占位方法，逻辑将在 Task 11.3 下沉时填充）

        参数:
            project: 项目标识

        返回:
            就绪状态信息
        """
        # TODO: Task 11.3 将从 admin/assets/binding.py 下沉就绪性检查逻辑
        pass

    async def get_binding_status(
        self,
        asset_id: int,
    ) -> dict:
        """
        获取资产的合约绑定状态

        承接 admin/assets/binding.py 路由中的绑定状态查询逻辑。
        （占位方法，逻辑将在 Task 11.3 下沉时填充）

        参数:
            asset_id: 资产 ID

        返回:
            绑定状态信息
        """
        # TODO: Task 11.3 将从 admin/assets/binding.py 下沉绑定状态查询逻辑
        pass
