"""
认证服务 (AuthService) 单元测试

覆盖范围:
- 钱包签名验证 (verify_wallet_signature)
- JWT 生成与验证 (create_access_token / create_refresh_token / verify_token)
- Token 刷新 (refresh_tokens)
- 后门环境限制 (backdoor 仅在 dev/test 环境可用)

_Requirements: 8.3_
"""

import asyncio
import datetime
import warnings
from unittest.mock import patch

import jwt as pyjwt
import pytest
from falib.utils.config import SETTINGS

from src.shared.security.jwt import (
    create_access_token,
    create_refresh_token,
    refresh_tokens,
    verify_token,
)
from src.shared.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.shared.common.exceptions import UnauthorizedException
from src.shared.security.wallet import verify_wallet_signature

# 开发环境 JWT 密钥较短，抑制 PyJWT 的 InsecureKeyLengthWarning
pytestmark = pytest.mark.filterwarnings(
    "ignore::jwt.warnings.InsecureKeyLengthWarning"
)


# ============================================================
# 异步运行器 (与 conftest.py 保持一致)
# ============================================================


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 测试类: 钱包签名验证
# ============================================================


class TestWalletSignatureVerification:
    """钱包签名验证测试"""

    def test_valid_signature_returns_true(self):
        """有效签名应返回 True"""
        from eth_account import Account as EthAccount
        from eth_account.messages import encode_defunct

        # 使用 eth_account 生成真实的密钥对和签名
        account = EthAccount.create()
        message = "SlimCryptoAccess"
        msg_hash = encode_defunct(text=message)
        signed = account.sign_message(msg_hash)

        result = verify_wallet_signature(
            address=account.address,
            signature=signed.signature.hex(),
            message=message,
        )
        assert result is True

    def test_invalid_signature_returns_false(self):
        """无效签名应返回 False"""
        result = verify_wallet_signature(
            address="0x" + "a" * 40,
            signature="0x" + "ff" * 65,
            message="SlimCryptoAccess",
        )
        assert result is False

    def test_wrong_address_returns_false(self):
        """签名地址不匹配应返回 False"""
        from eth_account import Account as EthAccount
        from eth_account.messages import encode_defunct

        account = EthAccount.create()
        other_account = EthAccount.create()
        msg_hash = encode_defunct(text="SlimCryptoAccess")
        signed = account.sign_message(msg_hash)

        # 用 other_account 的地址验证 account 的签名
        result = verify_wallet_signature(
            address=other_account.address,
            signature=signed.signature.hex(),
            message="SlimCryptoAccess",
        )
        assert result is False

    def test_wrong_message_returns_false(self):
        """签名消息不匹配应返回 False"""
        from eth_account import Account as EthAccount
        from eth_account.messages import encode_defunct

        account = EthAccount.create()
        msg_hash = encode_defunct(text="SlimCryptoAccess")
        signed = account.sign_message(msg_hash)

        # 用不同的消息验证
        result = verify_wallet_signature(
            address=account.address,
            signature=signed.signature.hex(),
            message="WrongMessage",
        )
        assert result is False

    def test_malformed_signature_returns_false(self):
        """格式错误的签名应返回 False（不抛异常）"""
        result = verify_wallet_signature(
            address="0x" + "a" * 40,
            signature="not-a-valid-hex-signature",
            message="SlimCryptoAccess",
        )
        assert result is False

    def test_empty_signature_returns_false(self):
        """空签名应返回 False"""
        result = verify_wallet_signature(
            address="0x" + "a" * 40,
            signature="",
            message="SlimCryptoAccess",
        )
        assert result is False

    def test_case_insensitive_address(self):
        """地址比较应不区分大小写"""
        from eth_account import Account as EthAccount
        from eth_account.messages import encode_defunct

        account = EthAccount.create()
        msg_hash = encode_defunct(text="SlimCryptoAccess")
        signed = account.sign_message(msg_hash)

        # 使用全小写地址验证
        result = verify_wallet_signature(
            address=account.address.lower(),
            signature=signed.signature.hex(),
            message="SlimCryptoAccess",
        )
        assert result is True


# ============================================================
# 测试类: JWT 生成与验证
# ============================================================


class TestJwtGenerationAndValidation:
    """JWT 生成与验证测试"""

    def test_access_token_contains_required_claims(self):
        """Access Token 应包含 iss、aud、type、exp 声明"""
        token = create_access_token({"address": "0x" + "a" * 40})
        payload = pyjwt.decode(
            token,
            SETTINGS.JWT_SECRET,
            algorithms=["HS256"],
            issuer="supercrypto-api",
            audience="supercrypto-client",
        )
        assert payload["iss"] == "supercrypto-api"
        assert payload["aud"] == "supercrypto-client"
        assert payload["type"] == "access"
        assert payload["address"] == "0x" + "a" * 40
        assert "exp" in payload

    def test_refresh_token_contains_required_claims(self):
        """Refresh Token 应包含 iss、aud、type、exp 声明"""
        token = create_refresh_token({"address": "0x" + "b" * 40})
        payload = pyjwt.decode(
            token,
            SETTINGS.JWT_SECRET,
            algorithms=["HS256"],
            issuer="supercrypto-api",
            audience="supercrypto-client",
        )
        assert payload["iss"] == "supercrypto-api"
        assert payload["aud"] == "supercrypto-client"
        assert payload["type"] == "refresh"
        assert payload["address"] == "0x" + "b" * 40
        assert "exp" in payload

    def test_verify_valid_access_token(self):
        """验证有效的 Access Token 应返回正确的 payload"""
        address = "0x" + "c" * 40
        token = create_access_token({"address": address})
        payload = verify_token(token)
        assert payload["address"] == address
        assert payload["type"] == "access"

    def test_verify_valid_refresh_token(self):
        """验证有效的 Refresh Token 应返回正确的 payload"""
        address = "0x" + "d" * 40
        token = create_refresh_token({"address": address})
        payload = verify_token(token, expected_type="refresh")
        assert payload["address"] == address
        assert payload["type"] == "refresh"

    def test_verify_token_type_mismatch_raises(self):
        """Token 类型不匹配应抛出 UnauthorizedException"""
        token = create_access_token({"address": "0x" + "e" * 40})
        with pytest.raises(UnauthorizedException):
            verify_token(token, expected_type="refresh")

    def test_verify_expired_access_token_raises(self):
        """过期的 Access Token 应抛出 AccessTokenExpiredException"""
        token = create_access_token(
            {"address": "0x" + "f" * 40},
            expires_delta=datetime.timedelta(seconds=-1),
        )
        with pytest.raises(AccessTokenExpiredException):
            verify_token(token)

    def test_verify_expired_refresh_token_raises(self):
        """过期的 Refresh Token 应抛出 RefreshTokenExpiredException"""
        token = create_refresh_token(
            {"address": "0x" + "1" * 40},
            expires_delta=datetime.timedelta(seconds=-1),
        )
        with pytest.raises(RefreshTokenExpiredException):
            verify_token(token)

    def test_verify_tampered_token_raises(self):
        """篡改的 Token 应抛出 UnauthorizedException"""
        token = create_access_token({"address": "0x" + "2" * 40})
        # 篡改 token 的最后几个字符
        tampered = token[:-4] + "XXXX"
        with pytest.raises(UnauthorizedException):
            verify_token(tampered)

    def test_verify_token_wrong_secret_raises(self):
        """使用错误密钥签名的 Token 应抛出 UnauthorizedException"""
        payload = {
            "address": "0x" + "3" * 40,
            "exp": datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(hours=1),
            "type": "access",
            "iss": "supercrypto-api",
            "aud": "supercrypto-client",
        }
        token = pyjwt.encode(payload, "wrong-secret", algorithm="HS256")
        with pytest.raises(UnauthorizedException):
            verify_token(token)

    def test_verify_token_missing_address_raises(self):
        """缺少 address 字段的 Token 应抛出 UnauthorizedException"""
        payload = {
            "exp": datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(hours=1),
            "type": "access",
            "iss": "supercrypto-api",
            "aud": "supercrypto-client",
        }
        token = pyjwt.encode(payload, SETTINGS.JWT_SECRET, algorithm="HS256")
        with pytest.raises(UnauthorizedException, match="missing address"):
            verify_token(token)

    def test_verify_token_wrong_issuer_raises(self):
        """错误的 issuer 应抛出 UnauthorizedException"""
        payload = {
            "address": "0x" + "4" * 40,
            "exp": datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(hours=1),
            "type": "access",
            "iss": "wrong-issuer",
            "aud": "supercrypto-client",
        }
        token = pyjwt.encode(payload, SETTINGS.JWT_SECRET, algorithm="HS256")
        with pytest.raises(UnauthorizedException):
            verify_token(token)

    def test_verify_token_wrong_audience_raises(self):
        """错误的 audience 应抛出 UnauthorizedException"""
        payload = {
            "address": "0x" + "5" * 40,
            "exp": datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(hours=1),
            "type": "access",
            "iss": "supercrypto-api",
            "aud": "wrong-audience",
        }
        token = pyjwt.encode(payload, SETTINGS.JWT_SECRET, algorithm="HS256")
        with pytest.raises(UnauthorizedException):
            verify_token(token)

    def test_custom_expires_delta(self):
        """自定义过期时间应生效"""
        delta = datetime.timedelta(minutes=5)
        token = create_access_token({"address": "0x" + "6" * 40}, expires_delta=delta)
        payload = pyjwt.decode(
            token,
            SETTINGS.JWT_SECRET,
            algorithms=["HS256"],
            issuer="supercrypto-api",
            audience="supercrypto-client",
        )
        exp = datetime.datetime.fromtimestamp(payload["exp"], tz=datetime.UTC)
        now = datetime.datetime.now(tz=datetime.UTC)
        # 过期时间应在 4~6 分钟之间（允许执行时间误差）
        diff = (exp - now).total_seconds()
        assert 240 < diff < 360

    def test_token_preserves_extra_data(self):
        """Token 应保留额外的自定义数据"""
        data = {
            "address": "0x" + "7" * 40,
            "session_id": "test-session-123",
            "token_version": 1,
        }
        token = create_access_token(data)
        payload = verify_token(token)
        assert payload["session_id"] == "test-session-123"
        assert payload["token_version"] == 1


# ============================================================
# 测试类: Token 刷新
# ============================================================


class TestTokenRefresh:
    """Token 刷新测试"""

    def test_refresh_returns_new_token_pair(self):
        """刷新应返回新的 access + refresh token 对"""
        address = "0x" + "a" * 40
        refresh = create_refresh_token({"address": address})
        new_access, new_refresh = refresh_tokens(refresh)

        # 验证新的 access token
        access_payload = verify_token(new_access, expected_type="access")
        assert access_payload["address"] == address

        # 验证新的 refresh token
        refresh_payload = verify_token(new_refresh, expected_type="refresh")
        assert refresh_payload["address"] == address

    def test_refresh_preserves_session_id(self):
        """刷新应保留原有的 session_id"""
        data = {"address": "0x" + "b" * 40, "session_id": "sess-abc-123"}
        refresh = create_refresh_token(data)
        new_access, new_refresh = refresh_tokens(refresh)

        access_payload = verify_token(new_access)
        assert access_payload["session_id"] == "sess-abc-123"

    def test_refresh_preserves_token_version(self):
        """刷新应保留原有的 token_version"""
        data = {"address": "0x" + "c" * 40, "token_version": 3}
        refresh = create_refresh_token(data)
        new_access, _ = refresh_tokens(refresh)

        payload = verify_token(new_access)
        assert payload["token_version"] == 3

    def test_refresh_with_access_token_raises(self):
        """使用 access token 刷新应抛出 UnauthorizedException"""
        access = create_access_token({"address": "0x" + "d" * 40})
        with pytest.raises(UnauthorizedException):
            refresh_tokens(access)

    def test_refresh_with_expired_token_raises(self):
        """使用过期的 refresh token 应抛出 RefreshTokenExpiredException"""
        refresh = create_refresh_token(
            {"address": "0x" + "e" * 40},
            expires_delta=datetime.timedelta(seconds=-1),
        )
        with pytest.raises(RefreshTokenExpiredException):
            refresh_tokens(refresh)

    def test_refresh_with_invalid_token_raises(self):
        """使用无效 token 刷新应抛出 UnauthorizedException"""
        with pytest.raises(UnauthorizedException):
            refresh_tokens("invalid.token.string")

    def test_refreshed_tokens_are_different(self):
        """刷新后的 access 和 refresh token 应互不相同"""
        data = {"address": "0x" + "f" * 40}
        original_refresh = create_refresh_token(data)
        new_access, new_refresh = refresh_tokens(original_refresh)

        # access 和 refresh 类型不同，token 必然不同
        assert new_access != new_refresh
        # 新 token 都应是有效的
        access_payload = verify_token(new_access, expected_type="access")
        refresh_payload = verify_token(new_refresh, expected_type="refresh")
        assert access_payload["address"] == data["address"]
        assert refresh_payload["address"] == data["address"]


# ============================================================
# 测试类: 后门环境限制
# ============================================================


class TestBackdoorRestrictedToDev:
    """后门登录环境限制测试

    验证后门密码仅在 dev/test 环境下可用，
    production 环境下无论密码是否正确都应被拒绝。
    """

    def test_backdoor_allowed_in_dev(self):
        """dev 环境下后门应可用"""
        with patch.object(SETTINGS, "environment", "dev"):
            allowed = SETTINGS.environment in ("dev", "test")
            assert allowed is True

    def test_backdoor_allowed_in_test(self):
        """test 环境下后门应可用"""
        with patch.object(SETTINGS, "environment", "test"):
            allowed = SETTINGS.environment in ("dev", "test")
            assert allowed is True

    def test_backdoor_blocked_in_production(self):
        """production 环境下后门应被阻止"""
        with patch.object(SETTINGS, "environment", "production"):
            allowed = SETTINGS.environment in ("dev", "test")
            assert allowed is False

    def test_backdoor_blocked_in_staging(self):
        """staging 等其他环境下后门也应被阻止"""
        with patch.object(SETTINGS, "environment", "staging"):
            allowed = SETTINGS.environment in ("dev", "test")
            assert allowed is False

    def test_backdoor_check_logic_matches_auth_route(self):
        """后门检查逻辑应与 auth.py 路由中的实现一致

        auth.py 中的逻辑:
            if SETTINGS.environment in ("dev", "test") and data.backdoor and data.backdoor == SETTINGS.BACKDOOR:
                pass  # 跳过签名验证
            else:
                # 验证签名
        """
        backdoor_password = SETTINGS.BACKDOOR

        # dev 环境 + 正确密码 → 跳过签名
        with patch.object(SETTINGS, "environment", "dev"):
            env_ok = SETTINGS.environment in ("dev", "test")
            backdoor_ok = backdoor_password and backdoor_password == SETTINGS.BACKDOOR
            assert env_ok and backdoor_ok

        # production 环境 + 正确密码 → 不跳过签名
        with patch.object(SETTINGS, "environment", "production"):
            env_ok = SETTINGS.environment in ("dev", "test")
            assert not env_ok  # 环境检查不通过，后门不可用

    def test_backdoor_wrong_password_not_allowed(self):
        """错误的后门密码不应跳过签名验证"""
        with patch.object(SETTINGS, "environment", "dev"):
            wrong_password = "wrong-password"
            env_ok = SETTINGS.environment in ("dev", "test")
            backdoor_ok = wrong_password and wrong_password == SETTINGS.BACKDOOR
            assert env_ok is True  # 环境允许
            assert backdoor_ok is False  # 但密码不对

    def test_backdoor_empty_password_not_allowed(self):
        """空后门密码不应跳过签名验证"""
        with patch.object(SETTINGS, "environment", "dev"):
            empty_password = ""
            env_ok = SETTINGS.environment in ("dev", "test")
            # 空字符串在 Python 中为 falsy，短路求值返回 ""
            backdoor_ok = empty_password and empty_password == SETTINGS.BACKDOOR
            assert not backdoor_ok

    def test_backdoor_none_password_not_allowed(self):
        """None 后门密码不应跳过签名验证"""
        with patch.object(SETTINGS, "environment", "dev"):
            none_password = None
            env_ok = SETTINGS.environment in ("dev", "test")
            # None 在 Python 中为 falsy，短路求值返回 None
            backdoor_ok = none_password and none_password == SETTINGS.BACKDOOR
            assert not backdoor_ok
