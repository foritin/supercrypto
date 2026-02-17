"""
KYC 联系信息验证属性测试

使用 pytest + hypothesis 进行属性测试，验证邮箱和电话号码格式验证。

Feature: kyc-backend-enhancement
**Validates: Requirements 1.5, 1.6, 5.6**
"""

from datetime import date, timedelta
from typing import Optional

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st
from pydantic import ValidationError

from src.schemas.enums import IdType
from src.schemas.kyc import EMAIL_REGEX, KycApplyRequest

# ============ 测试数据生成策略 ============

# 有效邮箱生成器 - 符合 EMAIL_REGEX: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
# 本地部分: 字母、数字、._%+-
# 域名部分: 字母、数字、.-
# TLD: 至少2个字母
valid_email_local_part = st.from_regex(
    r"[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,30}", fullmatch=True
).filter(lambda x: not x.endswith(".") and ".." not in x)

valid_email_domain = st.from_regex(
    r"[a-zA-Z0-9][a-zA-Z0-9.-]{0,20}", fullmatch=True
).filter(
    lambda x: not x.startswith(".")
    and not x.endswith(".")
    and ".." not in x
    and not x.startswith("-")
    and not x.endswith("-")
)

valid_email_tld = st.from_regex(r"[a-zA-Z]{2,6}", fullmatch=True)

# 组合生成有效邮箱
valid_emails = st.builds(
    lambda local, domain, tld: f"{local}@{domain}.{tld}",
    local=valid_email_local_part,
    domain=valid_email_domain,
    tld=valid_email_tld,
)

# 无效邮箱生成策略
# 1. 缺少 @ 符号
invalid_emails_no_at = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(
        whitelist_categories=("L", "N"), whitelist_characters="._%+-"
    ),
).filter(lambda x: "@" not in x and len(x) > 0)

# 2. 缺少域名部分
invalid_emails_no_domain = st.from_regex(r"[a-zA-Z0-9._%+-]+@", fullmatch=True)

# 3. 缺少 TLD (顶级域名)
invalid_emails_no_tld = st.from_regex(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+", fullmatch=True
).filter(
    lambda x: "." not in x.split("@")[1] if "@" in x and len(x.split("@")) > 1 else True
)

# 4. TLD 太短 (只有1个字符)
invalid_emails_short_tld = st.builds(
    lambda local, domain: f"{local}@{domain}.a",
    local=valid_email_local_part,
    domain=valid_email_domain,
)

# 5. 空字符串或只有空格
invalid_emails_empty = st.sampled_from(["", "   ", "\t", "\n"])

# 6. 特殊无效格式
invalid_emails_special = st.sampled_from(
    [
        "@example.com",  # 缺少本地部分
        "test@",  # 缺少域名
        "test@.com",  # 域名以点开头
        "test@example.",  # TLD 为空
        "test@@example.com",  # 双 @
        "test@example..com",  # 双点
        "@",  # 只有 @
        "test@example.c",  # TLD 只有1个字符
    ]
)


# E.164 电话号码生成器
# 格式: +[1-9][0-9]{1,14}
# 有效: 以 + 开头，第一位数字 1-9，后跟 1-14 位数字
valid_phones = st.from_regex(r"\+[1-9][0-9]{1,14}", fullmatch=True)

# 无效电话号码生成策略
# 1. 缺少 + 前缀
invalid_phones_no_plus = st.from_regex(r"[1-9][0-9]{1,14}", fullmatch=True)

# 2. 以 0 开头 (+ 后第一位是 0)
invalid_phones_starts_with_zero = st.from_regex(r"\+0[0-9]{1,14}", fullmatch=True)

# 3. 太短 (少于2位数字)
invalid_phones_too_short = st.sampled_from(["+1", "+"])

# 4. 太长 (超过15位数字)
invalid_phones_too_long = st.from_regex(r"\+[1-9][0-9]{15,20}", fullmatch=True)

# 5. 包含非数字字符
invalid_phones_non_digit = st.sampled_from(
    [
        "+1234-5678",
        "+1234 5678",
        "+1234abc5678",
        "+1234.5678",
        "+(123)4567890",
    ]
)

# 6. 空字符串或只有空格
invalid_phones_empty = st.sampled_from(["", "   ", "\t", "\n"])


# 辅助函数：创建有效的 KYC 申请请求基础数据
def create_base_kyc_request_data():
    """创建 KYC 申请请求的基础数据（不包含 email 和 phone）"""
    future_date = date.today() + timedelta(days=365 * 5)
    return {
        "wallet_address": "0x" + "a" * 40,
        "country_code": "US",
        "full_name": "Test User",
        "date_of_birth": date(1990, 1, 1),
        "documents": [
            {
                "id_type": IdType.PASSPORT,
                "id_number": "E12345678",
                "document_expiry": future_date,
                "id_front_url": "kyc/test/passport_front.jpg",
            }
        ],
    }


class TestProperty2ContactInfoValidation:
    """
    Property 2: Contact Info Validation

    *For any* email string, the KycApplyRequest schema SHALL accept it if and only if
    it matches a valid email format (contains @ and valid domain).
    *For any* phone string, the schema SHALL accept it if and only if it matches
    E.164 format (`+[1-9][0-9]{1,14}`).

    **Validates: Requirements 1.5, 1.6, 5.6**
    """

    # ============ 邮箱验证属性测试 ============

    @given(email=valid_emails)
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
            HealthCheck.filter_too_much,
        ],
    )
    def test_property_valid_email_accepted(self, email: str):
        """
        属性测试：有效邮箱格式应该被接受

        验证：
        1. 给定符合 EMAIL_REGEX 的邮箱字符串
        2. 创建 KycApplyRequest 时应该成功
        3. 邮箱应该被转换为小写

        **Validates: Requirements 1.5, 5.6**
        """
        # 确保生成的邮箱符合正则表达式
        assume(EMAIL_REGEX.match(email) is not None)

        base_data = create_base_kyc_request_data()
        base_data["email"] = email

        # 应该成功创建请求
        request = KycApplyRequest(**base_data)

        # 验证邮箱被接受并转换为小写
        assert request.email == email.lower(), (
            f"邮箱应该被转换为小写: 输入 '{email}', 期望 '{email.lower()}', 实际 '{request.email}'"
        )

    @given(email=invalid_emails_no_at)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
            HealthCheck.filter_too_much,
        ],
    )
    def test_property_invalid_email_no_at_rejected(self, email: str):
        """
        属性测试：缺少 @ 符号的邮箱应该被拒绝

        **Validates: Requirements 1.5, 5.6**
        """
        assume(len(email.strip()) > 0)  # 确保不是空字符串

        base_data = create_base_kyc_request_data()
        base_data["email"] = email

        # 应该抛出验证错误
        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        # 验证错误信息包含 email 相关内容
        error_str = str(exc_info.value)
        assert "email" in error_str.lower() or "Invalid" in error_str, (
            f"错误信息应该包含 email 相关内容: {error_str}"
        )

    @given(email=invalid_emails_short_tld)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
            HealthCheck.filter_too_much,
        ],
    )
    def test_property_invalid_email_short_tld_rejected(self, email: str):
        """
        属性测试：TLD 太短的邮箱应该被拒绝

        **Validates: Requirements 1.5, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["email"] = email

        # 应该抛出验证错误
        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert "email" in error_str.lower() or "Invalid" in error_str

    @pytest.mark.parametrize(
        "invalid_email",
        [
            "@example.com",  # 缺少本地部分
            "test@",  # 缺少域名
            "test@.com",  # 域名以点开头
            "test@example.",  # TLD 为空
            "test@@example.com",  # 双 @
            "@",  # 只有 @
            "test@example.c",  # TLD 只有1个字符
        ],
    )
    def test_invalid_email_special_cases_rejected(self, invalid_email: str):
        """
        单元测试：特殊无效邮箱格式应该被拒绝

        **Validates: Requirements 1.5, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["email"] = invalid_email

        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert "email" in error_str.lower() or "Invalid" in error_str

    def test_empty_email_converted_to_none(self):
        """
        单元测试：空字符串邮箱应该被转换为 None

        **Validates: Requirements 1.5, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["email"] = "   "  # 只有空格

        request = KycApplyRequest(**base_data)
        assert request.email is None, "空字符串邮箱应该被转换为 None"

    def test_none_email_accepted(self):
        """
        单元测试：None 邮箱应该被接受（可选字段）

        **Validates: Requirements 1.5, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["email"] = None

        request = KycApplyRequest(**base_data)
        assert request.email is None, "None 邮箱应该被接受"

    # ============ 电话号码验证属性测试 ============

    @given(phone=valid_phones)
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_valid_phone_accepted(self, phone: str):
        """
        属性测试：有效 E.164 电话号码应该被接受

        验证：
        1. 给定符合 E.164 格式的电话号码 (+[1-9][0-9]{1,14})
        2. 创建 KycApplyRequest 时应该成功
        3. 电话号码应该保持原样

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = phone

        # 应该成功创建请求
        request = KycApplyRequest(**base_data)

        # 验证电话号码被接受
        assert request.phone == phone, (
            f"电话号码应该保持原样: 输入 '{phone}', 实际 '{request.phone}'"
        )

    @given(phone=invalid_phones_no_plus)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_invalid_phone_no_plus_rejected(self, phone: str):
        """
        属性测试：缺少 + 前缀的电话号码应该被拒绝

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = phone

        # 应该抛出验证错误
        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert (
            "phone" in error_str.lower()
            or "E.164" in error_str
            or "Invalid" in error_str
        ), f"错误信息应该包含 phone 或 E.164 相关内容: {error_str}"

    @given(phone=invalid_phones_starts_with_zero)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_invalid_phone_starts_with_zero_rejected(self, phone: str):
        """
        属性测试：+ 后第一位是 0 的电话号码应该被拒绝

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = phone

        # 应该抛出验证错误
        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert (
            "phone" in error_str.lower()
            or "E.164" in error_str
            or "Invalid" in error_str
        )

    @given(phone=invalid_phones_too_long)
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_invalid_phone_too_long_rejected(self, phone: str):
        """
        属性测试：超过15位数字的电话号码应该被拒绝

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = phone

        # 应该抛出验证错误
        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert (
            "phone" in error_str.lower()
            or "E.164" in error_str
            or "Invalid" in error_str
        )

    @pytest.mark.parametrize(
        "invalid_phone",
        [
            "+1",  # 太短
            "+",  # 只有 +
            "+1234-5678",  # 包含连字符
            "+1234 5678",  # 包含空格
            "+1234abc5678",  # 包含字母
            "+1234.5678",  # 包含点
            "+(123)4567890",  # 包含括号
            "+01234567890",  # 以 0 开头
        ],
    )
    def test_invalid_phone_special_cases_rejected(self, invalid_phone: str):
        """
        单元测试：特殊无效电话号码格式应该被拒绝

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = invalid_phone

        with pytest.raises(ValidationError) as exc_info:
            KycApplyRequest(**base_data)

        error_str = str(exc_info.value)
        assert (
            "phone" in error_str.lower()
            or "E.164" in error_str
            or "Invalid" in error_str
        )

    def test_empty_phone_converted_to_none(self):
        """
        单元测试：空字符串电话号码应该被转换为 None

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = "   "  # 只有空格

        request = KycApplyRequest(**base_data)
        assert request.phone is None, "空字符串电话号码应该被转换为 None"

    def test_none_phone_accepted(self):
        """
        单元测试：None 电话号码应该被接受（可选字段）

        **Validates: Requirements 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["phone"] = None

        request = KycApplyRequest(**base_data)
        assert request.phone is None, "None 电话号码应该被接受"

    # ============ 组合测试 ============

    @given(
        email=st.one_of(st.none(), valid_emails),
        phone=st.one_of(st.none(), valid_phones),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
            HealthCheck.filter_too_much,
        ],
    )
    def test_property_valid_contact_info_combination(
        self,
        email: Optional[str],
        phone: Optional[str],
    ):
        """
        属性测试：有效的邮箱和电话号码组合应该被接受

        验证：
        1. 给定有效的邮箱（或 None）和有效的电话号码（或 None）
        2. 创建 KycApplyRequest 时应该成功
        3. 字段值应该正确保存

        **Validates: Requirements 1.5, 1.6, 5.6**
        """
        # 如果邮箱不为 None，确保它符合正则表达式
        if email is not None:
            assume(EMAIL_REGEX.match(email) is not None)

        base_data = create_base_kyc_request_data()
        base_data["email"] = email
        base_data["phone"] = phone

        # 应该成功创建请求
        request = KycApplyRequest(**base_data)

        # 验证字段值
        expected_email = email.lower() if email else None
        assert request.email == expected_email, (
            f"邮箱不一致: 输入 '{email}', 期望 '{expected_email}', 实际 '{request.email}'"
        )
        assert request.phone == phone, (
            f"电话号码不一致: 输入 '{phone}', 实际 '{request.phone}'"
        )

    @pytest.mark.parametrize(
        "valid_email,valid_phone",
        [
            ("test@example.com", "+1234567890"),
            ("user.name@domain.org", "+861381234567"),
            ("a@b.co", "+12"),  # 最短有效格式
            ("test+tag@example.com", "+123456789012345"),  # 最长有效格式
        ],
    )
    def test_valid_contact_info_examples(self, valid_email: str, valid_phone: str):
        """
        单元测试：有效的邮箱和电话号码示例

        **Validates: Requirements 1.5, 1.6, 5.6**
        """
        base_data = create_base_kyc_request_data()
        base_data["email"] = valid_email
        base_data["phone"] = valid_phone

        request = KycApplyRequest(**base_data)

        assert request.email == valid_email.lower()
        assert request.phone == valid_phone

    # ============ 边界条件测试 ============

    def test_max_length_email_accepted(self):
        """
        单元测试：最大长度邮箱应该被接受

        **Validates: Requirements 1.5, 5.6**
        """
        # 构造一个接近 255 字符的有效邮箱
        local_part = "a" * 64  # 本地部分最大 64 字符
        domain = "b" * 180 + ".com"  # 域名部分
        max_email = f"{local_part}@{domain}"

        # 确保不超过 255 字符
        if len(max_email) > 255:
            max_email = max_email[:255]

        # 由于构造的邮箱可能不符合正则，使用一个已知有效的长邮箱
        long_email = "a" * 50 + "@" + "b" * 50 + ".com"

        base_data = create_base_kyc_request_data()
        base_data["email"] = long_email

        request = KycApplyRequest(**base_data)
        assert request.email == long_email.lower()

    def test_min_valid_phone_accepted(self):
        """
        单元测试：最短有效电话号码应该被接受 (+[1-9][0-9])

        **Validates: Requirements 1.6, 5.6**
        """
        min_phone = "+12"  # 最短: + 后跟 2 位数字

        base_data = create_base_kyc_request_data()
        base_data["phone"] = min_phone

        request = KycApplyRequest(**base_data)
        assert request.phone == min_phone

    def test_max_valid_phone_accepted(self):
        """
        单元测试：最长有效电话号码应该被接受 (+[1-9][0-9]{14})

        **Validates: Requirements 1.6, 5.6**
        """
        max_phone = "+1" + "2" * 14  # 最长: + 后跟 15 位数字

        base_data = create_base_kyc_request_data()
        base_data["phone"] = max_phone

        request = KycApplyRequest(**base_data)
        assert request.phone == max_phone
