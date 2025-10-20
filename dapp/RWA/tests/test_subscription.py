"""
认购合约测试
"""
import pytest
from ape import accounts, project, chain


@pytest.fixture
def deployer():
    return accounts.test_accounts[0]


@pytest.fixture
def user1():
    return accounts.test_accounts[1]


@pytest.fixture
def user2():
    return accounts.test_accounts[2]


@pytest.fixture
def usdt(deployer):
    return project.MockUSDT.deploy(sender=deployer)


@pytest.fixture
def rwa_token(deployer):
    return project.RWAToken.deploy(sender=deployer)


@pytest.fixture
def subscription(deployer, usdt, rwa_token):
    sub = project.Subscription.deploy(
        usdt.address,
        rwa_token.address,
        sender=deployer
    )
    
    # 设置权限
    rwa_token.setMinter(sub.address, True, sender=deployer)
    rwa_token.setBurner(sub.address, True, sender=deployer)
    
    return sub


class TestSubscription:
    """认购合约测试"""
    
    def test_initial_state(self, subscription, usdt, rwa_token, deployer):
        """测试初始状态"""
        assert subscription.owner() == deployer.address
        assert subscription.usdt() == usdt.address
        assert subscription.rwaToken() == rwa_token.address
        assert subscription.paused() == False
        
        # 检查默认APY
        lock_periods = subscription.getLockPeriods()
        assert subscription.lockPeriodAPY(lock_periods[0]) == 800   # 8%
        assert subscription.lockPeriodAPY(lock_periods[1]) == 1000  # 10%
        assert subscription.lockPeriodAPY(lock_periods[2]) == 1200  # 12%
        assert subscription.lockPeriodAPY(lock_periods[3]) == 1500  # 15%
    
    def test_subscribe(self, subscription, usdt, rwa_token, user1):
        """测试认购"""
        # 给用户铸造USDT
        amount = 10_000 * 10**6  # 10,000 USDT
        usdt.mint(user1.address, amount, sender=user1)
        
        # 授权认购合约
        usdt.approve(subscription.address, amount, sender=user1)
        
        # 认购 1个月期
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 验证结果
        assert usdt.balanceOf(subscription.address) == amount
        assert rwa_token.balanceOf(user1.address) == amount * 10**12  # 转换精度
        assert subscription.subscriptionCount(user1.address) == 1
        
        # 检查认购记录
        sub_info = subscription.getSubscription(user1.address, 0)
        assert sub_info.principal == amount
        assert sub_info.lockPeriod == lock_1_month
        assert sub_info.redeemed == False
    
    def test_redeem(self, subscription, usdt, rwa_token, user1):
        """测试赎回"""
        # 认购
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 给合约充值USDT用于支付利息
        interest_amount = 100 * 10**6
        usdt.mint(subscription.address, interest_amount, sender=user1)
        
        # 快进时间（1个月）
        chain.pending_timestamp += lock_1_month
        chain.mine()
        
        # 获取预期利息
        expected_interest = subscription.getPendingReward(user1.address, 0)
        
        # 赎回
        rwa_amount = amount * 10**12
        rwa_token.approve(subscription.address, rwa_amount, sender=user1)
        
        subscription.redeem(0, sender=user1)
        
        # 验证结果
        assert rwa_token.balanceOf(user1.address) == 0  # RWA代币被销毁
        assert usdt.balanceOf(user1.address) >= amount  # 收到本金+利息
        
        # 检查认购记录
        sub_info = subscription.getSubscription(user1.address, 0)
        assert sub_info.redeemed == True
    
    def test_redeem_before_lock_period(self, subscription, usdt, user1):
        """测试锁定期内赎回（应失败）"""
        # 认购
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 尝试立即赎回（应失败）
        with pytest.raises(Exception):
            subscription.redeem(0, sender=user1)
    
    def test_calculate_interest(self, subscription):
        """测试利息计算"""
        principal = 10_000 * 10**6  # 10,000 USDT
        lock_period = 30 * 24 * 3600  # 30天
        apy = 800  # 8%
        
        interest = subscription.calculateInterest(principal, lock_period, apy)
        
        # 预期利息 = 10,000 * 0.08 * (30/365) ≈ 65.75 USDT
        # 65.75 * 10^6 = 65,750,000
        expected = principal * apy * lock_period // (365 * 24 * 3600) // 10000
        assert abs(interest - expected) < 100  # 允许小误差
    
    def test_set_apy(self, subscription, deployer):
        """测试设置APY"""
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        
        new_apy = 1000  # 10%
        subscription.setAPY(lock_1_month, new_apy, sender=deployer)
        
        assert subscription.lockPeriodAPY(lock_1_month) == new_apy
    
    def test_pause(self, subscription, deployer, usdt, user1):
        """测试暂停功能"""
        # 暂停合约
        subscription.setPaused(True, sender=deployer)
        assert subscription.paused() == True
        
        # 尝试认购（应失败）
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        with pytest.raises(Exception):
            subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        # 恢复合约
        subscription.setPaused(False, sender=deployer)
        assert subscription.paused() == False
    
    def test_multiple_subscriptions(self, subscription, usdt, rwa_token, user1):
        """测试多次认购"""
        usdt.mint(user1.address, 100_000 * 10**6, sender=user1)
        usdt.approve(subscription.address, 100_000 * 10**6, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        
        # 认购3次不同期限
        subscription.subscribe(10_000 * 10**6, lock_periods[0], sender=user1)
        subscription.subscribe(20_000 * 10**6, lock_periods[1], sender=user1)
        subscription.subscribe(30_000 * 10**6, lock_periods[2], sender=user1)
        
        # 验证
        assert subscription.subscriptionCount(user1.address) == 3
        
        sub_info_0 = subscription.getSubscription(user1.address, 0)
        sub_info_1 = subscription.getSubscription(user1.address, 1)
        sub_info_2 = subscription.getSubscription(user1.address, 2)
        
        assert sub_info_0.principal == 10_000 * 10**6
        assert sub_info_1.principal == 20_000 * 10**6
        assert sub_info_2.principal == 30_000 * 10**6

