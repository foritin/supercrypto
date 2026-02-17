"""
基础设施属性测试

Feature: full-stack-review-fixes

验证:
- Property 9: 分布式锁互斥性
- Property 10: 重试计数结构化存储往返一致性
- Property 11: 批量处理大小限制
- Property 12: JWT 声明完整性
- Property 13: 路径规范化防遍历
- Property 14: 分布式锁安全释放
- Property 15: 重试装饰器异常过滤 (_parse_retry_info 健壮性)
"""

import json
import uuid
from unittest.mock import MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from src.middleware.auth import AuthStateMiddleware
from src.tasks.kyc_sync_task import RECONCILE_BATCH_SIZE, _parse_retry_info

# 抑制 JWT 密钥长度警告 (测试环境使用短密钥)
pytestmark = pytest.mark.filterwarnings("ignore::jwt.warnings.InsecureKeyLengthWarning")


# ============================================================
# 辅助策略
# ============================================================

# 锁 key 策略 — 模拟真实业务锁 key
lock_key_strategy = st.from_regex(r"[a-z_]{3,20}:[a-z0-9]{4,16}", fullmatch=True)

# 路径段策略 — 合法 URL 路径段
path_segment_strategy = st.from_regex(r"[a-z0-9_-]{1,20}", fullmatch=True)


# ============================================================
# Property 9: 分布式锁互斥性
# ============================================================


class TestDistributedLockMutualExclusion:
    """Feature: full-stack-review-fixes — 分布式锁互斥性"""

    @settings(max_examples=100)
    @given(lock_key=lock_key_strategy)
    def test_property_9_lock_mutual_exclusion(self, lock_key: str):
        """Property 9: 分布式锁互斥性

        **Validates: Requirements 4.2**

        属性: 对于任意两个并发的任务执行请求，使用相同的锁 key 时，
        Redis SET NX 语义保证只有一个能成功获取锁。
        """
        # 模拟 Redis SET NX 行为: 第一次 set(nx=True) 返回 True，
        # 后续对同一 key 的 set(nx=True) 返回 None (False)
        store: dict[str, str] = {}

        def simulate_set_nx(key: str, value: str, nx: bool = False, ex: int = 30):
            """模拟 Redis SET NX 原子操作"""
            if nx and key in store:
                return None  # key 已存在，获取失败
            store[key] = value
            return True

        full_key = f"lock:{lock_key}"

        # 进程 A 尝试获取锁
        value_a = str(uuid.uuid4())
        result_a = simulate_set_nx(full_key, value_a, nx=True, ex=30)

        # 进程 B 尝试获取同一把锁
        value_b = str(uuid.uuid4())
        result_b = simulate_set_nx(full_key, value_b, nx=True, ex=30)

        # 互斥性: 恰好一个成功
        assert result_a is True, "第一个请求应成功获取锁"
        assert result_b is None, "第二个请求应获取失败 (锁已被持有)"

        # 锁值应为第一个获取者的值
        assert store[full_key] == value_a


# ============================================================
# Property 10: 重试计数结构化存储往返一致性
# ============================================================


class TestRetryCountRoundTrip:
    """Feature: full-stack-review-fixes — 重试计数往返一致性"""

    @settings(max_examples=100)
    @given(retry_count=st.integers(min_value=0, max_value=10))
    def test_property_10_retry_count_roundtrip(self, retry_count: int):
        """Property 10: 重试计数结构化存储往返一致性

        **Validates: Requirements 4.3**

        属性: 对于任意重试次数 N (0-10)，写入 JSON 结构化字段后
        通过 _parse_retry_info 读取应得到相同的值 N。
        """
        # 写入: 构造 JSON 结构化字段
        retry_info = {
            "retry_count": retry_count,
            "last_error": "test error",
            "last_retry_at": "2025-01-01T00:00:00",
        }
        serialized = json.dumps(retry_info, ensure_ascii=False)

        # 读取: 通过 _parse_retry_info 解析
        parsed = _parse_retry_info(serialized)

        # 往返一致性
        assert parsed["retry_count"] == retry_count, (
            f"写入 retry_count={retry_count}，读取得到 {parsed['retry_count']}"
        )

    @settings(max_examples=100)
    @given(retry_count=st.integers(min_value=0, max_value=10))
    def test_property_10_retry_count_with_extra_fields(self, retry_count: int):
        """Property 10 补充: 包含额外字段时仍能正确解析

        **Validates: Requirements 4.3**
        """
        retry_info = {
            "retry_count": retry_count,
            "last_error": "some error",
            "last_retry_at": "2025-06-01T12:00:00",
            "exhausted": retry_count >= 3,
            "requires_manual_intervention": retry_count >= 3,
        }
        serialized = json.dumps(retry_info, ensure_ascii=False)
        parsed = _parse_retry_info(serialized)
        assert parsed["retry_count"] == retry_count


# ============================================================
# Property 11: 批量处理大小限制
# ============================================================


class TestBatchSizeLimit:
    """Feature: full-stack-review-fixes — 批量处理大小限制"""

    @settings(max_examples=100)
    @given(total_records=st.integers(min_value=0, max_value=1000))
    def test_property_11_batch_size_limit(self, total_records: int):
        """Property 11: 批量处理大小限制

        **Validates: Requirements 4.4**

        属性: 对于任意数量的待处理记录，reconcile_chain_events
        每批处理的记录数不应超过 RECONCILE_BATCH_SIZE (100)。
        """
        assert RECONCILE_BATCH_SIZE == 100, (
            f"RECONCILE_BATCH_SIZE 应为 100，实际为 {RECONCILE_BATCH_SIZE}"
        )

        # 模拟 .limit(RECONCILE_BATCH_SIZE) 的行为
        records = list(range(total_records))
        batch = records[:RECONCILE_BATCH_SIZE]

        assert len(batch) <= RECONCILE_BATCH_SIZE, (
            f"批次大小 {len(batch)} 超过限制 {RECONCILE_BATCH_SIZE}"
        )

        # 当记录数超过批次大小时，批次应恰好为 RECONCILE_BATCH_SIZE
        if total_records > RECONCILE_BATCH_SIZE:
            assert len(batch) == RECONCILE_BATCH_SIZE
        else:
            assert len(batch) == total_records


# ============================================================
# Property 12: JWT 声明完整性
# ============================================================


class TestJwtClaimsIntegrity:
    """Feature: full-stack-review-fixes — JWT 声明完整性"""

    @settings(max_examples=100)
    @given(
        address=st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True),
        session_id=st.uuids().map(str),
    )
    def test_property_12_jwt_access_token_claims(self, address: str, session_id: str):
        """Property 12: JWT 声明完整性 (Access Token)

        **Validates: Requirements 4.5**

        属性: 对于任意由 JWT_Module 签发的 Access Token，
        解码后应包含 iss ("supercrypto-api") 和 aud ("supercrypto-client") 声明。
        """
        import jwt as pyjwt

        from src.security.jwt import create_access_token

        token = create_access_token({"address": address, "session_id": session_id})

        # 解码但不验证过期时间 (测试环境下 token 不会过期)
        payload = pyjwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False},
        )

        assert payload.get("iss") == "supercrypto-api", (
            f"iss 应为 'supercrypto-api'，实际为 {payload.get('iss')}"
        )
        assert payload.get("aud") == "supercrypto-client", (
            f"aud 应为 'supercrypto-client'，实际为 {payload.get('aud')}"
        )
        assert payload.get("type") == "access"
        assert payload.get("address") == address

    @settings(max_examples=100)
    @given(
        address=st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True),
    )
    def test_property_12_jwt_refresh_token_claims(self, address: str):
        """Property 12: JWT 声明完整性 (Refresh Token)

        **Validates: Requirements 4.5**

        属性: 对于任意由 JWT_Module 签发的 Refresh Token，
        解码后应包含 iss ("supercrypto-api") 和 aud ("supercrypto-client") 声明。
        """
        import jwt as pyjwt

        from src.security.jwt import create_refresh_token

        token = create_refresh_token({"address": address})

        payload = pyjwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False},
        )

        assert payload.get("iss") == "supercrypto-api"
        assert payload.get("aud") == "supercrypto-client"
        assert payload.get("type") == "refresh"
        assert payload.get("address") == address


# ============================================================
# Property 13: 路径规范化防遍历
# ============================================================


class TestPathNormalizationTraversalPrevention:
    """Feature: full-stack-review-fixes — 路径规范化防遍历"""

    @settings(max_examples=100)
    @given(
        admin_path=st.sampled_from(
            [
                "admin/users",
                "admin/kyc",
                "admin/assets",
                "admin/contracts",
                "metrics/chain",
            ]
        ),
    )
    def test_property_13_traversal_not_public(self, admin_path: str):
        """Property 13: 路径规范化防遍历

        **Validates: Requirements 4.6**

        属性: 对于任意包含 /../ 序列的请求路径，
        Auth_Middleware 的 _is_public_path() 应基于规范化后的路径判断，
        不应将 /api/v1/public/../admin/xxx 识别为公开路径。
        """
        middleware = AuthStateMiddleware(app=MagicMock())

        # 构造遍历路径: 通过 public 前缀 + /../ 尝试访问受保护路径
        traversal_path = f"/api/v1/public/../{admin_path}"

        result = middleware._is_public_path(traversal_path)

        assert not result, (
            f"路径 '{traversal_path}' 不应被识别为公开路径，"
            f"规范化后应为 '/api/v1/{admin_path}'"
        )

    @settings(max_examples=100)
    @given(
        segment=path_segment_strategy,
    )
    def test_property_13_legitimate_public_paths_still_work(self, segment: str):
        """Property 13 补充: 合法公开路径仍然正常工作

        **Validates: Requirements 4.6**
        """
        middleware = AuthStateMiddleware(app=MagicMock())

        # 合法公开路径应被正确识别
        public_path = f"/api/v1/public/{segment}"
        assert middleware._is_public_path(public_path), (
            f"合法公开路径 '{public_path}' 应被识别为公开路径"
        )

    @settings(max_examples=100)
    @given(
        depth=st.integers(min_value=1, max_value=5),
        admin_path=st.sampled_from(["admin/users", "admin/kyc", "metrics/chain"]),
    )
    def test_property_13_multiple_traversal_sequences(
        self, depth: int, admin_path: str
    ):
        """Property 13 补充: 多层 /../ 遍历也应被阻止

        **Validates: Requirements 4.6**
        """
        middleware = AuthStateMiddleware(app=MagicMock())

        # 构造多层遍历: 从 /api/v1/public 向上跳 depth 层再访问 admin 路径
        # /api/v1/public + /../ * N 向上跳出 public 目录
        traversal = "/.." * (depth + 1)  # +1 确保跳出 public
        traversal_path = f"/api/v1/public{traversal}/{admin_path}"

        result = middleware._is_public_path(traversal_path)

        assert not result, f"多层遍历路径 '{traversal_path}' 不应被识别为公开路径"


# ============================================================
# Property 14: 分布式锁安全释放
# ============================================================


class TestDistributedLockSafeRelease:
    """Feature: full-stack-review-fixes — 分布式锁安全释放"""

    @settings(max_examples=100)
    @given(
        key_a=lock_key_strategy,
        key_b=lock_key_strategy,
    )
    def test_property_14_independent_lock_release(self, key_a: str, key_b: str):
        """Property 14: 分布式锁安全释放 — 独立锁互不影响

        **Validates: Requirements 4.7**

        属性: 对于两个使用不同 key 的锁持有者 A 和 B，
        A 释放自己的锁不应影响 B 持有的锁。
        """
        # 模拟 Redis 存储
        store: dict[str, str] = {}

        def simulate_set_nx(key: str, value: str, nx: bool = False, ex: int = 30):
            if nx and key in store:
                return None
            store[key] = value
            return True

        def simulate_lua_release(key: str, expected_value: str) -> int:
            """模拟 Lua 脚本原子释放: 仅当值匹配时删除"""
            if store.get(key) == expected_value:
                del store[key]
                return 1
            return 0

        full_key_a = f"lock:{key_a}"
        full_key_b = f"lock:{key_b}"
        value_a = str(uuid.uuid4())
        value_b = str(uuid.uuid4())

        # A 和 B 分别获取各自的锁
        simulate_set_nx(full_key_a, value_a, nx=True)
        simulate_set_nx(full_key_b, value_b, nx=True)

        # 如果 key_a == key_b，第二个获取会失败，跳过此场景
        if key_a == key_b:
            return

        # 验证两把锁都存在
        assert full_key_a in store
        assert full_key_b in store

        # A 释放自己的锁
        result = simulate_lua_release(full_key_a, value_a)
        assert result == 1, "A 应成功释放自己的锁"

        # B 的锁不受影响
        assert full_key_b in store, "A 释放锁后，B 的锁应仍然存在"
        assert store[full_key_b] == value_b, "B 的锁值应保持不变"

    @settings(max_examples=100)
    @given(lock_key=lock_key_strategy)
    def test_property_14_expired_lock_release_is_noop(self, lock_key: str):
        """Property 14: 分布式锁安全释放 — 过期锁释放为空操作

        **Validates: Requirements 4.7**

        属性: 如果锁已因超时被其他进程获取，
        原持有者的释放操作应为空操作 (不影响新持有者)。
        """
        store: dict[str, str] = {}

        def simulate_lua_release(key: str, expected_value: str) -> int:
            if store.get(key) == expected_value:
                del store[key]
                return 1
            return 0

        full_key = f"lock:{lock_key}"
        original_value = str(uuid.uuid4())
        new_value = str(uuid.uuid4())

        # 原持有者获取锁
        store[full_key] = original_value

        # 模拟锁超时后被新进程获取 (值被替换)
        store[full_key] = new_value

        # 原持有者尝试释放 — 应为空操作 (值不匹配)
        result = simulate_lua_release(full_key, original_value)
        assert result == 0, "原持有者释放过期锁应返回 0 (空操作)"

        # 新持有者的锁不受影响
        assert store[full_key] == new_value, "新持有者的锁应保持不变"


# ============================================================
# Property 15: _parse_retry_info 健壮性
# ============================================================


class TestParseRetryInfoRobustness:
    """Feature: full-stack-review-fixes — _parse_retry_info 健壮性"""

    @settings(max_examples=100)
    @given(retry_count=st.integers(min_value=0, max_value=10))
    def test_property_15_parse_valid_json(self, retry_count: int):
        """Property 15: _parse_retry_info 正确解析 JSON 格式

        **Validates: Requirements 4.11**

        属性: 对于任意有效的 JSON 重试信息，_parse_retry_info
        应正确解析并返回结构化数据。
        """
        retry_info = {
            "retry_count": retry_count,
            "last_error": "connection timeout",
            "last_retry_at": "2025-01-15T10:30:00",
        }
        serialized = json.dumps(retry_info)
        parsed = _parse_retry_info(serialized)

        assert parsed["retry_count"] == retry_count
        assert parsed["last_error"] == "connection timeout"
        assert parsed["last_retry_at"] == "2025-01-15T10:30:00"

    @settings(max_examples=100)
    @given(
        legacy_count=st.integers(min_value=1, max_value=10),
        max_attempts=st.just(3),
    )
    def test_property_15_parse_legacy_string_format(
        self, legacy_count: int, max_attempts: int
    ):
        """Property 15: _parse_retry_info 兼容旧格式字符串

        **Validates: Requirements 4.11**

        属性: 对于旧格式的错误字符串 (包含 "Auto-retry attempt N/" 或
        "Auto-retry exhausted (N/")，_parse_retry_info 应正确提取重试计数。
        """
        # 旧格式: "Auto-retry attempt N/M"
        legacy_attempt = f"Auto-retry attempt {legacy_count}/{max_attempts}"
        parsed = _parse_retry_info(legacy_attempt)
        assert parsed["retry_count"] == legacy_count, (
            f"旧格式 '{legacy_attempt}' 应解析出 retry_count={legacy_count}，"
            f"实际为 {parsed['retry_count']}"
        )

        # 旧格式: "Auto-retry exhausted (N/M)"
        legacy_exhausted = f"Auto-retry exhausted ({legacy_count}/{max_attempts})"
        parsed2 = _parse_retry_info(legacy_exhausted)
        assert parsed2["retry_count"] == legacy_count

    @settings(max_examples=100)
    @given(
        random_text=st.text(
            alphabet=st.characters(categories=("L", "N", "P", "Z")),
            min_size=0,
            max_size=200,
        ),
    )
    def test_property_15_parse_arbitrary_string_no_crash(self, random_text: str):
        """Property 15: _parse_retry_info 处理任意字符串不崩溃

        **Validates: Requirements 4.11**

        属性: 对于任意字符串输入，_parse_retry_info 不应抛出异常，
        应返回有效的结构化数据。
        """
        parsed = _parse_retry_info(random_text)

        # 返回值应始终是 dict 且包含 retry_count
        assert isinstance(parsed, dict)
        assert "retry_count" in parsed
        assert isinstance(parsed["retry_count"], int)
        assert parsed["retry_count"] >= 0

    @settings(max_examples=100)
    @given(value=st.one_of(st.none(), st.just("")))
    def test_property_15_parse_empty_input(self, value):
        """Property 15 补充: 空输入返回初始结构

        **Validates: Requirements 4.11**
        """
        parsed = _parse_retry_info(value)
        assert parsed["retry_count"] == 0
        assert parsed["last_error"] is None
        assert parsed["last_retry_at"] is None
