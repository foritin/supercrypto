"""
Asset Domain - Business Service
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS

from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetDetailResponse,
    AssetListItem,
    AssetPriceHistoryItem,
    AssetUpdateRequest,
    ProjectContractInfo,
)
from src.models.asset import (
    Asset,
    AssetContractBinding,
    AssetPriceHistory,
    AssetStatus,
    AssetType,
)
from src.models.deploy import DeployInfo
from src.shared.common.exceptions import BusinessException


class AssetService:
    """资产服务"""

    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.wallet

    async def list_assets(
        self,
        status: Optional[AssetStatus] = None,
        asset_type: Optional[AssetType] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[AssetListItem], int, int]:
        """
        获取资产列表

        Args:
            status: 状态筛选
            asset_type: 类型筛选
            page: 页码
            page_size: 每页数量

        Returns:
            (列表, 总数, 总页数)
        """
        query = Asset.filter(environment=self.environment)

        if status:
            query = query.filter(status=status)
        if asset_type:
            query = query.filter(asset_type=asset_type)

        total = await query.count()
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        assets = await query.order_by("-created_at").offset(offset).limit(page_size)

        return ([self._to_list_item(a) for a in assets], total, total_pages)

    async def get_asset(self, asset_id: int) -> Optional[AssetDetailResponse]:
        """
        获取资产详情

        Args:
            asset_id: 资产ID

        Returns:
            资产详情或 None
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

        if not asset:
            return None

        return await self._to_detail_response(asset)

    async def get_asset_by_symbol(self, symbol: str) -> Optional[AssetDetailResponse]:
        """
        根据符号获取资产

        Args:
            symbol: 资产符号

        Returns:
            资产详情或 None
        """
        asset = await Asset.filter(
            symbol=symbol.upper(), environment=self.environment
        ).first()

        if not asset:
            return None

        return await self._to_detail_response(asset)

    async def create_asset(
        self, data: AssetCreateRequest, created_by: Optional[int] = None
    ) -> AssetDetailResponse:
        """
        创建新资产 (管理员)

        Args:
            data: 创建数据
            created_by: 创建人ID

        Returns:
            创建的资产详情
        """
        # 检查符号是否已存在
        existing = await Asset.filter(
            symbol=data.symbol.upper(), environment=self.environment
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
            environment=self.environment,
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

        Args:
            asset_id: 资产ID
            data: 更新数据

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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
                    symbol=update_data["symbol"], environment=self.environment
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

        Args:
            asset_id: 资产ID
            status: 新状态

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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

        Args:
            asset_id: 资产ID
            price: 新价格
            source: 价格来源

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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

        Args:
            asset_id: 资产ID
            limit: 返回条数

        Returns:
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
        self, asset_id: int, amount: Decimal, is_add: bool = True
    ) -> AssetDetailResponse:
        """
        更新已认购金额 (内部调用)

        Args:
            asset_id: 资产ID
            amount: 金额
            is_add: True=增加, False=减少

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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

        await asset.save()

        return await self._to_detail_response(asset)

    def _to_list_item(self, asset: Asset) -> AssetListItem:
        """转换为列表项"""
        return AssetListItem(
            id=asset.id,
            name=asset.name,
            symbol=asset.symbol,
            asset_type=asset.asset_type,
            image_url=asset.image_url,
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

    async def _to_detail_response(self, asset: Asset) -> AssetDetailResponse:
        """转换为详情响应"""
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

        return AssetDetailResponse(
            id=asset.id,
            name=asset.name,
            symbol=asset.symbol,
            description=asset.description,
            asset_type=asset.asset_type,
            image_url=asset.image_url,
            document_url=asset.document_url,
            location=asset.location,
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
            created_at=asset.created_at,
            updated_at=asset.updated_at,
        )

    # ============ 项目绑定相关方法 ============

    async def get_available_projects(self) -> list[ProjectContractInfo]:
        """
        获取可绑定的项目列表

        Returns:
            项目列表，每个项目包含合约数量和详细合约信息（含绑定状态）
        """
        from src.services.asset.schemas import ContractBindingStatus

        # 查询所有活跃的部署记录
        deploy_records = await DeployInfo.filter(is_active=True).all()

        # 查询所有已绑定的 exclusive 合约
        all_bindings = await AssetContractBinding.all().prefetch_related("asset")

        # 构建已绑定合约的映射 {contract_address: (asset_name, asset_id)}
        bound_map: dict[str, tuple[str, int]] = {}
        for binding in all_bindings:
            bound_map[binding.contract_address] = (binding.asset.name, binding.asset.id)

        # 按项目分组
        project_map: dict[str, list[ContractBindingStatus]] = {}
        for record in deploy_records:
            if record.project not in project_map:
                project_map[record.project] = []

            # 检查是否可绑定
            is_available = True
            bound_to_asset = None
            bound_to_asset_id = None

            if record.contract_type == "exclusive":
                # exclusive 合约检查是否已被绑定
                if record.contract_address in bound_map:
                    is_available = False
                    bound_to_asset, bound_to_asset_id = bound_map[
                        record.contract_address
                    ]
            # common 和 mock 合约始终可绑定

            project_map[record.project].append(
                ContractBindingStatus(
                    contract_name=record.contract_name,
                    contract_address=record.contract_address,
                    contract_type=record.contract_type,
                    is_available=is_available,
                    bound_to_asset=bound_to_asset,
                    bound_to_asset_id=bound_to_asset_id,
                )
            )

        # 转换为响应格式
        return [
            ProjectContractInfo(
                project=project,
                contract_count=len(contracts),
                contracts=sorted(contracts, key=lambda c: c.contract_name),
            )
            for project, contracts in sorted(project_map.items())
        ]

    async def bind_project_contracts(
        self,
        asset_id: int,
        project: str,
        contract_names: list[str] | None = None,
        set_primary: bool = False,
    ) -> AssetDetailResponse:
        """
        按项目绑定合约（支持选择性绑定）

        Args:
            asset_id: 资产ID
            project: 项目标识
            contract_names: 要绑定的合约名称列表，为空则绑定该项目下所有可用合约
            set_primary: 是否设置主合约

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 查询该项目下所有活跃的合约
        deploy_records = await DeployInfo.filter(project=project, is_active=True).all()

        if not deploy_records:
            raise BusinessException(
                code=400, message=f"No active contracts found for project '{project}'"
            )

        # 如果指定了合约名称，只绑定这些合约
        if contract_names:
            deploy_records = [
                r for r in deploy_records if r.contract_name in contract_names
            ]
            if not deploy_records:
                raise BusinessException(
                    code=400, message="None of the specified contracts found"
                )

        # 批量检查 exclusive 合约是否已被其他资产绑定
        exclusive_addresses = [
            r.contract_address for r in deploy_records if r.contract_type == "exclusive"
        ]
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
                            r.contract_name
                            for r in deploy_records
                            if r.contract_address == binding.contract_address
                        ),
                        binding.contract_address,
                    )
                    raise BusinessException(
                        code=400,
                        message=f"Contract '{contract_name}' is already bound to asset '{binding.asset.name}'",
                    )

        # 批量查询当前资产已存在的绑定
        existing_bindings = await AssetContractBinding.filter(
            asset=asset, contract_name__in=[r.contract_name for r in deploy_records]
        ).all()
        existing_map = {b.contract_name: b for b in existing_bindings}

        # 批量创建/更新绑定
        for record in deploy_records:
            # 使用 DeployInfo 中的 contract_type
            binding_type = (
                record.contract_type
                if record.contract_type in ("common", "mock")
                else "project"
            )

            existing = existing_map.get(record.contract_name)

            if existing:
                # 如果已存在，更新地址和类型
                existing.contract_address = record.contract_address
                existing.contract_type = binding_type
                await existing.save()
            else:
                # 创建新绑定
                await AssetContractBinding.create(
                    asset=asset,
                    contract_name=record.contract_name,
                    contract_address=record.contract_address,
                    contract_type=binding_type,
                    is_primary=False,
                )

        # 更新资产的 project 字段（如果还没设置或与当前项目相同）
        if not asset.project or asset.project == project:
            asset.project = project
            await asset.save()

        # 如果需要设置主合约
        if set_primary and deploy_records:
            # 查找主合约（通常是 Token 合约）
            primary_candidates = ["RWATokenSTO", "STOToken", f"{project.upper()}Token"]
            for candidate in primary_candidates:
                for record in deploy_records:
                    if record.contract_name == candidate:
                        # 先清除其他主合约标记
                        await AssetContractBinding.filter(
                            asset=asset, is_primary=True
                        ).update(is_primary=False)
                        # 设置新的主合约
                        await AssetContractBinding.filter(
                            asset=asset, contract_name=candidate
                        ).update(is_primary=True)
                        # 更新资产的主合约地址
                        asset.contract_address = record.contract_address
                        await asset.save()
                        break

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

        Args:
            asset_id: 资产ID
            contract_names: 要解绑的合约名称列表（可选）
            project: 要解绑的项目标识（可选）
            unbind_all: 是否解绑所有合约

        Returns:
            更新后的资产详情
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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
            deploy_records = await DeployInfo.filter(project=project).all()
            names_to_unbind = [r.contract_name for r in deploy_records]

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
