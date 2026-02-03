"""
KYC 响应 Schema 完整性属性测试

使用 pytest + hypothesis 进行属性测试，验证 KycFullResponse 包含所有新字段。

Feature: kyc-backend-enhancement
**Validates: Requirements 1.4, 2.8, 3.4, 6.1, 6.2, 6.3, 6.4**
"""

import asyncio
from datetime import date, timedelta
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume

from src.services.kyc.service import KycService
from src.services.kyc.schemas import KycFullResponse
from src.shared.schemas.enums import KycStatus, OnChainSyncStatus


def run_async(coro):
    """辅助函数：运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============ 测试数据生成策略 ============

# 有效邮箱生成器
valid_emails = st.from_regex(
    r'[a-zA-Z0-9][a-zA-Z0-9._%+-]{0,20}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,20}\.[a-zA-Z]{2,4}',
    fullmatch=True
)

# E.164 电话号码生成器
valid_phones = st.from_regex(r'\+[1-9][0-9]{6,14}', fullmatch=True)

# 地址字段生成器
address_line = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(
        whitelist_categories=('L', 'N', 'Zs'),
        whitelist_characters='-,.#/'
    )
).filter(lambda x: len(x.strip()) > 0)

# 城市名称生成器
city_name = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(whitelist_categories=('L', 'Zs'))
).filter(lambda x: len(x.strip()) > 0)

# 州/省名称生成器
state_name = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(whitelist_categories=('L', 'Zs'))
).filter(lambda x: len(x.strip()) > 0)

# 邮政编码生成器
postal_code = st.text(
    min_size=3,
    max_size=10,
    alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='-')
).filter(lambda x: len(x.strip()) > 0)

# ISO 3166-1 alpha-2 国家代码
country_codes = st.sampled_from(['US', 'CN', 'GB', 'JP', 'DE', 'FR', 'CA', 'AU', 'KR', 'SG'])

# 钱包地址生成器
wallet_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# 全名生成器
full_name_strategy = st.text(
    min_size=2,
    max_size=50,
    alphabet=st.characters(whitelist_categories=('L', 'Zs'))
).filter(lambda x: len(x.strip()) >= 2)

# MinIO 路径生成器
minio_path_strategy = st.text(
    min_size=10,
    max_size=100,
    alphabet=st.characters(whitelist_categories=('Ll', 'N'), whitelist_characters='/_-.')
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


class TestProperty4ResponseSchemaCompleteness:
    """
    Property 4: Response Schema Completeness

    *For any* AccountKyc record with populated new fields, converting to KycFullResponse
    SHALL include all contact info fields (email, phone), all address fields
    (address_line1, address_line2, city, state, postal_code, residence_country),
    and all liveness fields (liveness_verified, has_face_image).

    **Validates: Requirements 1.4, 2.8, 3.4, 6.1, 6.2, 6.3, 6.4**
    """

    @given(
        wallet_address=wallet_address_strategy,
        email=valid_emails,
        phone=valid_phones,
        address_line1=address_line,
        address_line2=st.one_of(st.none(), address_line),
        city=city_name,
        state=state_name,
        postal_code_val=postal_code,
        residence_country=country_codes,
        liveness_verified=st.booleans(),
        face_image_url=st.one_of(st.none(), minio_path_strategy),
        full_name=full_name_strategy,
        country_code=country_codes,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_response_contains_all_contact_info_fields(
        self,
        wallet_address: str,
        email: str,
        phone: str,
        address_line1: str,
        address_line2: Optional[str],
        city: str,
        state: str,
        postal_code_val: str,
        residence_country: str,
        liveness_verified: bool,
        face_image_url: Optional[str],
        full_name: str,
        country_code: str,
    ):
        """
        属性测试：KycFullResponse 包含所有联系信息字段

        验证：
        1. 给定一个 AccountKyc 记录，其中联系信息字段已填充
        2. 转换为 KycFullResponse
        3. 响应应该包含 email 和 phone 字段

        **Validates: Requirements 1.4, 6.1**
        """
        # 过滤掉空字符串
        email = email.strip()
        phone = phone.strip()
        full_name = full_name.strip()
        
        assume(len(email) > 0)
        assume(len(phone) > 0)
        assume(len(full_name) >= 2)
        
        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 创建模拟 KYC 记录
        mock_kyc = create_mock_kyc_record(
            kyc_id=1,
            address=wallet_address,
            email=email,
            phone=phone,
            address_line1=address_line1.strip() if address_line1 else None,
            address_line2=address_line2.strip() if address_line2 else None,
            city=city.strip() if city else None,
            state=state.strip() if state else None,
            postal_code_val=postal_code_val.strip() if postal_code_val else None,
            residence_country=residence_country,
            liveness_verified=liveness_verified,
            face_image_url=face_image_url,
            full_name=full_name,
            date_of_birth=date(1990, 1, 1),
            country_code=country_code,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            
            response = run_async(kyc_service._to_full_response(mock_kyc))

        # 验证响应包含联系信息字段 (Requirements 1.4, 6.1)
        assert hasattr(response, 'email'), "KycFullResponse 应该包含 email 字段"
        assert hasattr(response, 'phone'), "KycFullResponse 应该包含 phone 字段"
        assert response.email == email, f"email 不一致: 期望 '{email}', 实际 '{response.email}'"
        assert response.phone == phone, f"phone 不一致: 期望 '{phone}', 实际 '{response.phone}'"

    @given(
        wallet_address=wallet_address_strategy,
        email=st.one_of(st.none(), valid_emails),
        phone=st.one_of(st.none(), valid_phones),
        address_line1=address_line,
        address_line2=st.one_of(st.none(), address_line),
        city=city_name,
        state=state_name,
        postal_code_val=postal_code,
        residence_country=country_codes,
        liveness_verified=st.booleans(),
        face_image_url=st.one_of(st.none(), minio_path_strategy),
        full_name=full_name_strategy,
        country_code=country_codes,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_response_contains_all_address_fields(
        self,
        wallet_address: str,
        email: Optional[str],
        phone: Optional[str],
        address_line1: str,
        address_line2: Optional[str],
        city: str,
        state: str,
        postal_code_val: str,
        residence_country: str,
        liveness_verified: bool,
        face_image_url: Optional[str],
        full_name: str,
        country_code: str,
    ):
        """
        属性测试：KycFullResponse 包含所有居住地址字段

        验证：
        1. 给定一个 AccountKyc 记录，其中地址字段已填充
        2. 转换为 KycFullResponse
        3. 响应应该包含所有地址字段

        **Validates: Requirements 2.8, 6.2**
        """
        # 过滤掉空字符串
        address_line1 = address_line1.strip()
        address_line2 = address_line2.strip() if address_line2 else None
        city = city.strip()
        state = state.strip()
        postal_code_val = postal_code_val.strip()
        full_name = full_name.strip()
        
        assume(len(address_line1) > 0)
        assume(len(city) > 0)
        assume(len(state) > 0)
        assume(len(postal_code_val) > 0)
        assume(len(full_name) >= 2)
        
        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 创建模拟 KYC 记录
        mock_kyc = create_mock_kyc_record(
            kyc_id=1,
            address=wallet_address,
            email=email.strip() if email else None,
            phone=phone.strip() if phone else None,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code_val=postal_code_val,
            residence_country=residence_country,
            liveness_verified=liveness_verified,
            face_image_url=face_image_url,
            full_name=full_name,
            date_of_birth=date(1990, 1, 1),
            country_code=country_code,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            
            response = run_async(kyc_service._to_full_response(mock_kyc))

        # 验证响应包含所有地址字段 (Requirements 2.8, 6.2)
        assert hasattr(response, 'address_line1'), "KycFullResponse 应该包含 address_line1 字段"
        assert hasattr(response, 'address_line2'), "KycFullResponse 应该包含 address_line2 字段"
        assert hasattr(response, 'city'), "KycFullResponse 应该包含 city 字段"
        assert hasattr(response, 'state'), "KycFullResponse 应该包含 state 字段"
        assert hasattr(response, 'postal_code'), "KycFullResponse 应该包含 postal_code 字段"
        assert hasattr(response, 'residence_country'), "KycFullResponse 应该包含 residence_country 字段"
        
        assert response.address_line1 == address_line1, f"address_line1 不一致"
        assert response.address_line2 == address_line2, f"address_line2 不一致"
        assert response.city == city, f"city 不一致"
        assert response.state == state, f"state 不一致"
        assert response.postal_code == postal_code_val, f"postal_code 不一致"
        assert response.residence_country == residence_country, f"residence_country 不一致"


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
        country_code=st.one_of(st.none(), country_codes),
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_response_contains_all_liveness_fields(
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
        country_code: Optional[str],
    ):
        """
        属性测试：KycFullResponse 包含所有活体检测字段

        验证：
        1. 给定一个 AccountKyc 记录，其中活体检测字段已设置
        2. 转换为 KycFullResponse
        3. 响应应该包含 liveness_verified 和 has_face_image 字段

        **Validates: Requirements 3.4, 6.3, 6.4**
        """
        full_name = full_name.strip()
        assume(len(full_name) >= 2)
        
        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 创建模拟 KYC 记录
        mock_kyc = create_mock_kyc_record(
            kyc_id=1,
            address=wallet_address,
            email=email.strip() if email else None,
            phone=phone.strip() if phone else None,
            address_line1=address_line1.strip() if address_line1 else None,
            address_line2=address_line2.strip() if address_line2 else None,
            city=city.strip() if city else None,
            state=state.strip() if state else None,
            postal_code_val=postal_code_val.strip() if postal_code_val else None,
            residence_country=residence_country,
            liveness_verified=liveness_verified,
            face_image_url=face_image_url,
            full_name=full_name,
            date_of_birth=date(1990, 1, 1),
            country_code=country_code,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            
            response = run_async(kyc_service._to_full_response(mock_kyc))

        # 验证响应包含活体检测字段 (Requirements 3.4, 6.3, 6.4)
        assert hasattr(response, 'liveness_verified'), "KycFullResponse 应该包含 liveness_verified 字段"
        assert hasattr(response, 'has_face_image'), "KycFullResponse 应该包含 has_face_image 字段"
        
        assert response.liveness_verified == liveness_verified, (
            f"liveness_verified 不一致: 期望 {liveness_verified}, 实际 {response.liveness_verified}"
        )
        
        # has_face_image 应该基于 face_image_url 是否存在
        expected_has_face_image = bool(face_image_url)
        assert response.has_face_image == expected_has_face_image, (
            f"has_face_image 不一致: 期望 {expected_has_face_image} (基于 face_image_url='{face_image_url}'), "
            f"实际 {response.has_face_image}"
        )


    @given(
        wallet_address=wallet_address_strategy,
        email=valid_emails,
        phone=valid_phones,
        address_line1=address_line,
        address_line2=address_line,
        city=city_name,
        state=state_name,
        postal_code_val=postal_code,
        residence_country=country_codes,
        face_image_url=minio_path_strategy,
        full_name=full_name_strategy,
        country_code=country_codes,
    )
    @settings(
        max_examples=100,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_response_schema_completeness_all_fields_populated(
        self,
        wallet_address: str,
        email: str,
        phone: str,
        address_line1: str,
        address_line2: str,
        city: str,
        state: str,
        postal_code_val: str,
        residence_country: str,
        face_image_url: str,
        full_name: str,
        country_code: str,
    ):
        """
        属性测试：所有新字段都填充时，KycFullResponse 包含完整数据

        验证：
        1. 给定一个 AccountKyc 记录，所有新字段都已填充
        2. 转换为 KycFullResponse
        3. 响应应该包含所有字段且值正确

        **Validates: Requirements 1.4, 2.8, 3.4, 6.1, 6.2, 6.3, 6.4**
        """
        # 过滤掉空字符串
        email = email.strip()
        phone = phone.strip()
        address_line1 = address_line1.strip()
        address_line2 = address_line2.strip()
        city = city.strip()
        state = state.strip()
        postal_code_val = postal_code_val.strip()
        full_name = full_name.strip()
        
        assume(len(email) > 0)
        assume(len(phone) > 0)
        assume(len(address_line1) > 0)
        assume(len(address_line2) > 0)
        assume(len(city) > 0)
        assume(len(state) > 0)
        assume(len(postal_code_val) > 0)
        assume(len(full_name) >= 2)
        
        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 创建模拟 KYC 记录 - 所有字段都填充
        mock_kyc = create_mock_kyc_record(
            kyc_id=1,
            address=wallet_address,
            email=email,
            phone=phone,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code_val=postal_code_val,
            residence_country=residence_country,
            liveness_verified=True,
            face_image_url=face_image_url,
            full_name=full_name,
            date_of_birth=date(1990, 1, 1),
            country_code=country_code,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            
            response = run_async(kyc_service._to_full_response(mock_kyc))

        # 验证响应是 KycFullResponse 类型
        assert isinstance(response, KycFullResponse), "应该返回 KycFullResponse 类型"
        
        # 验证联系信息字段 (Requirements 1.4, 6.1)
        assert response.email == email, f"email 不一致"
        assert response.phone == phone, f"phone 不一致"
        
        # 验证地址字段 (Requirements 2.8, 6.2)
        assert response.address_line1 == address_line1, f"address_line1 不一致"
        assert response.address_line2 == address_line2, f"address_line2 不一致"
        assert response.city == city, f"city 不一致"
        assert response.state == state, f"state 不一致"
        assert response.postal_code == postal_code_val, f"postal_code 不一致"
        assert response.residence_country == residence_country, f"residence_country 不一致"
        
        # 验证活体检测字段 (Requirements 3.4, 6.3, 6.4)
        assert response.liveness_verified == True, f"liveness_verified 应该为 True"
        assert response.has_face_image == True, f"has_face_image 应该为 True"


    @given(
        wallet_address=wallet_address_strategy,
        full_name=full_name_strategy,
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow],
    )
    def test_property_response_schema_completeness_all_fields_none(
        self,
        wallet_address: str,
        full_name: str,
    ):
        """
        属性测试：所有新字段为 None 时，KycFullResponse 仍包含所有字段

        验证：
        1. 给定一个 AccountKyc 记录，所有新字段都为 None
        2. 转换为 KycFullResponse
        3. 响应应该包含所有字段（值为 None 或默认值）

        **Validates: Requirements 1.4, 2.8, 3.4, 6.1, 6.2, 6.3, 6.4**
        """
        full_name = full_name.strip()
        assume(len(full_name) >= 2)
        
        # 创建 KycService 实例
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 创建模拟 KYC 记录 - 所有新字段为 None
        mock_kyc = create_mock_kyc_record(
            kyc_id=1,
            address=wallet_address,
            email=None,
            phone=None,
            address_line1=None,
            address_line2=None,
            city=None,
            state=None,
            postal_code_val=None,
            residence_country=None,
            liveness_verified=False,
            face_image_url=None,
            full_name=full_name,
            date_of_birth=date(1990, 1, 1),
            country_code=None,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            
            response = run_async(kyc_service._to_full_response(mock_kyc))

        # 验证响应是 KycFullResponse 类型
        assert isinstance(response, KycFullResponse), "应该返回 KycFullResponse 类型"
        
        # 验证联系信息字段存在且为 None (Requirements 1.4, 6.1)
        assert hasattr(response, 'email'), "KycFullResponse 应该包含 email 字段"
        assert hasattr(response, 'phone'), "KycFullResponse 应该包含 phone 字段"
        assert response.email is None, f"email 应该为 None, 实际为 '{response.email}'"
        assert response.phone is None, f"phone 应该为 None, 实际为 '{response.phone}'"
        
        # 验证地址字段存在且为 None (Requirements 2.8, 6.2)
        assert hasattr(response, 'address_line1'), "KycFullResponse 应该包含 address_line1 字段"
        assert hasattr(response, 'address_line2'), "KycFullResponse 应该包含 address_line2 字段"
        assert hasattr(response, 'city'), "KycFullResponse 应该包含 city 字段"
        assert hasattr(response, 'state'), "KycFullResponse 应该包含 state 字段"
        assert hasattr(response, 'postal_code'), "KycFullResponse 应该包含 postal_code 字段"
        assert hasattr(response, 'residence_country'), "KycFullResponse 应该包含 residence_country 字段"
        
        assert response.address_line1 is None, f"address_line1 应该为 None"
        assert response.address_line2 is None, f"address_line2 应该为 None"
        assert response.city is None, f"city 应该为 None"
        assert response.state is None, f"state 应该为 None"
        assert response.postal_code is None, f"postal_code 应该为 None"
        assert response.residence_country is None, f"residence_country 应该为 None"
        
        # 验证活体检测字段存在且为默认值 (Requirements 3.4, 6.3, 6.4)
        assert hasattr(response, 'liveness_verified'), "KycFullResponse 应该包含 liveness_verified 字段"
        assert hasattr(response, 'has_face_image'), "KycFullResponse 应该包含 has_face_image 字段"
        assert response.liveness_verified == False, f"liveness_verified 应该为 False"
        assert response.has_face_image == False, f"has_face_image 应该为 False"


    # ============ 单元测试：边界条件 ============

    def test_response_schema_has_all_required_fields(self):
        """
        单元测试：验证 KycFullResponse schema 定义包含所有新字段

        **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
        """
        # 获取 KycFullResponse 的所有字段
        response_fields = KycFullResponse.model_fields.keys()
        
        # 验证联系信息字段 (Requirements 6.1)
        assert 'email' in response_fields, "KycFullResponse 应该定义 email 字段"
        assert 'phone' in response_fields, "KycFullResponse 应该定义 phone 字段"
        
        # 验证地址字段 (Requirements 6.2)
        assert 'address_line1' in response_fields, "KycFullResponse 应该定义 address_line1 字段"
        assert 'address_line2' in response_fields, "KycFullResponse 应该定义 address_line2 字段"
        assert 'city' in response_fields, "KycFullResponse 应该定义 city 字段"
        assert 'state' in response_fields, "KycFullResponse 应该定义 state 字段"
        assert 'postal_code' in response_fields, "KycFullResponse 应该定义 postal_code 字段"
        assert 'residence_country' in response_fields, "KycFullResponse 应该定义 residence_country 字段"
        
        # 验证活体检测字段 (Requirements 6.3, 6.4)
        assert 'liveness_verified' in response_fields, "KycFullResponse 应该定义 liveness_verified 字段"
        assert 'has_face_image' in response_fields, "KycFullResponse 应该定义 has_face_image 字段"

    def test_response_field_types_correct(self):
        """
        单元测试：验证 KycFullResponse 字段类型正确

        **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
        """
        fields = KycFullResponse.model_fields
        
        # 联系信息字段类型
        assert fields['email'].annotation == Optional[str], "email 应该是 Optional[str] 类型"
        assert fields['phone'].annotation == Optional[str], "phone 应该是 Optional[str] 类型"
        
        # 地址字段类型
        assert fields['address_line1'].annotation == Optional[str], "address_line1 应该是 Optional[str] 类型"
        assert fields['address_line2'].annotation == Optional[str], "address_line2 应该是 Optional[str] 类型"
        assert fields['city'].annotation == Optional[str], "city 应该是 Optional[str] 类型"
        assert fields['state'].annotation == Optional[str], "state 应该是 Optional[str] 类型"
        assert fields['postal_code'].annotation == Optional[str], "postal_code 应该是 Optional[str] 类型"
        assert fields['residence_country'].annotation == Optional[str], "residence_country 应该是 Optional[str] 类型"
        
        # 活体检测字段类型
        assert fields['liveness_verified'].annotation == bool, "liveness_verified 应该是 bool 类型"
        assert fields['has_face_image'].annotation == bool, "has_face_image 应该是 bool 类型"

    def test_has_face_image_derived_from_face_image_url(self):
        """
        单元测试：验证 has_face_image 是从 face_image_url 派生的

        **Validates: Requirements 6.4**
        """
        with patch("src.services.kyc.service.SETTINGS") as mock_settings:
            mock_settings.environment = "hardhat"
            kyc_service = KycService()

        # 测试 face_image_url 存在时
        mock_kyc_with_face = create_mock_kyc_record(
            kyc_id=1,
            address="0x" + "a" * 40,
            email=None,
            phone=None,
            address_line1=None,
            address_line2=None,
            city=None,
            state=None,
            postal_code_val=None,
            residence_country=None,
            liveness_verified=True,
            face_image_url="kyc/test/face.jpg",
            full_name="Test User",
            date_of_birth=date(1990, 1, 1),
            country_code=None,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            response_with_face = run_async(kyc_service._to_full_response(mock_kyc_with_face))

        assert response_with_face.has_face_image == True, "有 face_image_url 时 has_face_image 应该为 True"

        # 测试 face_image_url 不存在时
        mock_kyc_without_face = create_mock_kyc_record(
            kyc_id=2,
            address="0x" + "b" * 40,
            email=None,
            phone=None,
            address_line1=None,
            address_line2=None,
            city=None,
            state=None,
            postal_code_val=None,
            residence_country=None,
            liveness_verified=True,
            face_image_url=None,
            full_name="Test User",
            date_of_birth=date(1990, 1, 1),
            country_code=None,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            response_without_face = run_async(kyc_service._to_full_response(mock_kyc_without_face))

        assert response_without_face.has_face_image == False, "无 face_image_url 时 has_face_image 应该为 False"

        # 测试 face_image_url 为空字符串时
        mock_kyc_empty_face = create_mock_kyc_record(
            kyc_id=3,
            address="0x" + "c" * 40,
            email=None,
            phone=None,
            address_line1=None,
            address_line2=None,
            city=None,
            state=None,
            postal_code_val=None,
            residence_country=None,
            liveness_verified=True,
            face_image_url="",
            full_name="Test User",
            date_of_birth=date(1990, 1, 1),
            country_code=None,
        )

        with patch("src.services.kyc.service.AccountKycDocument") as MockAccountKycDocument:
            MockAccountKycDocument.filter.return_value.all = AsyncMock(return_value=[])
            response_empty_face = run_async(kyc_service._to_full_response(mock_kyc_empty_face))

        assert response_empty_face.has_face_image == False, "空字符串 face_image_url 时 has_face_image 应该为 False"
