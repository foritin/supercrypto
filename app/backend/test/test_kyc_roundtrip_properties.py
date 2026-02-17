"""
KYC 数据往返一致性属性测试

使用 pytest + hypothesis 进行属性测试，验证 KYC 数据提交后检索返回相同值。

Feature: kyc-backend-enhancement
**Validates: Requirements 1.3, 2.7, 3.3, 6.5**
"""

import asyncio
from datetime import date, timedelta
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

from src.schemas.enums import IdType, KycStatus, OnChainSyncStatus
from src.schemas.kyc import KycApplyRequest, KycDocumentInfo
from src.services.kyc_service import KycService


def run_async(coro):
    """辅助函数：运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ 测试数据生成策略 ============

# 有效邮箱生成器 - 使用符合 schema 验证的正则表达式
# Schema 使用: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
valid_emails = st.from_regex(
    r"[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,20}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,20}\.[a-zA-Z]{2,4}",
    fullmatch=True,
)

# E.164 电话号码生成器
# 格式: +[1-9][0-9]{1,14}
valid_phones = st.from_regex(r"\+[1-9][0-9]{6,14}", fullmatch=True)

# 地址字段生成器 - 使用字母、数字、空格和常见标点
address_line = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(
        whitelist_categories=("L", "N", "Zs"), whitelist_characters="-,.#/"
    ),
).filter(lambda x: len(x.strip()) > 0)

# 城市名称生成器
city_name = st.text(
    min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "Zs"))
).filter(lambda x: len(x.strip()) > 0)

# 州/省名称生成器
state_name = st.text(
    min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=("L", "Zs"))
).filter(lambda x: len(x.strip()) > 0)

# 邮政编码生成器
postal_code = st.text(
    min_size=3,
    max_size=10,
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-"),
).filter(lambda x: len(x.strip()) > 0)

# ISO 3166-1 alpha-2 国家代码
country_codes = st.sampled_from(
    ["US", "CN", "GB", "JP", "DE", "FR", "CA", "AU", "KR", "SG"]
)

# 钱包地址生成器 (以太坊地址格式)
wallet_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# 全名生成器
full_name_strategy = st.text(
    min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=("L", "Zs"))
).filter(lambda x: len(x.strip()) >= 2)


# 出生日期生成器 (18-100 岁)
def generate_valid_dob():
    """生成有效的出生日期 (18-100 岁)"""
    today = date.today()
    min_age = 18
    max_age = 100
    return st.dates(
        min_value=date(today.year - max_age, 1, 1),
        max_value=date(today.year - min_age, today.month, today.day),
    )


# 证件号码生成器
id_number_strategy = st.text(
    min_size=6, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "N"))
).filter(lambda x: len(x) >= 6)

# MinIO 路径生成器
minio_path_strategy = st.text(
    min_size=10,
    max_size=100,
    alphabet=st.characters(
        whitelist_categories=("Ll", "N"), whitelist_characters="/_-."
    ),
).map(lambda x: f"kyc/{x}.jpg")


def create_mock_kyc_record(
    kyc_id: int,
    address: str,
    email: Optional[str],
    phone: Optional[str],
    address_line1: Optional[str],
    address_line2: Optional[str],
    city: Optional[str],
    state: Optional[str],
    postal_code_val: Optional[str],
    residence_country: Optional[str],
    liveness_verified: bool,
    face_image_url: Optional[str],
    full_name: str,
    date_of_birth: date,
    country_code: Optional[str],
):
    """创建模拟 KYC 记录对象"""
    kyc = MagicMock()
    kyc.id = kyc_id
    kyc.address = address
    kyc.status = KycStatus.PENDING
    kyc.submitted_at = None
    kyc.reviewed_at = None
    kyc.reviewer_address = None
    kyc.reject_reason = None
    kyc.external_kyc_id = None
    kyc.country_code = country_code
    kyc.is_accredited = False
    kyc.full_name = full_name
    kyc.date_of_birth = date_of_birth
    kyc.selfie_url = None
    kyc.created_at = None
    kyc.updated_at = None
    kyc.on_chain_sync_status = OnChainSyncStatus.PENDING
    kyc.on_chain_tx_hash = None

    # 新增字段
    kyc.email = email
    kyc.phone = phone
    kyc.address_line1 = address_line1
    kyc.address_line2 = address_line2
    kyc.city = city
    kyc.state = state
    kyc.postal_code = postal_code_val
    kyc.residence_country = residence_country
    kyc.liveness_verified = liveness_verified
    kyc.face_image_url = face_image_url

    kyc.save = AsyncMock()
    return kyc


class TestProperty1KycDataRoundTripConsistency:
    """
    Property 1: KYC Data Round-Trip Consistency

    *For any* valid KYC application data containing contact info (email, phone),
    address fields (address_line1, city, state, postal_code, residence_country),
    and liveness fields (liveness_verified, face_image_url), submitting the application
    and then retrieving the KYC record SHALL return equivalent values for all fields.

    **Validates: Requirements 1.3, 2.7, 3.3, 6.5**
    """

    @given(
        wallet_address=wallet_address_strategy,
        email=st.one_of(st.none(), valid_emails),
        phone=st.one_of(st.none(), valid_phones),
        address_line1=st.one_of(st.none(), address_line),
        address_line2=st.one_of(st.none(), address_line),
        city=st.one_of(st.none(), city_name),
        state=st.one_of(st.none(), state_name),
        postal_code_val=st.one_of(st.none(), postal_code),
        residence_country=st.one_of(st.none(), country_codes),
        liveness_verified=st.booleans(),
        face_image_url=st.one_of(st.none(), minio_path_strategy),
        full_name=full_name_strategy,
        date_of_birth=generate_valid_dob(),
        country_code=st.one_of(st.none(), country_codes),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_kyc_data_roundtrip_consistency(
        self,
        wallet_address: str,
        email: Optional[str],
        phone: Optional[str],
        address_line1: Optional[str],
        address_line2: Optional[str],
        city: Optional[str],
        state: Optional[str],
        postal_code_val: Optional[str],
        residence_country: Optional[str],
        liveness_verified: bool,
        face_image_url: Optional[str],
        full_name: str,
        date_of_birth: date,
        country_code: Optional[str],
    ):
        """
        属性测试：KYC 数据往返一致性

        验证：
        1. 给定有效的 KYC 申请数据（包含联系信息、地址、活体检测字段）
        2. 提交 KYC 申请
        3. 检索 KYC 记录
        4. 返回的数据应该与提交的数据一致

        **Validates: Requirements 1.3, 2.7, 3.3, 6.5**
        """
        # 过滤掉空字符串
        email = email.strip() if email else None
        phone = phone.strip() if phone else None
        address_line1 = address_line1.strip() if address_line1 else None
        address_line2 = address_line2.strip() if address_line2 else None
        city = city.strip() if city else None
        state = state.strip() if state else None
        postal_code_val = postal_code_val.strip() if postal_code_val else None
        full_name = full_name.strip()

        # 确保 full_name 有效
        assume(len(full_name) >= 2)

        # 创建 KycService 实例
        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            kyc_service = KycService()

        # 创建有效的证件信息
        future_date = date.today() + timedelta(days=365 * 5)  # 5年后过期
        document = KycDocumentInfo(
            id_type=IdType.PASSPORT,
            id_number="E12345678",
            document_expiry=future_date,
            id_front_url="kyc/test/passport_front.jpg",
            id_back_url=None,  # 护照不需要背面
        )

        # 创建 KYC 申请请求
        apply_request = KycApplyRequest(
            wallet_address=wallet_address,
            country_code=country_code,
            full_name=full_name,
            date_of_birth=date_of_birth,
            documents=[document],
            selfie_url=None,
            email=email,
            phone=phone,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code=postal_code_val,
            residence_country=residence_country,
            liveness_verified=liveness_verified,
            face_image_url=face_image_url,
        )

        # 记录创建的 KYC 记录
        created_kyc = None

        async def mock_create(**kwargs):
            nonlocal created_kyc
            created_kyc = create_mock_kyc_record(
                kyc_id=1,
                address=kwargs.get("address"),
                email=kwargs.get("email"),
                phone=kwargs.get("phone"),
                address_line1=kwargs.get("address_line1"),
                address_line2=kwargs.get("address_line2"),
                city=kwargs.get("city"),
                state=kwargs.get("state"),
                postal_code_val=kwargs.get("postal_code"),
                residence_country=kwargs.get("residence_country"),
                liveness_verified=kwargs.get("liveness_verified", False),
                face_image_url=kwargs.get("face_image_url"),
                full_name=kwargs.get("full_name"),
                date_of_birth=kwargs.get("date_of_birth"),
                country_code=kwargs.get("country_code"),
            )
            return created_kyc

        with (
            patch("src.services.kyc_service.AccountKyc") as MockAccountKyc,
            patch(
                "src.services.kyc_service.AccountKycDocument"
            ) as MockAccountKycDocument,
        ):
            # 模拟不存在现有 KYC 记录
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=None)
            MockAccountKyc.create = mock_create

            # 模拟证件文档创建
            MockAccountKycDocument.create = AsyncMock(return_value=MagicMock(id=1))
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])

            # 执行 KYC 申请
            response = run_async(kyc_service.apply(apply_request))

        # 验证属性：返回的数据应该与提交的数据一致
        assert response is not None, "应该返回 KycFullResponse"

        # 验证联系信息字段 (Requirements 1.3)
        # 注意：email 会被转换为小写
        expected_email = email.lower() if email else None
        assert response.email == expected_email, (
            f"email 不一致: 提交 '{email}' (期望 '{expected_email}'), 返回 '{response.email}'"
        )
        assert response.phone == phone, (
            f"phone 不一致: 提交 '{phone}', 返回 '{response.phone}'"
        )

        # 验证居住地址字段 (Requirements 2.7)
        assert response.address_line1 == address_line1, (
            f"address_line1 不一致: 提交 '{address_line1}', 返回 '{response.address_line1}'"
        )
        assert response.address_line2 == address_line2, (
            f"address_line2 不一致: 提交 '{address_line2}', 返回 '{response.address_line2}'"
        )
        assert response.city == city, (
            f"city 不一致: 提交 '{city}', 返回 '{response.city}'"
        )
        assert response.state == state, (
            f"state 不一致: 提交 '{state}', 返回 '{response.state}'"
        )
        assert response.postal_code == postal_code_val, (
            f"postal_code 不一致: 提交 '{postal_code_val}', 返回 '{response.postal_code}'"
        )
        # 注意：residence_country 会被转换为大写
        expected_residence_country = (
            residence_country.upper() if residence_country else None
        )
        assert response.residence_country == expected_residence_country, (
            f"residence_country 不一致: 提交 '{residence_country}' (期望 '{expected_residence_country}'), 返回 '{response.residence_country}'"
        )

        # 验证活体检测字段 (Requirements 3.3)
        assert response.liveness_verified == liveness_verified, (
            f"liveness_verified 不一致: 提交 {liveness_verified}, 返回 {response.liveness_verified}"
        )
        # has_face_image 应该基于 face_image_url 是否存在
        expected_has_face_image = bool(face_image_url)
        assert response.has_face_image == expected_has_face_image, (
            f"has_face_image 不一致: 期望 {expected_has_face_image} (基于 face_image_url='{face_image_url}'), 返回 {response.has_face_image}"
        )

    @given(
        wallet_address=wallet_address_strategy,
        email=valid_emails,
        phone=valid_phones,
        address_line1=address_line,
        city=city_name,
        state=state_name,
        postal_code_val=postal_code,
        residence_country=country_codes,
        liveness_verified=st.just(True),
        face_image_url=minio_path_strategy,
        full_name=full_name_strategy,
        date_of_birth=generate_valid_dob(),
        country_code=country_codes,
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_kyc_data_roundtrip_all_fields_populated(
        self,
        wallet_address: str,
        email: str,
        phone: str,
        address_line1: str,
        city: str,
        state: str,
        postal_code_val: str,
        residence_country: str,
        liveness_verified: bool,
        face_image_url: str,
        full_name: str,
        date_of_birth: date,
        country_code: str,
    ):
        """
        属性测试：所有字段都填充时的 KYC 数据往返一致性

        验证：
        1. 给定所有字段都有值的 KYC 申请数据
        2. 提交 KYC 申请
        3. 检索 KYC 记录
        4. 所有字段都应该正确返回

        **Validates: Requirements 1.3, 2.7, 3.3, 6.5**
        """
        # 过滤掉空字符串
        email = email.strip()
        phone = phone.strip()
        address_line1 = address_line1.strip()
        city = city.strip()
        state = state.strip()
        postal_code_val = postal_code_val.strip()
        full_name = full_name.strip()

        # 确保所有字段有效
        assume(len(email) > 0)
        assume(len(phone) > 0)
        assume(len(address_line1) > 0)
        assume(len(city) > 0)
        assume(len(state) > 0)
        assume(len(postal_code_val) > 0)
        assume(len(full_name) >= 2)

        # 创建 KycService 实例
        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            kyc_service = KycService()

        # 创建有效的证件信息
        future_date = date.today() + timedelta(days=365 * 5)
        document = KycDocumentInfo(
            id_type=IdType.PASSPORT,
            id_number="E12345678",
            document_expiry=future_date,
            id_front_url="kyc/test/passport_front.jpg",
            id_back_url=None,
        )

        # 创建 KYC 申请请求
        apply_request = KycApplyRequest(
            wallet_address=wallet_address,
            country_code=country_code,
            full_name=full_name,
            date_of_birth=date_of_birth,
            documents=[document],
            selfie_url=None,
            email=email,
            phone=phone,
            address_line1=address_line1,
            address_line2=None,  # 可选字段
            city=city,
            state=state,
            postal_code=postal_code_val,
            residence_country=residence_country,
            liveness_verified=liveness_verified,
            face_image_url=face_image_url,
        )

        # 记录创建的 KYC 记录
        created_kyc = None

        async def mock_create(**kwargs):
            nonlocal created_kyc
            created_kyc = create_mock_kyc_record(
                kyc_id=1,
                address=kwargs.get("address"),
                email=kwargs.get("email"),
                phone=kwargs.get("phone"),
                address_line1=kwargs.get("address_line1"),
                address_line2=kwargs.get("address_line2"),
                city=kwargs.get("city"),
                state=kwargs.get("state"),
                postal_code_val=kwargs.get("postal_code"),
                residence_country=kwargs.get("residence_country"),
                liveness_verified=kwargs.get("liveness_verified", False),
                face_image_url=kwargs.get("face_image_url"),
                full_name=kwargs.get("full_name"),
                date_of_birth=kwargs.get("date_of_birth"),
                country_code=kwargs.get("country_code"),
            )
            return created_kyc

        with (
            patch("src.services.kyc_service.AccountKyc") as MockAccountKyc,
            patch(
                "src.services.kyc_service.AccountKycDocument"
            ) as MockAccountKycDocument,
        ):
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=None)
            MockAccountKyc.create = mock_create

            MockAccountKycDocument.create = AsyncMock(return_value=MagicMock(id=1))
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])

            response = run_async(kyc_service.apply(apply_request))

        # 验证所有字段都正确返回
        assert response is not None, "应该返回 KycFullResponse"

        # 联系信息
        assert response.email == email.lower(), "email 不一致"
        assert response.phone == phone, "phone 不一致"

        # 地址信息
        assert response.address_line1 == address_line1, "address_line1 不一致"
        assert response.city == city, "city 不一致"
        assert response.state == state, "state 不一致"
        assert response.postal_code == postal_code_val, "postal_code 不一致"
        assert response.residence_country == residence_country.upper(), (
            "residence_country 不一致"
        )

        # 活体检测
        assert response.liveness_verified == liveness_verified, (
            "liveness_verified 不一致"
        )
        assert response.has_face_image == True, "has_face_image 应该为 True"

    @given(
        wallet_address=wallet_address_strategy,
        full_name=full_name_strategy,
        date_of_birth=generate_valid_dob(),
    )
    @settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[
            HealthCheck.function_scoped_fixture,
            HealthCheck.too_slow,
        ],
    )
    def test_property_kyc_data_roundtrip_optional_fields_none(
        self,
        wallet_address: str,
        full_name: str,
        date_of_birth: date,
    ):
        """
        属性测试：可选字段为 None 时的 KYC 数据往返一致性

        验证：
        1. 给定只有必填字段的 KYC 申请数据（所有新增字段为 None）
        2. 提交 KYC 申请
        3. 检索 KYC 记录
        4. 所有可选字段应该返回 None 或默认值

        **Validates: Requirements 1.3, 2.7, 3.3, 6.5**
        """
        full_name = full_name.strip()
        assume(len(full_name) >= 2)

        # 创建 KycService 实例
        with patch("src.services.kyc_service.SETTINGS") as mock_settings:
            mock_settings.network = "hardhat"
            kyc_service = KycService()

        # 创建有效的证件信息
        future_date = date.today() + timedelta(days=365 * 5)
        document = KycDocumentInfo(
            id_type=IdType.PASSPORT,
            id_number="E12345678",
            document_expiry=future_date,
            id_front_url="kyc/test/passport_front.jpg",
            id_back_url=None,
        )

        # 创建 KYC 申请请求 - 所有新增字段为 None
        apply_request = KycApplyRequest(
            wallet_address=wallet_address,
            country_code=None,
            full_name=full_name,
            date_of_birth=date_of_birth,
            documents=[document],
            selfie_url=None,
            email=None,
            phone=None,
            address_line1=None,
            address_line2=None,
            city=None,
            state=None,
            postal_code=None,
            residence_country=None,
            liveness_verified=None,
            face_image_url=None,
        )

        # 记录创建的 KYC 记录
        created_kyc = None

        async def mock_create(**kwargs):
            nonlocal created_kyc
            created_kyc = create_mock_kyc_record(
                kyc_id=1,
                address=kwargs.get("address"),
                email=kwargs.get("email"),
                phone=kwargs.get("phone"),
                address_line1=kwargs.get("address_line1"),
                address_line2=kwargs.get("address_line2"),
                city=kwargs.get("city"),
                state=kwargs.get("state"),
                postal_code_val=kwargs.get("postal_code"),
                residence_country=kwargs.get("residence_country"),
                liveness_verified=kwargs.get("liveness_verified", False),
                face_image_url=kwargs.get("face_image_url"),
                full_name=kwargs.get("full_name"),
                date_of_birth=kwargs.get("date_of_birth"),
                country_code=kwargs.get("country_code"),
            )
            return created_kyc

        with (
            patch("src.services.kyc_service.AccountKyc") as MockAccountKyc,
            patch(
                "src.services.kyc_service.AccountKycDocument"
            ) as MockAccountKycDocument,
        ):
            MockAccountKyc.filter.return_value.first = AsyncMock(return_value=None)
            MockAccountKyc.create = mock_create

            MockAccountKycDocument.create = AsyncMock(return_value=MagicMock(id=1))
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])

            response = run_async(kyc_service.apply(apply_request))

        # 验证所有可选字段返回 None 或默认值
        assert response is not None, "应该返回 KycFullResponse"

        # 联系信息应该为 None
        assert response.email is None, f"email 应该为 None, 实际为 '{response.email}'"
        assert response.phone is None, f"phone 应该为 None, 实际为 '{response.phone}'"

        # 地址信息应该为 None
        assert response.address_line1 is None, "address_line1 应该为 None"
        assert response.address_line2 is None, "address_line2 应该为 None"
        assert response.city is None, "city 应该为 None"
        assert response.state is None, "state 应该为 None"
        assert response.postal_code is None, "postal_code 应该为 None"
        assert response.residence_country is None, "residence_country 应该为 None"

        # 活体检测默认值
        assert response.liveness_verified == False, "liveness_verified 应该为 False"
        assert response.has_face_image == False, "has_face_image 应该为 False"
