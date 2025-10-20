"""
质押合约测试
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
def platform_token(deployer):
    return project.PlatformToken.deploy(sender=deployer)


@pytest.fixture
def subscription(deployer, usdt, rwa_token):
    sub = project.Subscription.deploy(
        usdt.address,
        rwa_token.address,
        sender=deployer
    )
    rwa_token.setMinter(sub.address, True, sender=deployer)
    rwa_token.setBurner(sub.address, True, sender=deployer)
    return sub


@pytest.fixture
def staking(deployer, rwa_token, platform_token, subscription):
    stake = project.Staking.deploy(
        rwa_token.address,
        platform_token.address,
        subscription.address,
        sender=deployer
    )
    platform_token.setMinter(stake.address, True, sender=deployer)
    return stake


class TestStaking:
    """质押合约测试"""
    
    def test_initial_state(self, staking, rwa_token, platform_token, subscription, deployer):
        """测试初始状态"""
        assert staking.owner() == deployer.address
        assert staking.rwaToken() == rwa_token.address
        assert staking.platformToken() == platform_token.address
        assert staking.subscription() == subscription.address
        assert staking.paused() == False
        assert staking.stakingAPY() == 3000  # 30%
        assert staking.totalStaked() == 0
    
    def test_stake(self, staking, subscription, usdt, rwa_token, user1):
        """测试质押"""
        # 先认购RWA代币
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        # 质押RWA代币
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 验证
        assert rwa_token.balanceOf(staking.address) == rwa_amount
        assert staking.totalStaked() == rwa_amount
        assert staking.stakeCount(user1.address) == 1
        
        stake_info = staking.getStake(user1.address, 0)
        assert stake_info.amount == rwa_amount
        assert stake_info.unstaked == False
    
    def test_unstake(self, staking, subscription, usdt, rwa_token, platform_token, user1):
        """测试解除质押"""
        # 认购和质押
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 快进一些时间
        chain.pending_timestamp += 7 * 24 * 3600  # 7天
        chain.mine()
        
        # 解除质押
        initial_plt_balance = platform_token.balanceOf(user1.address)
        staking.unstake(0, sender=user1)
        
        # 验证
        assert rwa_token.balanceOf(user1.address) == rwa_amount
        assert staking.totalStaked() == 0
        
        stake_info = staking.getStake(user1.address, 0)
        assert stake_info.unstaked == True
        
        # 应该收到奖励
        assert platform_token.balanceOf(user1.address) > initial_plt_balance
    
    def test_claim_reward(self, staking, subscription, usdt, rwa_token, platform_token, user1):
        """测试领取奖励"""
        # 认购和质押
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 快进时间
        chain.pending_timestamp += 30 * 24 * 3600  # 30天
        chain.mine()
        
        # 查看待领取奖励
        pending_reward = staking.calculateReward(user1.address, 0)
        assert pending_reward > 0
        
        # 领取奖励
        initial_balance = platform_token.balanceOf(user1.address)
        staking.claimReward(0, sender=user1)
        
        # 验证
        final_balance = platform_token.balanceOf(user1.address)
        assert final_balance > initial_balance
        assert final_balance - initial_balance == pending_reward
    
    def test_redeem_time_extension(self, staking, subscription, usdt, rwa_token, user1):
        """测试赎回期顺延"""
        # 认购
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 获取原始赎回时间
        sub_info = subscription.getSubscription(user1.address, 0)
        original_redeem_time = sub_info.redeemTime
        
        # 质押
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 快进时间（质押10天）
        stake_duration = 10 * 24 * 3600
        chain.pending_timestamp += stake_duration
        chain.mine()
        
        # 获取新的赎回时间（应该顺延）
        new_redeem_time = staking.getNewRedeemTime(user1.address, 0)
        assert new_redeem_time >= original_redeem_time + stake_duration
    
    def test_calculate_reward_apy_and_emission(self, staking, subscription, usdt, rwa_token, user1):
        """测试奖励计算（APY + 固定释放）"""
        # 认购和质押
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 快进1天
        chain.pending_timestamp += 24 * 3600
        chain.mine()
        
        # 计算奖励
        reward = staking.calculateReward(user1.address, 0)
        assert reward > 0
        
        # 奖励应该包含两部分：
        # 1. APY奖励: rwa_amount * 30% * 1天 / 365天
        # 2. 固定释放奖励: 10000 * 质押占比 * 1天
    
    def test_set_staking_apy(self, staking, deployer):
        """测试设置质押APY"""
        new_apy = 5000  # 50%
        staking.setStakingAPY(new_apy, sender=deployer)
        assert staking.stakingAPY() == new_apy
    
    def test_set_daily_emission(self, staking, deployer):
        """测试设置每日释放量"""
        new_emission = 20_000 * 10**18
        staking.setDailyEmission(new_emission, sender=deployer)
        assert staking.dailyEmission() == new_emission
    
    def test_pause(self, staking, deployer, subscription, usdt, rwa_token, user1):
        """测试暂停功能"""
        # 先认购
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[0], sender=user1)
        
        # 暂停合约
        staking.setPaused(True, sender=deployer)
        assert staking.paused() == True
        
        # 尝试质押（应失败）
        rwa_amount = amount * 10**12
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        
        with pytest.raises(Exception):
            staking.stake(rwa_amount, 0, sender=user1)
    
    def test_multiple_stakes(self, staking, subscription, usdt, rwa_token, platform_token, user1):
        """测试多次质押"""
        # 认购多次
        usdt.mint(user1.address, 100_000 * 10**6, sender=user1)
        usdt.approve(subscription.address, 100_000 * 10**6, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        
        subscription.subscribe(10_000 * 10**6, lock_periods[0], sender=user1)
        subscription.subscribe(20_000 * 10**6, lock_periods[1], sender=user1)
        
        # 质押两次
        rwa_token.approve(staking.address, 30_000 * 10**18, sender=user1)
        staking.stake(10_000 * 10**18, 0, sender=user1)
        staking.stake(20_000 * 10**18, 1, sender=user1)
        
        # 验证
        assert staking.stakeCount(user1.address) == 2
        assert staking.totalStaked() == 30_000 * 10**18

