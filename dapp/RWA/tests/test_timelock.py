"""
Timelock 合约测试
测试24小时时间锁、紧急快速通道、操作管理
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
def mock_target(signers):
    """部署模拟目标合约（使用USDT作为替代）"""
    return signers[0].deploy(project.MockUSDT)


class TestTimelockBasic:
    """基础功能测试"""
    
    def test_deployment(self, timelock, multisig):
        """测试部署"""
        assert timelock.owner() == accounts.test_accounts[0].address
        assert timelock.multi_sig_manager() == multisig.address
        assert timelock.delay() == 86400  # 24小时
        assert not timelock.paused()
    
    def test_delay_bounds(self, timelock):
        """测试延迟时间边界"""
        # 最小延迟：86400秒（24小时）
        # 最大延迟：604800秒（7天）
        assert timelock.delay() >= 86400
        assert timelock.delay() <= 604800


class TestQueueOperation:
    """操作排队测试"""
    
    def test_queue_operation_success(self, timelock, multisig, mock_target, signers):
        """测试成功排队操作"""
        # 创建并批准多签提案
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        # 排队操作
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        
        # 检查事件
        assert len(tx.events) > 0
        
        # 获取操作ID（从事件中）
        operation_id = tx.events[0].operation_id
        
        # 检查操作状态
        operation = timelock.get_operation(operation_id)
        assert operation[0] == mock_target.address  # target
        assert operation[1] == data_hash  # data_hash
        assert operation[2] == proposal_id  # proposal_id
    
    def test_queue_without_approval_fails(self, timelock, mock_target, signers):
        """测试未经批准的提案无法排队"""
        data_hash = bytes([1] * 32)
        
        with pytest.raises(Exception):
            timelock.queue_operation(
                mock_target.address,
                data_hash,
                999,  # 不存在的提案
                sender=signers[0]
            )
    
    def test_queue_when_paused_fails(self, timelock, multisig, mock_target, signers):
        """测试暂停时无法排队"""
        # 暂停合约
        timelock.pause(sender=signers[0])
        
        # 尝试排队
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        with pytest.raises(Exception, match="paused"):
            timelock.queue_operation(
                mock_target.address,
                data_hash,
                proposal_id,
                sender=signers[0]
            )


class TestExecuteOperation:
    """操作执行测试"""
    
    def test_execute_after_delay(self, timelock, multisig, mock_target, signers):
        """测试延迟后执行操作"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 检查尚未就绪
        assert not timelock.is_operation_ready(operation_id)
        
        # 快进24小时
        chain.mine(deltatime=86400)
        
        # 现在应该就绪
        assert timelock.is_operation_ready(operation_id)
        
        # 执行操作
        timelock.execute_operation(operation_id, sender=signers[0])
        
        # 验证状态
        operation = timelock.get_operation(operation_id)
        assert operation[5] == 2  # EXECUTED状态
    
    def test_execute_too_early_fails(self, timelock, multisig, mock_target, signers):
        """测试提前执行失败"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 尝试立即执行（未等待24小时）
        with pytest.raises(Exception, match="Too early"):
            timelock.execute_operation(operation_id, sender=signers[0])
    
    def test_time_until_ready(self, timelock, multisig, mock_target, signers):
        """测试剩余时间查询"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 检查剩余时间
        remaining = timelock.time_until_ready(operation_id)
        assert remaining > 0
        assert remaining <= 86400
        
        # 快进一半时间
        chain.mine(deltatime=43200)
        
        remaining = timelock.time_until_ready(operation_id)
        assert remaining > 0
        assert remaining <= 43200
        
        # 快进完整时间
        chain.mine(deltatime=43200)
        
        remaining = timelock.time_until_ready(operation_id)
        assert remaining == 0


class TestCancelOperation:
    """操作取消测试"""
    
    def test_cancel_operation(self, timelock, multisig, mock_target, signers):
        """测试取消操作"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 创建取消提案
        cancel_proposal_id = multisig.create_proposal(
            timelock.address,
            bytes([2] * 32),
            sender=signers[0]
        )
        multisig.sign_proposal(cancel_proposal_id, sender=signers[1])
        
        # 取消操作
        timelock.cancel_operation(
            operation_id,
            cancel_proposal_id,
            sender=signers[0]
        )
        
        # 验证状态
        operation = timelock.get_operation(operation_id)
        assert operation[5] == 3  # CANCELLED状态


class TestEmergencyExecution:
    """紧急执行测试"""
    
    def test_emergency_execution_3_of_3(self, timelock, multisig, mock_target, signers):
        """测试3-of-3紧急执行"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 所有签名者进行紧急签名
        for signer in signers:
            timelock.emergency_sign(operation_id, sender=signer)
        
        # 验证签名计数
        assert timelock.get_emergency_signature_count(operation_id) == 3
        
        # 紧急执行（无需等待24小时）
        timelock.emergency_execute(operation_id, sender=signers[0])
        
        # 验证状态
        operation = timelock.get_operation(operation_id)
        assert operation[5] == 2  # EXECUTED状态
    
    def test_emergency_execution_insufficient_signatures_fails(
        self, timelock, multisig, mock_target, signers
    ):
        """测试签名不足时紧急执行失败"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 只有2个签名者签名
        timelock.emergency_sign(operation_id, sender=signers[0])
        timelock.emergency_sign(operation_id, sender=signers[1])
        
        # 尝试紧急执行（应该失败）
        with pytest.raises(Exception, match="Need all signatures"):
            timelock.emergency_execute(operation_id, sender=signers[0])
    
    def test_emergency_sign_twice_fails(self, timelock, multisig, mock_target, signers):
        """测试重复紧急签名失败"""
        # 创建并排队操作
        data_hash = bytes([1] * 32)
        proposal_id = multisig.create_proposal(
            mock_target.address,
            data_hash,
            sender=signers[0]
        )
        multisig.sign_proposal(proposal_id, sender=signers[1])
        
        tx = timelock.queue_operation(
            mock_target.address,
            data_hash,
            proposal_id,
            sender=signers[0]
        )
        operation_id = tx.events[0].operation_id
        
        # 第一次签名
        timelock.emergency_sign(operation_id, sender=signers[0])
        
        # 尝试第二次签名（应该失败）
        with pytest.raises(Exception, match="Already signed"):
            timelock.emergency_sign(operation_id, sender=signers[0])


class TestPauseAndOwnership:
    """暂停和所有权测试"""
    
    def test_pause_unpause(self, timelock, signers):
        """测试暂停和恢复"""
        # 暂停
        timelock.pause(sender=signers[0])
        assert timelock.paused()
        
        # 恢复
        timelock.unpause(sender=signers[0])
        assert not timelock.paused()
    
    def test_only_owner_can_pause(self, timelock, signers):
        """测试只有所有者可以暂停"""
        with pytest.raises(Exception, match="Only owner"):
            timelock.pause(sender=signers[1])
    
    def test_transfer_ownership(self, timelock, signers):
        """测试转移所有权"""
        new_owner = signers[1].address
        
        timelock.transfer_ownership(new_owner, sender=signers[0])
        
        assert timelock.owner() == new_owner
    
    def test_only_owner_can_transfer(self, timelock, signers):
        """测试只有所有者可以转移所有权"""
        with pytest.raises(Exception, match="Only owner"):
            timelock.transfer_ownership(
                signers[2].address,
                sender=signers[1]
            )

