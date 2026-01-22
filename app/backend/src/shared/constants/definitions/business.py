"""
业务相关常量定义

定义认购状态、质押状态、交易类型等业务常量，与后端枚举保持同步。

同步的枚举:
- SubscriptionStatus: src/shared/schemas/enums/subscription.py
- StakingStatus: src/shared/schemas/enums/staking.py
- TransactionType: src/shared/schemas/enums/transaction.py
"""

from src.shared.constants.schemas import ConstantItem

# =============================================================================
# 认购状态常量 (subscription_status)
# 同步: SubscriptionStatus 枚举 - src/shared/schemas/enums/subscription.py
# =============================================================================
SUBSCRIPTION_STATUS_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="pending",
        labels={"zh": "待确认", "en": "Pending"},
        metadata={"color": "processing"},
    ),
    ConstantItem(
        value="active",
        labels={"zh": "生效中", "en": "Active"},
        metadata={"color": "blue"},
    ),
    ConstantItem(
        value="matured",
        labels={"zh": "已到期", "en": "Matured"},
        metadata={"color": "green"},
    ),
    ConstantItem(
        value="redeemed",
        labels={"zh": "已赎回", "en": "Redeemed"},
        metadata={"color": "default"},
    ),
    ConstantItem(
        value="cancelled",
        labels={"zh": "已取消", "en": "Cancelled"},
        metadata={"color": "error"},
    ),
]

# =============================================================================
# 质押状态常量 (staking_status)
# 同步: StakingStatus 枚举 - src/shared/schemas/enums/staking.py
# =============================================================================
STAKING_STATUS_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="active",
        labels={"zh": "质押中", "en": "Active"},
        metadata={"color": "processing"},
    ),
    ConstantItem(
        value="matured",
        labels={"zh": "已到期", "en": "Matured"},
        metadata={"color": "success"},
    ),
    ConstantItem(
        value="unstaked",
        labels={"zh": "已解押", "en": "Unstaked"},
        metadata={"color": "default"},
    ),
    ConstantItem(
        value="claimed",
        labels={"zh": "已领取", "en": "Claimed"},
        metadata={"color": "gold"},
    ),
    ConstantItem(
        value="cancelled",
        labels={"zh": "已取消", "en": "Cancelled"},
        metadata={"color": "error"},
    ),
]

# =============================================================================
# 交易类型常量 (transaction_type)
# 同步: TransactionType 枚举 - src/shared/schemas/enums/transaction.py
# =============================================================================
TRANSACTION_TYPE_CONSTANTS: list[ConstantItem] = [
    ConstantItem(
        value="subscription",
        labels={"zh": "认购", "en": "Subscription"},
        metadata={"color": "blue"},
    ),
    ConstantItem(
        value="redeem",
        labels={"zh": "赎回", "en": "Redemption"},
        metadata={"color": "green"},
    ),
    ConstantItem(
        value="stake",
        labels={"zh": "质押", "en": "Stake"},
        metadata={"color": "purple"},
    ),
    ConstantItem(
        value="unstake",
        labels={"zh": "解押", "en": "Unstake"},
        metadata={"color": "orange"},
    ),
    ConstantItem(
        value="claim",
        labels={"zh": "领取奖励", "en": "Claim Reward"},
        metadata={"color": "gold"},
    ),
    ConstantItem(
        value="transfer",
        labels={"zh": "转账", "en": "Transfer"},
        metadata={"color": "cyan"},
    ),
    ConstantItem(
        value="approve",
        labels={"zh": "授权", "en": "Approve"},
        metadata={"color": "default"},
    ),
    ConstantItem(
        value="mint",
        labels={"zh": "铸造", "en": "Mint"},
        metadata={"color": "magenta"},
    ),
    ConstantItem(
        value="other",
        labels={"zh": "其他", "en": "Other"},
        metadata={"color": "default"},
    ),
]
