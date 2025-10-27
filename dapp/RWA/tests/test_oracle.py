"""
RWAOracle 合约测试
测试资产注册、数据更新、合规状态、历史数据
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
def asset_id():
    """生成测试资产ID"""
    return bytes([1] * 32)


def create_and_approve_operation(multisig, timelock, target, data_hash, signers):
    """创建并批准时间锁操作的辅助函数"""
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


class TestOracleDeployment:
    """部署测试"""
    
    def test_deployment(self, oracle, multisig, timelock, signers):
        """测试部署配置"""
        assert oracle.owner() == signers[0].address
        assert oracle.multi_sig_manager() == multisig.address
        assert oracle.timelock() == timelock.address
        assert oracle.max_change_rate() == 500  # 5%
        assert oracle.data_validity_period() == 604800  # 7天
        assert not oracle.paused()
    
    def test_deployer_is_data_provider(self, oracle, signers):
        """测试部署者自动成为数据提供者"""
        assert oracle.is_data_provider(signers[0].address)


class TestRegisterAsset:
    """资产注册测试"""
    
    def test_register_asset_success(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试成功注册资产"""
        # 准备数据
        asset_name = "Manhattan Office Building"
        initial_apy = 850  # 8.5%
        initial_valuation = 50_000_000 * 10**6
        
        # 创建并批准操作
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        # 注册资产
        oracle.register_asset(
            asset_id,
            asset_name,
            initial_apy,
            initial_valuation,
            operation_id,
            sender=signers[0]
        )
        
        # 验证注册
        data = oracle.get_asset_data(asset_id)
        assert data[0] == asset_name  # asset_name
        assert data[1]  # is_active
        assert data[2] == initial_apy  # apy
        assert data[3] == initial_valuation  # valuation
        
        # 验证资产列表
        assert oracle.get_asset_count() == 1
        assert oracle.get_all_asset_ids()[0] == asset_id
    
    def test_register_without_timelock_fails(self, oracle, asset_id, signers):
        """测试未经时间锁注册失败"""
        with pytest.raises(Exception, match="Operation not ready"):
            oracle.register_asset(
                asset_id,
                "Test Asset",
                850,
                50_000_000 * 10**6,
                bytes([0] * 32),  # 无效的operation_id
                sender=signers[0]
            )
    
    def test_register_non_provider_fails(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试非数据提供者无法注册"""
        # 创建操作
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        # 非提供者尝试注册
        with pytest.raises(Exception, match="Only data provider"):
            oracle.register_asset(
                asset_id,
                "Test Asset",
                850,
                50_000_000 * 10**6,
                operation_id,
                sender=signers[2]  # 不是数据提供者
            )
    
    def test_register_apy_too_high_fails(
        self, oracle, multisig, timelock, asset_id, signers
    ):
        """测试APY超过最大值失败"""
        data_hash = bytes([2] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        with pytest.raises(Exception, match="APY too high"):
            oracle.register_asset(
                asset_id,
                "Test Asset",
                2500,  # 25% > MAX_APY (20%)
                50_000_000 * 10**6,
                operation_id,
                sender=signers[0]
            )


class TestUpdateAssetData:
    """资产数据更新测试"""
    
    @pytest.fixture
    def registered_asset(self, oracle, multisig, timelock, asset_id, signers):
        """注册一个测试资产"""
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
    
    def test_update_asset_data_success(
        self, oracle, multisig, timelock, registered_asset, signers
    ):
        """测试成功更新资产数据"""
        # 新数据
        new_apy = 870  # 8.7%
        new_valuation = 51_000_000 * 10**6
        new_occupancy = 9500  # 95%
        new_revenue = 425_000 * 10**6
        
        # 创建操作
        data_hash = bytes([3] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        # 更新数据
        oracle.update_asset_data(
            registered_asset,
            new_apy,
            new_valuation,
            new_occupancy,
            new_revenue,
            operation_id,
            sender=signers[0]
        )
        
        # 验证更新
        data = oracle.get_asset_data(registered_asset)
        assert data[2] == new_apy
        assert data[3] == new_valuation
        assert data[4] == new_occupancy
        assert data[5] == new_revenue
        assert data[10] == 1  # update_count
    
    def test_update_exceeds_change_rate_fails(
        self, oracle, multisig, timelock, registered_asset, signers
    ):
        """测试超过变化率限制失败"""
        # 尝试大幅提升APY（>5%变化）
        new_apy = 1300  # 13% (从8.5%涨到13%，超过5%变化率)
        
        data_hash = bytes([3] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        with pytest.raises(Exception, match="change too large"):
            oracle.update_asset_data(
                registered_asset,
                new_apy,
                50_000_000 * 10**6,
                9500,
                425_000 * 10**6,
                operation_id,
                sender=signers[0]
            )
    
    def test_historical_data_saved(
        self, oracle, multisig, timelock, registered_asset, signers
    ):
        """测试历史数据保存"""
        # 初始数据已经有1条历史
        assert oracle.historical_count(registered_asset) == 1
        
        # 进行一次更新
        data_hash = bytes([3] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        oracle.update_asset_data(
            registered_asset,
            870,
            51_000_000 * 10**6,
            9500,
            425_000 * 10**6,
            operation_id,
            sender=signers[0]
        )
        
        # 应该有2条历史
        assert oracle.historical_count(registered_asset) == 2
        
        # 检查历史数据
        history = oracle.get_historical_data(registered_asset, 0)
        assert history[0] == 850  # 初始APY


class TestComplianceStatus:
    """合规状态测试"""
    
    @pytest.fixture
    def registered_asset(self, oracle, multisig, timelock, asset_id, signers):
        """注册一个测试资产"""
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
    
    def test_update_compliance_status(
        self, oracle, multisig, timelock, registered_asset, signers
    ):
        """测试更新合规状态"""
        # 默认状态应该是UNDER_REVIEW
        assert oracle.get_compliance_status(registered_asset) == 1
        
        # 更新为COMPLIANT
        audit_hash = bytes([10] * 32)
        data_hash = bytes([4] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        oracle.update_compliance_status(
            registered_asset,
            0,  # COMPLIANT
            audit_hash,
            operation_id,
            sender=signers[0]
        )
        
        # 验证更新
        assert oracle.get_compliance_status(registered_asset) == 0
        
        # 验证审计报告哈希
        data = oracle.get_asset_data(registered_asset)
        assert data[7] == audit_hash


class TestDataProviderManagement:
    """数据提供者管理测试"""
    
    def test_add_data_provider(self, oracle, multisig, timelock, signers):
        """测试添加数据提供者"""
        new_provider = signers[1].address
        
        # 创建操作
        data_hash = bytes([5] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        # 添加提供者
        oracle.add_data_provider(
            new_provider,
            operation_id,
            sender=signers[0]
        )
        
        # 验证
        assert oracle.is_data_provider(new_provider)
    
    def test_remove_data_provider(self, oracle, multisig, timelock, signers):
        """测试移除数据提供者"""
        # 先添加
        new_provider = signers[1].address
        data_hash = bytes([5] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        oracle.add_data_provider(
            new_provider,
            operation_id,
            sender=signers[0]
        )
        
        # 再移除
        data_hash2 = bytes([6] * 32)
        operation_id2 = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash2, signers
        )
        oracle.remove_data_provider(
            new_provider,
            operation_id2,
            sender=signers[0]
        )
        
        # 验证
        assert not oracle.is_data_provider(new_provider)


class TestDataQuery:
    """数据查询测试"""
    
    @pytest.fixture
    def registered_asset(self, oracle, multisig, timelock, asset_id, signers):
        """注册一个测试资产"""
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
            870,
            51_000_000 * 10**6,
            9500,
            425_000 * 10**6,
            operation_id2,
            sender=signers[0]
        )
        
        return asset_id
    
    def test_get_apy(self, oracle, registered_asset):
        """测试获取APY"""
        apy = oracle.get_apy(registered_asset)
        assert apy == 870
    
    def test_get_valuation(self, oracle, registered_asset):
        """测试获取估值"""
        valuation = oracle.get_valuation(registered_asset)
        assert valuation == 51_000_000 * 10**6
    
    def test_get_occupancy_rate(self, oracle, registered_asset):
        """测试获取入住率"""
        rate = oracle.get_occupancy_rate(registered_asset)
        assert rate == 9500
    
    def test_get_monthly_revenue(self, oracle, registered_asset):
        """测试获取月度收入"""
        revenue = oracle.get_monthly_revenue(registered_asset)
        assert revenue == 425_000 * 10**6
    
    def test_data_validity(self, oracle, registered_asset):
        """测试数据有效性"""
        # 刚更新的数据应该有效
        assert oracle.is_data_valid(registered_asset)
        
        # 快进8天（超过7天有效期）
        chain.mine(deltatime=8 * 86400)
        
        # 数据应该失效
        assert not oracle.is_data_valid(registered_asset)


class TestPauseAndConfig:
    """暂停和配置测试"""
    
    def test_pause_unpause(self, oracle, signers):
        """测试暂停和恢复"""
        oracle.pause(sender=signers[0])
        assert oracle.paused()
        
        oracle.unpause(sender=signers[0])
        assert not oracle.paused()
    
    def test_set_max_change_rate(
        self, oracle, multisig, timelock, signers
    ):
        """测试设置最大变化率"""
        new_rate = 1000  # 10%
        
        data_hash = bytes([7] * 32)
        operation_id = create_and_approve_operation(
            multisig, timelock, oracle.address, data_hash, signers
        )
        
        oracle.set_max_change_rate(
            new_rate,
            operation_id,
            sender=signers[0]
        )
        
        assert oracle.max_change_rate() == new_rate
    
    def test_set_data_validity_period(self, oracle, signers):
        """测试设置数据有效期"""
        new_period = 86400  # 1天
        
        oracle.set_data_validity_period(new_period, sender=signers[0])
        
        assert oracle.data_validity_period() == new_period

