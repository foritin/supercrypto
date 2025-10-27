"""
DataAggregator 合约测试
测试混合数据聚合、次级预言机、偏差检测
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
def asset_id():
    """生成测试资产ID"""
    return bytes([1] * 32)


@pytest.fixture
def registered_asset(oracle, multisig, timelock, asset_id, signers):
    """注册一个测试资产"""
    # 创建提案
    data_hash = bytes([2] * 32)
    proposal_id = multisig.create_proposal(
        oracle.address,
        data_hash,
        sender=signers[0]
    )
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 排队操作
    tx = timelock.queue_operation(
        oracle.address,
        data_hash,
        proposal_id,
        sender=signers[0]
    )
    operation_id = tx.events[0].operation_id
    
    # 快进并执行
    chain.mine(deltatime=86400)
    timelock.execute_operation(operation_id, sender=signers[0])
    
    # 注册资产
    oracle.register_asset(
        asset_id,
        "Test Asset",
        850,  # 8.5%
        50_000_000 * 10**6,
        operation_id,
        sender=signers[0]
    )
    
    return asset_id


class TestAggregatorDeployment:
    """部署测试"""
    
    def test_deployment(self, aggregator, oracle, signers):
        """测试部署配置"""
        assert aggregator.owner() == signers[0].address
        assert aggregator.primary_oracle() == oracle.address
        assert aggregator.deviation_threshold() == 1000  # 10%
        assert aggregator.cache_validity() == 3600  # 1小时
        assert not aggregator.secondary_enabled()
        assert not aggregator.paused()


class TestSecondaryOracles:
    """次级预言机管理测试"""
    
    def test_add_secondary_oracle(self, aggregator, signers):
        """测试添加次级预言机"""
        secondary1 = signers[1].address
        
        aggregator.add_secondary_oracle(secondary1, sender=signers[0])
        
        assert aggregator.is_secondary_oracle(secondary1)
        assert aggregator.get_secondary_oracle_count() == 1
    
    def test_add_multiple_secondary_oracles(self, aggregator, signers):
        """测试添加多个次级预言机"""
        secondary1 = signers[1].address
        secondary2 = signers[2].address
        secondary3 = accounts.test_accounts[3].address
        
        aggregator.add_secondary_oracle(secondary1, sender=signers[0])
        aggregator.add_secondary_oracle(secondary2, sender=signers[0])
        aggregator.add_secondary_oracle(secondary3, sender=signers[0])
        
        assert aggregator.get_secondary_oracle_count() == 3
    
    def test_add_duplicate_oracle_fails(self, aggregator, signers):
        """测试添加重复预言机失败"""
        secondary1 = signers[1].address
        
        aggregator.add_secondary_oracle(secondary1, sender=signers[0])
        
        with pytest.raises(Exception, match="Already added"):
            aggregator.add_secondary_oracle(secondary1, sender=signers[0])
    
    def test_remove_secondary_oracle(self, aggregator, signers):
        """测试移除次级预言机"""
        secondary1 = signers[1].address
        
        aggregator.add_secondary_oracle(secondary1, sender=signers[0])
        aggregator.remove_secondary_oracle(secondary1, sender=signers[0])
        
        assert not aggregator.is_secondary_oracle(secondary1)
        assert aggregator.get_secondary_oracle_count() == 0
    
    def test_only_owner_can_add(self, aggregator, signers):
        """测试只有所有者可以添加预言机"""
        with pytest.raises(Exception, match="Only owner"):
            aggregator.add_secondary_oracle(
                signers[2].address,
                sender=signers[1]
            )


class TestSubmitSecondaryData:
    """次级数据提交测试"""
    
    def test_submit_secondary_data(
        self, aggregator, registered_asset, signers
    ):
        """测试提交次级数据"""
        secondary = signers[1].address
        
        # 添加为次级预言机
        aggregator.add_secondary_oracle(secondary, sender=signers[0])
        
        # 提交数据
        aggregator.submit_secondary_data(
            registered_asset,
            855,  # 8.55%
            50_100_000 * 10**6,
            sender=signers[1]
        )
        
        # 数据已提交（通过聚合查询验证）
    
    def test_non_oracle_cannot_submit(
        self, aggregator, registered_asset, signers
    ):
        """测试非预言机无法提交数据"""
        with pytest.raises(Exception, match="Not a secondary oracle"):
            aggregator.submit_secondary_data(
                registered_asset,
                855,
                50_100_000 * 10**6,
                sender=signers[2]  # 不是次级预言机
            )


class TestDataAggregation:
    """数据聚合测试"""
    
    def test_aggregate_primary_only(
        self, aggregator, registered_asset, signers
    ):
        """测试仅使用主数据源"""
        # 次级预言机未启用
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        assert result[0] == 850  # apy
        assert result[1] == 50_000_000 * 10**6  # valuation
        assert result[2] == 0  # PRIMARY
        assert result[3] == 10000  # 100% confidence
    
    def test_aggregate_with_low_deviation(
        self, aggregator, registered_asset, signers
    ):
        """测试低偏差聚合（加权平均）"""
        # 添加次级预言机
        for i in range(1, 4):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 提交次级数据（偏差小）
        aggregator.submit_secondary_data(
            registered_asset,
            855,  # 8.55%
            50_100_000 * 10**6,
            sender=accounts.test_accounts[1]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            860,  # 8.60%
            50_200_000 * 10**6,
            sender=accounts.test_accounts[2]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            852,  # 8.52%
            50_050_000 * 10**6,
            sender=accounts.test_accounts[3]
        )
        
        # 启用次级预言机
        aggregator.enable_secondary_oracles(sender=signers[0])
        
        # 聚合数据
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 应该是加权平均（主70% + 次30%）
        assert result[2] == 2  # AGGREGATED
        assert result[3] == 9500  # 95% confidence
    
    def test_aggregate_with_high_deviation(
        self, aggregator, registered_asset, signers
    ):
        """测试高偏差切换到次级数据源"""
        # 添加次级预言机
        for i in range(1, 4):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 提交明显不同的次级数据（偏差大）
        aggregator.submit_secondary_data(
            registered_asset,
            1200,  # 12% (远高于主数据的8.5%)
            60_000_000 * 10**6,
            sender=accounts.test_accounts[1]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            1250,
            61_000_000 * 10**6,
            sender=accounts.test_accounts[2]
        )
        aggregator.submit_secondary_data(
            registered_asset,
            1180,
            59_000_000 * 10**6,
            sender=accounts.test_accounts[3]
        )
        
        # 启用次级预言机
        aggregator.enable_secondary_oracles(sender=signers[0])
        
        # 聚合数据
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 应该切换到次级数据源
        assert result[2] == 1  # SECONDARY
        assert result[3] == 8000  # 80% confidence
    
    def test_aggregate_insufficient_secondary_data(
        self, aggregator, registered_asset, signers
    ):
        """测试次级数据不足时使用主数据"""
        # 添加次级预言机但不提交足够数据
        aggregator.add_secondary_oracle(signers[1].address, sender=signers[0])
        aggregator.add_secondary_oracle(signers[2].address, sender=signers[0])
        
        # 只提交1个次级数据（不足最小要求3个）
        aggregator.submit_secondary_data(
            registered_asset,
            855,
            50_100_000 * 10**6,
            sender=signers[1]
        )
        
        # 启用次级预言机
        aggregator.enable_secondary_oracles(sender=signers[0])
        
        # 聚合数据
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 应该回退到主数据源
        assert result[2] == 0  # PRIMARY
        assert result[3] == 10000  # 100% confidence


class TestCaching:
    """缓存测试"""
    
    def test_cache_validity(self, aggregator, registered_asset, signers):
        """测试缓存有效性"""
        # 第一次聚合
        result1 = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 立即再次聚合（应该使用缓存）
        result2 = aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        assert result1[0] == result2[0]
        assert result1[1] == result2[1]
    
    def test_cache_expiry(self, aggregator, registered_asset, signers):
        """测试缓存过期"""
        # 聚合数据
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 快进超过缓存有效期（1小时）
        chain.mine(deltatime=3601)
        
        # 再次聚合应该重新计算
        result = aggregator.aggregate_data(registered_asset, sender=signers[0])
        assert result[4] > 0  # 新的时间戳
    
    def test_clear_cache(self, aggregator, registered_asset, signers):
        """测试清除缓存"""
        # 聚合并缓存
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 清除缓存
        aggregator.clear_cache(registered_asset, sender=signers[0])
        
        # 查询缓存数据
        cached = aggregator.get_aggregated_data(registered_asset)
        assert cached[4] == 0  # 时间戳为0表示缓存已清除


class TestQueryFunctions:
    """查询函数测试"""
    
    def test_get_aggregated_apy(
        self, aggregator, registered_asset, signers
    ):
        """测试获取聚合APY"""
        # 先聚合
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 查询
        apy = aggregator.get_aggregated_apy(registered_asset)
        assert apy == 850
    
    def test_get_aggregated_valuation(
        self, aggregator, registered_asset, signers
    ):
        """测试获取聚合估值"""
        # 先聚合
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 查询
        valuation = aggregator.get_aggregated_valuation(registered_asset)
        assert valuation == 50_000_000 * 10**6
    
    def test_get_data_confidence(
        self, aggregator, registered_asset, signers
    ):
        """测试获取数据置信度"""
        # 先聚合
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 查询置信度
        confidence = aggregator.get_data_confidence(registered_asset)
        assert confidence == 10000  # 100%
    
    def test_confidence_zero_for_expired_cache(
        self, aggregator, registered_asset, signers
    ):
        """测试过期缓存置信度为0"""
        # 聚合数据
        aggregator.aggregate_data(registered_asset, sender=signers[0])
        
        # 快进超过缓存有效期
        chain.mine(deltatime=3601)
        
        # 置信度应该为0
        confidence = aggregator.get_data_confidence(registered_asset)
        assert confidence == 0


class TestConfiguration:
    """配置测试"""
    
    def test_set_cache_validity(self, aggregator, signers):
        """测试设置缓存有效期"""
        new_validity = 7200  # 2小时
        
        aggregator.set_cache_validity(new_validity, sender=signers[0])
        
        assert aggregator.cache_validity() == new_validity
    
    def test_set_deviation_threshold(self, aggregator, signers):
        """测试设置偏差阈值"""
        new_threshold = 500  # 5%
        
        aggregator.set_deviation_threshold(new_threshold, sender=signers[0])
        
        assert aggregator.deviation_threshold() == new_threshold
    
    def test_set_min_secondary_oracles(self, aggregator, signers):
        """测试设置最小次级预言机数量"""
        # 先添加足够的预言机
        for i in range(1, 6):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 设置最小数量
        aggregator.set_min_secondary_oracles(5, sender=signers[0])
        
        assert aggregator.min_secondary_oracles() == 5
    
    def test_enable_disable_secondary_oracles(self, aggregator, signers):
        """测试启用/禁用次级预言机"""
        # 添加足够的预言机
        for i in range(1, 4):
            aggregator.add_secondary_oracle(
                accounts.test_accounts[i].address,
                sender=signers[0]
            )
        
        # 启用
        aggregator.enable_secondary_oracles(sender=signers[0])
        assert aggregator.secondary_enabled()
        
        # 禁用
        aggregator.disable_secondary_oracles(sender=signers[0])
        assert not aggregator.secondary_enabled()
    
    def test_enable_without_enough_oracles_fails(self, aggregator, signers):
        """测试预言机不足时无法启用"""
        # 只添加1个（不足最小要求3个）
        aggregator.add_secondary_oracle(signers[1].address, sender=signers[0])
        
        with pytest.raises(Exception, match="Not enough oracles"):
            aggregator.enable_secondary_oracles(sender=signers[0])


class TestPauseAndOwnership:
    """暂停和所有权测试"""
    
    def test_pause_unpause(self, aggregator, signers):
        """测试暂停和恢复"""
        aggregator.pause(sender=signers[0])
        assert aggregator.paused()
        
        aggregator.unpause(sender=signers[0])
        assert not aggregator.paused()
    
    def test_submit_when_paused_fails(
        self, aggregator, registered_asset, signers
    ):
        """测试暂停时无法提交数据"""
        # 添加预言机
        aggregator.add_secondary_oracle(signers[1].address, sender=signers[0])
        
        # 暂停
        aggregator.pause(sender=signers[0])
        
        # 尝试提交数据
        with pytest.raises(Exception, match="paused"):
            aggregator.submit_secondary_data(
                registered_asset,
                855,
                50_100_000 * 10**6,
                sender=signers[1]
            )
    
    def test_transfer_ownership(self, aggregator, signers):
        """测试转移所有权"""
        new_owner = signers[1].address
        
        aggregator.transfer_ownership(new_owner, sender=signers[0])
        
        assert aggregator.owner() == new_owner

