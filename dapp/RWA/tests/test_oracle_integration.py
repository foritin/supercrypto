"""
预言机系统集成测试
测试完整的预言机工作流程、与消费者合约集成
"""
import pytest
from ape import accounts, project, chain


@pytest.fixture
def signers():
    """获取签名者账户"""
    return [
        accounts.test_accounts[0],
        accounts.test_accounts[1],
        accounts.test_accounts[2]
    ]


@pytest.fixture
def multisig(signers):
    """部署多签管理器"""
    signer_addrs = [s.address for s in signers]
    return signers[0].deploy(project.MultiSigManager, signer_addrs)


@pytest.fixture
def timelock(signers, multisig):
    """部署时间锁"""
    return signers[0].deploy(project.Timelock, multisig.address)


@pytest.fixture
def oracle(signers, multisig, timelock):
    """部署RWA预言机"""
    return signers[0].deploy(
        project.RWAOracle,
        multisig.address,
        timelock.address
    )


@pytest.fixture
def aggregator(signers, oracle):
    """部署数据聚合器"""
    return signers[0].deploy(project.DataAggregator, oracle.address)


@pytest.fixture
def consumer(signers, aggregator, oracle):
    """部署消费者合约"""
    return signers[0].deploy(
        project.OracleConsumer,
        aggregator.address,
        oracle.address
    )


@pytest.fixture
def asset_id():
    """生成测试资产ID"""
    return bytes([1] * 32)


def create_and_approve_operation(multisig, timelock, target, data_hash, signers):
    """辅助函数：创建并批准时间锁操作"""
    # 创建多签提案
    proposal_id = multisig.create_proposal(
        target,
        data_hash,
        sender=signers[0]
    )
    # 第二个签名者签名
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 排队操作
    tx = timelock.queue_operation(
        target,
        data_hash,
        proposal_id,
        sender=signers[0]
    )
    operation_id = tx.events[0].operation_id
    
    # 快进24小时
    chain.mine(deltatime=86400)
    
    # 执行时间锁
    timelock.execute_operation(operation_id, sender=signers[0])
    
    return operation_id


class TestCompleteWorkflow:
    """完整工作流程测试"""
    
    def test_register_and_query_asset(
        self, oracle, aggregator, consumer, multisig, timelock, asset_id, signers
    ):
        """测试注册资产并查询完整流程"""
        # 步骤1：注册资产
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        oracle.register_asset(
            asset_id,
            "Manhattan Office Building",
            850,  # 8.5%
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 步骤2：通过聚合器查询
        apy = aggregator.get_aggregated_apy(asset_id)
        valuation = aggregator.get_aggregated_valuation(asset_id)
        
        assert apy == 850
        assert valuation == 50_000_000 * 10**6
        
        # 步骤3：通过消费者查询
        consumer_apy = consumer.get_asset_apy(asset_id)
        consumer_val = consumer.get_asset_valuation(asset_id)
        
        assert consumer_apy == 850
        assert consumer_val == 50_000_000 * 10**6
    
    def test_update_and_verify_data(
        self, oracle, aggregator, multisig, timelock, asset_id, signers
    ):
        """测试更新数据并验证流程"""
        # 注册资产
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.register_asset(
            asset_id,
            "Test Asset",
            850,
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 更新数据
        data_hash2 = bytes([3] * 32)
        operation_id2 = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash2, signers
        )
        oracle.update_asset_data(
            asset_id,
            870,  # 提升到8.7%
            51_000_000 * 10**6,
            9500,
            425_000 * 10**6,
            operation_id2,
            sender=signers[0]
        )
        
        # 验证更新
        apy = aggregator.get_aggregated_apy(asset_id)
        assert apy == 870
        
        # 检查历史记录
        assert oracle.historical_count(asset_id) == 2


class TestConsumerIntegration:
    """消费者合约集成测试"""
    
    @pytest.fixture
    def registered_asset(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """注册并更新资产"""
        # 注册
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.register_asset(
            asset_id,
            "Manhattan Office",
            850,
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 更新数据
        data_hash2 = bytes([3] * 32)
        operation_id2 = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash2, signers
        )
        oracle.update_asset_data(
            asset_id,
            870,
            51_000_000 * 10**6,
            9500,
            425_000 * 10**6,
            operation_id2,
            sender=signers[0]
        )
        
        return asset_id
    
    def test_pricing_calculation(
        self, consumer, registered_asset, signers
    ):
        """测试定价计算"""
        # 设置定价配置
        consumer.set_pricing_config(
            registered_asset,
            1_000_000,  # 基础价格 = 1 USDT
            8000,       # 最小置信度 = 80%
            5000,       # APY乘数 = 50%
            1000,       # 估值权重 = 10%
            sender=signers[0]
        )
        
        # 计算价格
        price = consumer.calculate_token_price(registered_asset)
        
        # 价格应该 > 基础价格（因为APY > 0）
        assert price > 1_000_000
        assert price < 2_000_000  # 合理范围
    
    def test_subscription_amount_calculation(
        self, consumer, registered_asset, signers
    ):
        """测试认购数量计算"""
        # 设置定价配置
        consumer.set_pricing_config(
            registered_asset,
            1_000_000,
            8000,
            5000,
            1000,
            sender=signers[0]
        )
        
        # 计算认购数量
        usdt_amount = 10_000 * 10**6  # $10,000
        tokens = consumer.calculate_subscription_amount(
            registered_asset,
            usdt_amount
        )
        
        # 应该能获得一些代币
        assert tokens > 0
    
    def test_investment_validation(
        self, consumer, oracle, registered_asset, signers
    ):
        """测试投资验证"""
        # 设置定价配置
        consumer.set_pricing_config(
            registered_asset,
            1_000_000,
            8000,
            5000,
            1000,
            sender=signers[0]
        )
        
        # 验证投资
        is_valid = consumer.validate_investment(
            registered_asset,
            10_000 * 10**6
        )
        
        # 应该通过验证
        assert is_valid
    
    def test_expected_returns_calculation(
        self, consumer, registered_asset, signers
    ):
        """测试预期收益计算"""
        investment = 10_000 * 10**6  # $10,000
        duration = 365  # 1年
        
        returns = consumer.get_expected_returns(
            registered_asset,
            investment,
            duration
        )
        
        # 预期收益应该 > 0
        assert returns > 0
        # 大约应该是投资额 * APY
        # APY = 870 = 8.7%
        # 预期收益 ≈ $10,000 * 8.7% = $870
        assert 800 * 10**6 < returns < 950 * 10**6


class TestMultiSignatureFlow:
    """多签流程测试"""
    
    def test_proposal_lifecycle(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试提案完整生命周期"""
        # 创建提案
        data_hash = bytes([2] * 32)
        proposal_id = multisig.create_proposal(
            oracle.address,
            data_hash,
            sender=signers[0]
        )
        
        # 检查提案状态
        assert not multisig.is_proposal_approved(proposal_id)
        
        # 第二个签名者签名
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        # 现在应该通过
        assert multisig.is_proposal_approved(proposal_id)
        
        # 加入时间锁队列
        tx = timelock.queue_operation(
            oracle.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 检查操作尚未就绪
        assert not timelock.is_operation_ready(operation_id)
        
        # 快进24小时
        chain.mine(deltatime=86400)
        
        # 现在应该就绪
        assert timelock.is_operation_ready(operation_id)
        
        # 执行
        timelock.execute_operation(operation_id, sender=signers[0])
        
        # 验证执行
        operation = timelock.get_operation(operation_id)
        assert operation[5] == 2  # EXECUTED


class TestEmergencyScenarios:
    """紧急场景测试"""
    
    def test_emergency_data_correction(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试紧急数据更正流程"""
        # 注册资产
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.register_asset(
            asset_id,
            "Test Asset",
            850,
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 创建更正提案
        data_hash2 = bytes([3] * 32)
        proposal_id = multisig.create_proposal(
            oracle.address,
            data_hash2,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            oracle.address,
            data_hash2,
            proposal_id,
            sender=signers[0]
        )
        operation_id2 = tx.events[0].operation_id
        
        # 所有签名者紧急签名
        for signer in signers:
            timelock.emergency_sign(operation_id2, sender=signer)
        
        # 立即执行（无需等待24小时）
        timelock.emergency_execute(operation_id2, sender=signers[0])
        
        # 更新数据
        oracle.update_asset_data(
            asset_id,
            870,
            51_000_000 * 10**6,
            9500,
            425_000 * 10**6,
            operation_id2,
            sender=signers[0]
        )
        
        # 验证更新
        assert oracle.get_apy(asset_id) == 870
    
    def test_pause_all_contracts(
        self, oracle, aggregator, consumer, signers
    ):
        """测试暂停所有合约"""
        # 暂停预言机
        oracle.pause(sender=signers[0])
        assert oracle.paused()
        
        # 暂停聚合器
        aggregator.pause(sender=signers[0])
        assert aggregator.paused()
        
        # 验证无法操作


class TestDataAggregationScenarios:
    """数据聚合场景测试"""
    
    @pytest.fixture
    def registered_asset(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """注册资产"""
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.register_asset(
            asset_id,
            "Test Asset",
            850,
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        return asset_id
    
    def test_fallback_to_primary_when_secondary_unavailable(
        self, aggregator, registered_asset, signers
    ):
        """测试次级数据不可用时回退到主数据"""
        # 添加次级预言机但不提交数据
        for i in range(1, 4):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 启用次级预言机
        aggregator.enable_secondary_oracles(sender=signers[0])
        
        # 聚合数据（应该回退到主数据）
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        assert result[2] == 0  # PRIMARY
        assert result[3] == 10000  # 100% confidence
    
    def test_deviation_alert_scenario(
        self, aggregator, registered_asset, signers
    ):
        """测试偏差警报场景"""
        # 添加次级预言机
        for i in range(1, 4):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 提交明显偏离的数据
        aggregator.submit_secondary_data(
            registered_asset,
            1500,  # 15% (主数据是8.5%)
            70_000_000 * 10**6,
            sender=accounts.test_accounts[1]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            1600,
            72_000_000 * 10**6,
            sender=accounts.test_accounts[2]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            1550,
            71_000_000 * 10**6,
            sender=accounts.test_accounts[3]
        )
        
        # 启用次级预言机
        aggregator.enable_secondary_oracles(sender=signers[0])
        
        # 聚合数据（应该切换并发出警报）
        tx = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 检查是否有偏差警报事件
        has_deviation_alert = any(
            'DeviationAlert' in str(event) for event in tx.events
        )
        assert has_deviation_alert


class TestSystemSecurity:
    """系统安全测试"""
    
    def test_only_approved_can_execute(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试只有批准的操作可以执行"""
        # 创建提案但不批准
        data_hash = bytes([2] * 32)
        proposal_id = multisig.create_proposal(
            oracle.address,
            data_hash,
            sender=signers[0]
        )
        
        # 尝试直接排队（应该失败）
        with pytest.raises(Exception):
            timelock.queue_operation(
                oracle.address,
                data_hash,
                proposal_id,
                sender=signers[0]
            )
    
    def test_change_rate_protection(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试变化率保护"""
        # 注册资产
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.register_asset(
            asset_id,
            "Test Asset",
            850,
            50_000_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 尝试大幅改变APY（>5%）
        data_hash2 = bytes([3] * 32)
        operation_id2 = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash2, signers
        )
        
        with pytest.raises(Exception, match="change too large"):
            oracle.update_asset_data(
                asset_id,
                1300,  # 13% (从8.5%涨太多)
                50_000_000 * 10**6,
                9500,
                425_000 * 10**6,
                operation_id2,
                sender=signers[0]
            )

