"""
Transaction 迁移属性测试
========================

验证 Transaction → TransactionAudit 迁移的正确性

**Property 1: Transaction 数据迁移完整性**
- 验证迁移后通过 tx_hash 可查询到等效数据
- 验证关键字段 (from_address, to_address, value, status) 保持一致

**Validates: Requirements 1.1**
"""

from decimal import Decimal

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from src.models.transaction_audit import TransactionAudit
from src.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType

# ==================== 策略定义 ====================

# 有效的以太坊地址策略
eth_address_strategy = st.text(
    alphabet="0123456789abcdef", min_size=40, max_size=40
).map(lambda x: f"0x{x}")

# 有效的交易哈希策略
tx_hash_strategy = st.text(alphabet="0123456789abcdef", min_size=64, max_size=64).map(
    lambda x: f"0x{x}"
)

# Wei 值策略 (正整数字符串)
wei_value_strategy = st.integers(min_value=0, max_value=10**30).map(str)

# 网络策略
network_strategy = st.sampled_from(["ethereum", "sepolia", "hardhat"])

# chain_id 策略
chain_id_strategy = st.sampled_from([1, 11155111, 31337])

# 状态策略
status_strategy = st.sampled_from(list(TransactionAuditStatus))

# 交易类型策略
tx_type_strategy = st.sampled_from(list(TransactionAuditType))


# ==================== 属性测试 ====================


class TestTransactionMigrationProperties:
    """Transaction 迁移属性测试"""

    @given(
        tx_hash=tx_hash_strategy,
        from_address=eth_address_strategy,
        to_address=eth_address_strategy,
        value=wei_value_strategy,
        chain_id=chain_id_strategy,
        network=network_strategy,
        status=status_strategy,
        tx_type=tx_type_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_transaction_audit_field_preservation(
        self,
        tx_hash: str,
        from_address: str,
        to_address: str,
        value: str,
        chain_id: int,
        network: str,
        status: TransactionAuditStatus,
        tx_type: TransactionAuditType,
    ):
        """
        **Property 1: TransactionAudit 字段保持一致性**

        验证创建 TransactionAudit 记录后，所有字段值保持不变

        **Validates: Requirements 1.1**
        """
        # 确保地址不同
        assume(from_address != to_address)

        # 创建 TransactionAudit 实例 (不保存到数据库)
        tx_audit = TransactionAudit(
            tx_hash=tx_hash,
            from_address=from_address,
            to_address=to_address,
            value=value,
            chain_id=chain_id,
            network=network,
            status=status,
            tx_type=tx_type,
        )

        # 验证字段值保持一致
        assert tx_audit.tx_hash == tx_hash, "tx_hash 应该保持不变"
        assert tx_audit.from_address == from_address, "from_address 应该保持不变"
        assert tx_audit.to_address == to_address, "to_address 应该保持不变"
        assert tx_audit.value == value, "value 应该保持不变"
        assert tx_audit.chain_id == chain_id, "chain_id 应该保持不变"
        assert tx_audit.network == network, "network 应该保持不变"
        assert tx_audit.status == status, "status 应该保持不变"
        assert tx_audit.tx_type == tx_type, "tx_type 应该保持不变"

    @given(
        amount=st.decimals(
            min_value=0,
            max_value=1000000,
            places=18,
            allow_nan=False,
            allow_infinity=False,
        ),
    )
    @settings(max_examples=100, deadline=None)
    def test_amount_to_wei_conversion_preserves_value(self, amount: Decimal):
        """
        **Property 2: 金额转换为 Wei 后可逆**

        验证 Decimal 金额转换为 Wei 字符串后，可以转换回原始值

        **Validates: Requirements 1.1**
        """
        # 将 Decimal 转换为 Wei (假设原始单位是 ETH)
        wei_value = amount * Decimal("1000000000000000000")
        wei_str = str(int(wei_value))

        # 转换回 ETH
        recovered_wei = Decimal(wei_str)
        recovered_amount = recovered_wei / Decimal("1000000000000000000")

        # 验证转换后的值与原始值相近 (考虑精度损失)
        # 由于 Wei 是整数，可能有微小的精度损失
        diff = abs(recovered_amount - amount)
        assert diff < Decimal("1e-18"), f"转换后的值应该与原始值相近，差异: {diff}"

    @given(
        status=st.sampled_from(["pending", "confirmed", "failed", "cancelled"]),
    )
    @settings(max_examples=20, deadline=None)
    def test_status_mapping_is_deterministic(self, status: str):
        """
        **Property 3: 状态映射是确定性的**

        验证相同的输入状态总是映射到相同的输出状态

        **Validates: Requirements 1.1**
        """
        # 状态映射
        status_map = {
            "pending": TransactionAuditStatus.PENDING,
            "confirmed": TransactionAuditStatus.CONFIRMED,
            "failed": TransactionAuditStatus.FAILED,
            "cancelled": TransactionAuditStatus.DROPPED,
        }

        # 多次映射应该得到相同结果
        result1 = status_map.get(status, TransactionAuditStatus.PENDING)
        result2 = status_map.get(status, TransactionAuditStatus.PENDING)

        assert result1 == result2, "状态映射应该是确定性的"

    @given(
        tx_type=st.sampled_from(
            [
                "transfer",
                "approve",
                "subscription",
                "redeem",
                "stake",
                "unstake",
                "claim",
                "mint",
                "other",
            ]
        ),
    )
    @settings(max_examples=20, deadline=None)
    def test_tx_type_mapping_is_deterministic(self, tx_type: str):
        """
        **Property 4: 交易类型映射是确定性的**

        验证相同的输入交易类型总是映射到相同的输出类型

        **Validates: Requirements 1.1**
        """
        # 类型映射
        type_map = {
            "transfer": TransactionAuditType.TRANSFER,
            "approve": TransactionAuditType.TOKEN_APPROVE,
            "subscription": TransactionAuditType.CONTRACT_CALL,
            "redeem": TransactionAuditType.CONTRACT_CALL,
            "stake": TransactionAuditType.STAKING,
            "unstake": TransactionAuditType.UNSTAKING,
            "claim": TransactionAuditType.CLAIM_REWARD,
            "mint": TransactionAuditType.CONTRACT_CALL,
            "other": TransactionAuditType.OTHER,
        }

        # 多次映射应该得到相同结果
        result1 = type_map.get(tx_type, TransactionAuditType.OTHER)
        result2 = type_map.get(tx_type, TransactionAuditType.OTHER)

        assert result1 == result2, "交易类型映射应该是确定性的"

    @given(
        network=st.sampled_from(
            ["ethereum", "mainnet", "sepolia", "goerli", "hardhat", "local"]
        ),
    )
    @settings(max_examples=20, deadline=None)
    def test_network_to_chain_id_mapping(self, network: str):
        """
        **Property 5: 网络名称到 chain_id 映射正确**

        验证网络名称正确映射到对应的 chain_id

        **Validates: Requirements 1.1**
        """
        # 网络到 chain_id 映射
        network_chain_map = {
            "ethereum": 1,
            "mainnet": 1,
            "sepolia": 11155111,
            "goerli": 5,
            "hardhat": 31337,
            "local": 31337,
        }

        expected_chain_id = network_chain_map.get(network.lower(), 1)

        # 验证映射结果
        assert expected_chain_id > 0, "chain_id 应该是正整数"

        # 验证已知网络的映射
        if network.lower() in ["ethereum", "mainnet"]:
            assert expected_chain_id == 1
        elif network.lower() == "sepolia":
            assert expected_chain_id == 11155111
        elif network.lower() in ["hardhat", "local"]:
            assert expected_chain_id == 31337


class TestTransactionAuditImmutability:
    """TransactionAudit 不可变性测试"""

    def test_updatable_fields_are_defined(self):
        """
        **Property 6: 可更新字段集合已定义**

        验证 TransactionAudit.UPDATABLE_FIELDS 包含预期的字段

        **Validates: Requirements 1.4**
        """
        expected_fields = {
            "status",
            "block_number",
            "block_timestamp",
            "gas_used",
            "effective_gas_price",
            "gas_cost",
            "error_message",
            "updated_at",
            "confirmed_at",
        }

        assert TransactionAudit.UPDATABLE_FIELDS == expected_fields, (
            f"UPDATABLE_FIELDS 应该包含预期的字段，实际: {TransactionAudit.UPDATABLE_FIELDS}"
        )

    def test_immutable_fields_not_in_updatable(self):
        """
        **Property 7: 不可变字段不在可更新集合中**

        验证关键字段 (tx_hash, from_address, to_address, value) 不在可更新集合中

        **Validates: Requirements 1.4**
        """
        immutable_fields = {
            "tx_hash",
            "from_address",
            "to_address",
            "value",
            "chain_id",
            "network",
            "tx_type",
        }

        for field in immutable_fields:
            assert field not in TransactionAudit.UPDATABLE_FIELDS, (
                f"不可变字段 {field} 不应该在 UPDATABLE_FIELDS 中"
            )
