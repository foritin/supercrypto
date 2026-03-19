from decimal import Decimal
from unittest.mock import patch

import anyio

from src.schemas.enums import SubscriptionStatus
from src.services.subscription_service import SubscriptionService


class _MockSubscription:
    def __init__(
        self,
        *,
        status: SubscriptionStatus,
        amount: str,
        total_return: str,
        expected_interest: str,
        actual_interest: str,
    ) -> None:
        self.status = status
        self.amount = Decimal(amount)
        self.total_return = Decimal(total_return)
        self.expected_interest = Decimal(expected_interest)
        self.actual_interest = Decimal(actual_interest)


class _MockQuery:
    def __init__(self, result: list[_MockSubscription]) -> None:
        self._result = result

    def prefetch_related(self, *_args: str) -> "_MockQuery":
        return self

    def __await__(self):
        async def _runner():
            return self._result

        return _runner().__await__()


def test_user_stats_only_count_realized_earnings_for_unredeemed_positions() -> None:
    async def run_case() -> None:
        service = SubscriptionService()

        subs = [
            _MockSubscription(
                status=SubscriptionStatus.ACTIVE,
                amount="1000",
                total_return="1015",
                expected_interest="15",
                actual_interest="0",
            ),
            _MockSubscription(
                status=SubscriptionStatus.REDEEMED,
                amount="600",
                total_return="600",
                expected_interest="0",
                actual_interest="8",
            ),
        ]

        with patch("src.services.subscription_service.Subscription.filter") as mock_filter:
            mock_filter.return_value = _MockQuery(subs)

            stats = await service.get_user_stats("0xabc")

        assert stats["total_invested"] == 1000.0
        assert stats["total_value"] == 1000.0
        assert stats["total_earnings"] == 8.0
        assert stats["active_subscriptions"] == 1
        assert stats["total_subscriptions"] == 2

    anyio.run(run_case)

