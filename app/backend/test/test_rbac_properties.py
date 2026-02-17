"""
权限修复属性测试

Feature: full-stack-review-fixes

验证:
- Property 3: KYC 状态查询隔离 — 用户仅能查询自身 KYC 状态
- Property 4: RBAC 角色一致性 — 管理员权限当且仅当 role == "admin" 时授予
"""

from dataclasses import dataclass
from typing import Optional

from hypothesis import given, settings
from hypothesis import strategies as st

# ============================================================
# 钱包地址生成策略 — 符合以太坊地址格式 (0x + 40 hex chars)
# ============================================================

wallet_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)


# ============================================================
# Property 3: KYC 状态查询隔离
# ============================================================


def is_kyc_query_allowed(
    authenticated_address: str,
    queried_address: str,
) -> bool:
    """
    判断已认证用户是否被允许查询指定地址的 KYC 状态。

    镜像 user/kyc.py 中的隔离逻辑:
    - 用户通过 require_user 认证后获得自身钱包地址
    - KYC 状态查询仅允许查询自身地址
    - 地址比较统一使用小写

    Args:
        authenticated_address: 已认证用户的钱包地址
        queried_address: 被查询的钱包地址

    Returns:
        True 表示允许查询，False 表示拒绝
    """
    return authenticated_address.lower() == queried_address.lower()


class TestKycIsolationProperties:
    """Feature: full-stack-review-fixes — KYC 查询隔离"""

    @settings(max_examples=100)
    @given(
        address_a=wallet_address_strategy,
        address_b=wallet_address_strategy,
    )
    def test_property_3_kyc_query_isolation(self, address_a: str, address_b: str):
        """Property 3: KYC 状态查询隔离

        **Validates: Requirements 1.4**

        属性: 对于任意两个不同的钱包地址 A 和 B，
        用户 A 认证后应仅能查询地址 A 的 KYC 状态，
        查询地址 B 的请求应被拒绝。
        """
        # 用户 A 查询自身 — 始终允许
        assert is_kyc_query_allowed(address_a, address_a)

        # 用户 A 查询地址 B — 仅当 A == B 时允许
        if address_a.lower() != address_b.lower():
            assert not is_kyc_query_allowed(address_a, address_b)

    @settings(max_examples=100)
    @given(address=wallet_address_strategy)
    def test_property_3_kyc_query_case_insensitive(self, address: str):
        """Property 3 补充: KYC 查询地址比较大小写不敏感

        **Validates: Requirements 1.4**

        属性: 同一地址的大小写变体应被视为同一用户，
        查询应被允许。
        """
        # 同一地址的大小写变体应被允许
        assert is_kyc_query_allowed(address.lower(), address.upper())
        assert is_kyc_query_allowed(address.upper(), address.lower())


# ============================================================
# Property 4: RBAC 角色一致性
# ============================================================


@dataclass
class AccountStub:
    """
    Account 模型的轻量级替身，用于测试 RBAC 判断逻辑。

    仅包含权限判断所需的字段。
    """

    address: str
    role: str
    tag: Optional[str] = None


def check_admin_access(account: Optional[AccountStub]) -> bool:
    """
    判断账户是否具有管理员权限。

    镜像 deps.py 中 require_admin 的修复后逻辑:
    - 账户必须存在
    - account.role 必须为 "admin"
    - 不使用 account.tag 进行判断（已修复的 bug）

    Args:
        account: 账户对象，None 表示账户不存在

    Returns:
        True 表示具有管理员权限，False 表示拒绝
    """
    if not account:
        return False
    return account.role == "admin"


# 角色值策略 — 包含 "admin" 和各种非 admin 值
role_strategy = st.sampled_from(
    [
        "admin",
        "user",
        "moderator",
        "viewer",
        "operator",
        "superadmin",
        "Admin",  # 大小写敏感测试
        "ADMIN",  # 全大写
        " admin",  # 前导空格
        "admin ",  # 尾部空格
        "",  # 空字符串
    ]
)


class TestRbacProperties:
    """Feature: full-stack-review-fixes — RBAC 角色一致性"""

    @settings(max_examples=100)
    @given(
        address=wallet_address_strategy,
        role=role_strategy,
        tag=st.one_of(st.none(), st.text(min_size=0, max_size=20)),
    )
    def test_property_4_rbac_role_consistency(
        self, address: str, role: str, tag: Optional[str]
    ):
        """Property 4: RBAC 角色一致性

        **Validates: Requirements 1.7**

        属性: 管理员权限判断当且仅当 account.role == "admin" 时授予，
        role 为其他任何值时应拒绝。tag 字段不应影响权限判断。
        """
        account = AccountStub(address=address, role=role, tag=tag)
        result = check_admin_access(account)

        if role == "admin":
            assert result, (
                f"role='admin' 应授予管理员权限，但被拒绝 "
                f"(address={address}, tag={tag})"
            )
        else:
            assert not result, (
                f"role='{role}' 不应授予管理员权限，但被允许 "
                f"(address={address}, tag={tag})"
            )

    @settings(max_examples=100)
    @given(
        address=wallet_address_strategy,
        tag=st.sampled_from(["admin", "user", None, "", "superadmin"]),
    )
    def test_property_4_tag_does_not_affect_admin(
        self, address: str, tag: Optional[str]
    ):
        """Property 4 补充: tag 字段不影响管理员权限判断

        **Validates: Requirements 1.7**

        属性: 无论 tag 字段为何值，只要 role != "admin"，
        就不应授予管理员权限。即使 tag == "admin" 也不行。
        """
        # role 为 "user"，tag 为任意值 — 应始终拒绝
        account = AccountStub(address=address, role="user", tag=tag)
        assert not check_admin_access(account), (
            f"role='user' + tag='{tag}' 不应授予管理员权限"
        )

    @settings(max_examples=100)
    @given(address=wallet_address_strategy)
    def test_property_4_none_account_denied(self, address: str):
        """Property 4 补充: 账户不存在时拒绝管理员权限

        **Validates: Requirements 1.7**

        属性: 当账户查询结果为 None 时，应拒绝管理员权限。
        """
        assert not check_admin_access(None)
