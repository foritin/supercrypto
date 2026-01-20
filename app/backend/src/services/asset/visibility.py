"""
资产可见性检查器
================

提供资产可见性规则检查和诊断功能。

可见性规则:
1. status == 'active'
2. 至少绑定一个合约
3. 至少设置一个 APY（3m/6m/12m）

Usage:
    from src.services.asset.visibility import VisibilityChecker, visibility_filter

    # 检查单个资产
    is_visible = VisibilityChecker.is_visible(asset)
    issues = VisibilityChecker.get_visibility_issues(asset)

    # 在查询中使用过滤器
    query = Asset.filter(**visibility_filter())
"""

from decimal import Decimal
from typing import TYPE_CHECKING

from tortoise.expressions import Q

from src.shared.schemas.enums import AssetStatus

if TYPE_CHECKING:
    from src.models.asset import Asset


class VisibilityChecker:
    """
    资产可见性检查器

    提供:
    - 可见性规则检查
    - 可见性问题诊断
    - 用于 ORM 过滤的条件生成
    """

    @staticmethod
    def is_visible(asset: "Asset") -> bool:
        """
        检查资产是否对用户可见

        可见性规则:
        1. status == 'active'
        2. 有绑定的合约（通过 contract_address 快速判断）
        3. 至少设置一个 APY（3m/6m/12m > 0）

        Args:
            asset: 资产实例

        Returns:
            是否可见
        """
        # 规则 1: 状态必须是 active
        if asset.status != AssetStatus.ACTIVE:
            return False

        # 规则 2: 必须绑定合约
        if not asset.contract_address:
            return False

        # 规则 3: 必须设置至少一个 APY
        zero = Decimal("0")
        if not (asset.apy_3m > zero or asset.apy_6m > zero or asset.apy_12m > zero):
            return False

        return True

    @staticmethod
    def get_visibility_issues(asset: "Asset") -> list[str]:
        """
        获取资产不可见的原因列表

        Args:
            asset: 资产实例

        Returns:
            问题列表，空列表表示可见
        """
        issues = []

        # 检查状态
        if asset.status != AssetStatus.ACTIVE:
            issues.append(f"状态不是 active（当前: {asset.status.value}）")

        # 检查合约绑定
        if not asset.contract_address:
            issues.append("未绑定主合约")

        # 检查 APY
        zero = Decimal("0")
        if not (asset.apy_3m > zero or asset.apy_6m > zero or asset.apy_12m > zero):
            issues.append("未设置任何 APY（3m/6m/12m 均为 0）")

        return issues

    @staticmethod
    def get_visibility_summary(asset: "Asset") -> dict:
        """
        获取资产可见性摘要

        Args:
            asset: 资产实例

        Returns:
            包含可见性状态和问题的字典
        """
        issues = VisibilityChecker.get_visibility_issues(asset)
        return {
            "is_visible": len(issues) == 0,
            "issues": issues,
            "issue_count": len(issues),
        }


def visibility_filter() -> Q:
    """
    生成可见性 ORM 过滤条件

    用于在数据库层面过滤不可见资产，避免加载不需要的数据。

    Usage:
        from src.services.asset.visibility import visibility_filter

        # 查询可见资产
        visible_assets = await Asset.filter(visibility_filter())

        # 组合其他条件
        query = Asset.filter(visibility_filter() & Q(asset_type="real_estate"))

    Returns:
        Tortoise ORM Q 对象
    """
    zero = Decimal("0")

    return (
        Q(status=AssetStatus.ACTIVE)
        & Q(contract_address__not_isnull=True)
        & Q(contract_address__not="")
        & (Q(apy_3m__gt=zero) | Q(apy_6m__gt=zero) | Q(apy_12m__gt=zero))
    )


__all__ = [
    "VisibilityChecker",
    "visibility_filter",
]
