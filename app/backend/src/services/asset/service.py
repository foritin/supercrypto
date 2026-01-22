"""
Asset Domain - Business Service
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from falib.utils.config import SETTINGS

from src.models.asset import (
    Asset,
    AssetContractBinding,
    AssetPriceHistory,
    AssetStatus,
    AssetType,
)
from src.models.contracts.contract import Contract
from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetDetailResponse,
    AssetListItem,
    AssetPriceHistoryItem,
    AssetUpdateRequest,
    ContractBindingStatus,
    ProjectContractInfo,
)
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import ContractScope, ContractStatus


class AssetService:
    """资产服务"""

    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.NETWORK

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

        Args:
            status: 状态筛选
            asset_type: 类型筛选
            page: 页码
            page_size: 每页数量
            public_only: 是否只返回可见资产（用于 Public API）

        Returns:
            (列表, 总数, 总页数)
        """
        from decimal import Decimal as D

        from tortoise.expressions import Q

        query = Asset.filter(environment=self.environment)

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
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        assets = await query.order_by("-created_at").offset(offset).limit(page_size)

        return ([self._to_list_item(a) for a in assets], total, total_pages)

    async def get_asset(
        self, asset_id: int, public_only: bool = False
    ) -> Optional[AssetDetailResponse]:
        """
        获取资产详情

        Args:
            asset_id: 资产ID
            public_only: 是否只返回可见资产（用于 Public API）

        Returns:
            资产详情或 None
        """
        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

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

        Args:
            symbol: 资产符号
            public_only: 是否只返回可见资产（用于 Public API）

        Returns:
            资产详情或 None
        """
        asset = await Asset.filter(
            symbol=symbol.upper(), environment=self.environment
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

    async def _to_detail_response(
        self, asset: Asset, include_visibility: bool = True
    ) -> AssetDetailResponse:
        """转换为详情响应

        Args:
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
            is_visible=is_visible,
            visibility_issues=visibility_issues,
            created_at=asset.created_at,
            updated_at=asset.updated_at,
        )

    # ============ 项目绑定相关方法 ============

    async def get_available_projects(self) -> list[ProjectContractInfo]:
        """
        获取可绑定的项目列表（含主合约和就绪状态）

        变更 (Requirements 3.1, 3.2, 7.3, 7.4, 7.7):
        1. 返回 has_primary: 是否有主合约
        2. 返回 primary_contract_symbol: 主合约 Symbol
        3. 集成 ProjectReadinessChecker 计算就绪状态
        4. 返回 is_ready: 项目是否就绪
        5. 返回 missing_dependencies: 缺失的必选依赖列表

        Returns:
            项目列表，每个项目包含合约数量、详细合约信息、主合约信息和就绪状态
        """
        from src.services.project_registry import get_readiness_checker
        from src.shared.schemas.enums import ProjectReadiness

        # 查询所有活跃的合约 (使用 Contract 模型)
        contracts = await Contract.filter(status=ContractStatus.ACTIVE).all()

        # 查询所有已绑定的 PROJECT 合约
        all_bindings = await AssetContractBinding.all().prefetch_related("asset")

        # 构建已绑定合约的映射 {contract_address: (asset_name, asset_id)}
        bound_map: dict[str, tuple[str, int]] = {}
        for binding in all_bindings:
            bound_map[binding.contract_address] = (binding.asset.name, binding.asset.id)

        # 按项目分组，同时记录主合约信息
        project_map: dict[str, list[ContractBindingStatus]] = {}
        project_primary_map: dict[str, Contract] = {}  # 记录每个项目的主合约

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

        # 获取就绪状态检查器
        checker = get_readiness_checker(self.environment)

        # 转换为响应格式，集成就绪状态
        result: list[ProjectContractInfo] = []
        for project, contracts_list in sorted(project_map.items()):
            # 获取主合约信息
            primary_contract = project_primary_map.get(project)
            has_primary = primary_contract is not None
            primary_contract_symbol = (
                primary_contract.symbol if primary_contract else None
            )

            # 获取项目就绪状态 (Requirements 7.3, 7.4, 7.7)
            is_ready = False
            missing_dependencies: list[str] = []

            try:
                report = await checker.get_project_status(project)
                # 项目就绪条件：readiness 不是 NOT_READY
                is_ready = report.readiness != ProjectReadiness.NOT_READY

                # 收集所有缺失的必选依赖
                for info in report.contracts.values():
                    missing_dependencies.extend(info.missing_required_deps)

                # 去重
                missing_dependencies = list(set(missing_dependencies))
            except Exception:
                # 如果获取就绪状态失败，保持默认值
                pass

            result.append(
                ProjectContractInfo(
                    project=project,
                    contract_count=len(contracts_list),
                    contracts=sorted(contracts_list, key=lambda c: c.contract_name),
                    has_primary=has_primary,
                    primary_contract_symbol=primary_contract_symbol,
                    is_ready=is_ready,
                    missing_dependencies=missing_dependencies,
                )
            )

        return result

    async def bind_project_contracts(
        self,
        asset_id: int,
        project: str,
        contract_names: list[str] | None = None,
    ) -> AssetDetailResponse:
        """
        按项目绑定合约（简化版）

        变更 (Requirements 2.1-2.6):
        1. 只绑定 PROJECT scope 合约（不绑定 GLOBAL scope）
        2. 检查项目是否有主合约（is_primary=True）
        3. 自动从主合约获取 symbol 和 address 填充到 Asset

        Args:
            asset_id: 资产ID
            project: 项目标识
            contract_names: 要绑定的合约名称列表，为空则绑定该项目下所有可用的 PROJECT scope 合约

        Returns:
            更新后的资产详情

        Raises:
            BusinessException: 资产不存在、项目无主合约、合约已被绑定等错误
        """
        from src.services.contract import get_contract_service

        asset = await Asset.filter(id=asset_id, environment=self.environment).first()

        if not asset:
            raise BusinessException(code=404, message="Asset not found")

        # 获取 Contract Service 实例
        contract_service = get_contract_service()

        # 检查项目是否有主合约 (Requirements 2.3, 2.4)
        primary_contract = await contract_service.get_project_primary_contract(project)
        if not primary_contract:
            raise BusinessException(
                code=400,
                message="该项目没有设置主合约，请先在 Contract Monitor 中设置",
            )

        # 查询该项目下所有活跃的 PROJECT scope 合约 (Requirements 2.1, 2.2)
        # 只绑定 PROJECT scope 合约，不绑定 GLOBAL scope 合约
        contracts = await Contract.filter(
            project_name=project,
            status=ContractStatus.ACTIVE,
            scope=ContractScope.PROJECT,  # 只查询 PROJECT scope
        ).all()

        if not contracts:
            raise BusinessException(
                code=400,
                message=f"No active PROJECT scope contracts found for project '{project}'",
            )

        # 如果指定了合约名称，只绑定这些合约
        if contract_names:
            contracts = [r for r in contracts if r.name in contract_names]
            if not contracts:
                raise BusinessException(
                    code=400, message="None of the specified contracts found"
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
                        message=f"Contract '{contract_name}' is already bound to asset '{binding.asset.name}'",
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
                existing.contract_type = "project"  # PROJECT scope 合约类型为 project
                existing.is_primary = is_primary_binding
                await existing.save()
            else:
                # 创建新绑定
                await AssetContractBinding.create(
                    asset=asset,
                    contract_name=record.name,
                    contract_address=record.address,
                    contract_type="project",  # PROJECT scope 合约类型为 project
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
            contracts = await Contract.filter(project_name=project).all()
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
