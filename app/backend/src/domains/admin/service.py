"""
Admin Domain - Business Service
"""
from typing import Optional, List, Tuple
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from tortoise.functions import Sum, Count

from falib.utils.config import SETTINGS

from src.models.audit_log import AuditLog, AuditAction
from src.models.kyc import UserKyc, KycStatus
from src.models.asset import Asset, AssetStatus
from src.models.subscription import Subscription, SubscriptionStatus
from src.models.staking import StakingRecord, StakingStatus, RewardClaim
from src.models.account import Account

from src.domains.admin.schemas import (
    TVLStatsResponse,
    TVLBreakdown,
    UserStatsResponse,
    StakingPoolStatsResponse,
    PlatformStatsResponse,
    AuditLogResponse,
    AuditLogListQuery,
    CreateAuditLogRequest,
)


# PLT 总量配置
PLT_TOTAL_SUPPLY = Decimal("100000000")
PLT_STAKING_POOL = Decimal("40000000")


class AdminService:
    """管理员服务"""
    
    @property
    def environment(self) -> str:
        """获取当前环境"""
        return SETTINGS.environment or "local"
    
    # ============ 平台统计 ============
    
    async def get_platform_stats(self) -> PlatformStatsResponse:
        """获取平台统计汇总"""
        tvl = await self.get_tvl_stats()
        users = await self.get_user_stats()
        staking = await self.get_staking_pool_stats()
        
        # 认购统计
        active_subs = await Subscription.filter(
            status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.MATURED],
            environment=self.environment
        ).count()
        
        total_subs = await Subscription.filter(
            environment=self.environment
        ).count()
        
        # 资产数量
        total_assets = await Asset.filter(
            status__in=[AssetStatus.ACTIVE, AssetStatus.PAUSED],
            environment=self.environment
        ).count()
        
        return PlatformStatsResponse(
            tvl=tvl,
            users=users,
            staking=staking,
            active_subscriptions=active_subs,
            total_subscriptions=total_subs,
            total_assets=total_assets
        )
    
    async def get_tvl_stats(self) -> TVLStatsResponse:
        """获取 TVL 统计"""
        # 查询所有活跃认购
        subscriptions = await Subscription.filter(
            status__in=[SubscriptionStatus.ACTIVE, SubscriptionStatus.MATURED],
            environment=self.environment
        ).prefetch_related("asset")
        
        # 按资产分组计算
        asset_tvl: dict[int, dict] = {}
        total = Decimal(0)
        
        for sub in subscriptions:
            asset_id = sub.asset_id
            if asset_id not in asset_tvl:
                asset_tvl[asset_id] = {
                    "asset_id": asset_id,
                    "asset_name": sub.asset.name if sub.asset else f"Asset #{asset_id}",
                    "amount": Decimal(0)
                }
            asset_tvl[asset_id]["amount"] += sub.amount
            total += sub.amount
        
        # 计算百分比
        breakdown = []
        for data in asset_tvl.values():
            pct = (data["amount"] / total * 100) if total > 0 else 0
            breakdown.append(TVLBreakdown(
                asset_id=data["asset_id"],
                asset_name=data["asset_name"],
                amount=float(data["amount"]),
                percentage=float(pct)
            ))
        
        return TVLStatsResponse(
            total_tvl=float(total),
            change_24h=0,  # TODO: 实现历史对比
            change_7d=0,
            breakdown=breakdown
        )
    
    async def get_user_stats(self) -> UserStatsResponse:
        """获取用户统计"""
        # KYC 状态统计
        kyc_approved = await UserKyc.filter(
            status=KycStatus.APPROVED,
            environment=self.environment
        ).count()
        
        kyc_pending = await UserKyc.filter(
            status=KycStatus.PENDING,
            environment=self.environment
        ).count()
        
        kyc_rejected = await UserKyc.filter(
            status=KycStatus.REJECTED,
            environment=self.environment
        ).count()
        
        total_users = await UserKyc.filter(
            environment=self.environment
        ).count()
        
        # 新增用户统计
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        
        new_24h = await UserKyc.filter(
            created_at__gte=day_ago,
            environment=self.environment
        ).count()
        
        new_7d = await UserKyc.filter(
            created_at__gte=week_ago,
            environment=self.environment
        ).count()
        
        # KYC 转化率
        conversion_rate = (kyc_approved / total_users * 100) if total_users > 0 else 0
        
        return UserStatsResponse(
            total_users=total_users,
            kyc_approved=kyc_approved,
            kyc_pending=kyc_pending,
            kyc_rejected=kyc_rejected,
            new_users_24h=new_24h,
            new_users_7d=new_7d,
            kyc_conversion_rate=round(conversion_rate, 2)
        )
    
    async def get_staking_pool_stats(self) -> StakingPoolStatsResponse:
        """获取质押池统计"""
        # 活跃质押
        active_stakings = await StakingRecord.filter(
            status__in=[StakingStatus.ACTIVE, StakingStatus.MATURED],
            environment=self.environment
        )
        
        total_staked = Decimal(0)
        active_count = len(active_stakings)
        period_dist = {15: 0, 30: 0, 45: 0, 60: 0}
        total_period = 0
        
        for s in active_stakings:
            total_staked += s.amount
            if s.period in period_dist:
                period_dist[s.period] += 1
            total_period += s.period
        
        avg_period = (total_period / active_count) if active_count > 0 else 0
        
        # 已分发奖励
        distributed_result = await RewardClaim.filter(
            environment=self.environment
        ).annotate(
            total=Sum("amount")
        ).values_list("total", flat=True)
        
        distributed = Decimal(distributed_result[0] or 0) if distributed_result else Decimal(0)
        
        return StakingPoolStatsResponse(
            total_staked=float(total_staked),
            active_stakes=active_count,
            total_rewards_distributed=float(distributed),
            rewards_pool_remaining=float(PLT_STAKING_POOL - distributed),
            avg_stake_period=round(avg_period, 1),
            period_distribution=period_dist
        )
    
    # ============ 审计日志 ============
    
    async def create_audit_log(
        self,
        operator_address: str,
        action: AuditAction,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        details: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        tx_hash: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """创建审计日志"""
        log = await AuditLog.create(
            operator_address=operator_address.lower(),
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            details=details,
            success=success,
            error_message=error_message,
            tx_hash=tx_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            environment=self.environment
        )
        return log
    
    async def list_audit_logs(
        self,
        query: AuditLogListQuery
    ) -> Tuple[List[AuditLogResponse], int, int]:
        """查询审计日志"""
        filters = {"environment": self.environment}
        
        if query.action:
            filters["action"] = query.action
        if query.operator_address:
            filters["operator_address"] = query.operator_address.lower()
        if query.target_type:
            filters["target_type"] = query.target_type
        if query.success is not None:
            filters["success"] = query.success
        if query.start_date:
            filters["created_at__gte"] = query.start_date
        if query.end_date:
            filters["created_at__lte"] = query.end_date
        
        base_query = AuditLog.filter(**filters)
        
        total = await base_query.count()
        total_pages = (total + query.page_size - 1) // query.page_size
        
        offset = (query.page - 1) * query.page_size
        logs = await base_query.order_by("-created_at").offset(offset).limit(query.page_size)
        
        return (
            [self._to_audit_log_response(log) for log in logs],
            total,
            total_pages
        )
    
    async def get_audit_log(self, log_id: int) -> Optional[AuditLogResponse]:
        """获取审计日志详情"""
        log = await AuditLog.filter(
            id=log_id,
            environment=self.environment
        ).first()
        
        if not log:
            return None
        
        return self._to_audit_log_response(log)
    
    def _to_audit_log_response(self, log: AuditLog) -> AuditLogResponse:
        """转换为审计日志响应"""
        return AuditLogResponse(
            id=log.id,
            operator_address=log.operator_address,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            details=log.details,
            success=log.success,
            error_message=log.error_message,
            tx_hash=log.tx_hash,
            ip_address=log.ip_address,
            environment=log.environment,
            created_at=log.created_at
        )


# 全局服务实例
admin_service = AdminService()

