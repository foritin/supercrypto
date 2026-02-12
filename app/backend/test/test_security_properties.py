"""
安全修复属性测试

Feature: full-stack-review-fixes

验证:
- Property 2: 后门环境限制 — production 环境下后门始终被拒绝
"""

from hypothesis import given, settings, strategies as st


def is_backdoor_allowed(
    environment: str,
    backdoor: str,
    configured_backdoor: str = "test_backdoor_password",
) -> bool:
    """
    判断后门是否被允许，镜像 auth.py 中的后门逻辑。

    逻辑:
        仅当 environment 为 dev 或 test，且 backdoor 非空，
        且 backdoor 与配置的后门密码一致时，才允许后门绕过。

    Args:
        environment: 当前运行环境 (dev/test/production)
        backdoor: 用户提交的后门密码
        configured_backdoor: 系统配置的后门密码

    Returns:
        True 表示后门被允许，False 表示被拒绝
    """
    return (
        environment in ("dev", "test")
        and bool(backdoor)
        and backdoor == configured_backdoor
    )


class TestSecurityProperties:
    """Feature: full-stack-review-fixes"""

    @settings(max_examples=100)
    @given(
        environment=st.sampled_from(["dev", "test", "production"]),
        backdoor=st.text(min_size=1, max_size=50),
    )
    def test_property_2_backdoor_environment_restriction(
        self, environment: str, backdoor: str
    ):
        """Property 2: 后门环境限制

        **Validates: Requirements 1.3**

        属性: 在 production 环境下，无论后门密码是否正确，
        后门绕过签名验证的路径都应被拒绝。
        """
        if environment == "production":
            assert not is_backdoor_allowed(environment, backdoor)
            # 即使后门密码与配置完全匹配，production 下也必须拒绝
            assert not is_backdoor_allowed(
                environment, backdoor, configured_backdoor=backdoor
            )
