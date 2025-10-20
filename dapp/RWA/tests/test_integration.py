"""
集成测试 - 完整业务流程
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
def user3():
    return accounts.test_accounts[3]


@pytest.fixture
def setup_system(deployer):
    """部署完整系统"""
    # 部署代币
    usdt = project.MockUSDT.deploy(sender=deployer)
    rwa_token = project.RWAToken.deploy(sender=deployer)
    platform_token = project.PlatformToken.deploy(sender=deployer)
    
    # 部署认购合约
    subscription = project.Subscription.deploy(
        usdt.address,
        rwa_token.address,
        sender=deployer
    )
    
    # 设置权限
    rwa_token.setMinter(subscription.address, True, sender=deployer)
    rwa_token.setBurner(subscription.address, True, sender=deployer)
    
    # 部署质押合约
    staking = project.Staking.deploy(
        rwa_token.address,
        platform_token.address,
        subscription.address,
        sender=deployer
    )
    platform_token.setMinter(staking.address, True, sender=deployer)
    
    # 创建模拟LP Token
    mock_lp_token = project.MockUSDT.deploy(sender=deployer)
    
    # 部署流动性挖矿
    liquidity_mining = project.LiquidityMining.deploy(
        mock_lp_token.address,
        platform_token.address,
        sender=deployer
    )
    platform_token.setMinter(liquidity_mining.address, True, sender=deployer)
    
    return {
        "usdt": usdt,
        "rwa_token": rwa_token,
        "platform_token": platform_token,
        "subscription": subscription,
        "staking": staking,
        "liquidity_mining": liquidity_mining,
        "mock_lp_token": mock_lp_token
    }


class TestIntegration:
    """集成测试"""
    
    def test_full_subscription_lifecycle(self, setup_system, user1):
        """测试完整的认购-赎回流程"""
        usdt = setup_system["usdt"]
        rwa_token = setup_system["rwa_token"]
        subscription = setup_system["subscription"]
        
        # 1. 用户获取USDT
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        
        # 2. 认购权益代币（3个月期）
        usdt.approve(subscription.address, amount, sender=user1)
        lock_periods = subscription.getLockPeriods()
        lock_3_months = lock_periods[1]
        
        subscription.subscribe(amount, lock_3_months, sender=user1)
        
        # 验证认购成功
        assert rwa_token.balanceOf(user1.address) == amount * 10**12
        assert subscription.subscriptionCount(user1.address) == 1
        
        # 3. 给合约充值USDT用于支付利息
        interest = amount * 1000 * lock_3_months // (365 * 24 * 3600) // 10000
        usdt.mint(subscription.address, interest + 10**6, sender=user1)
        
        # 4. 快进到赎回期
        chain.pending_timestamp += lock_3_months
        chain.mine()
        
        # 5. 赎回
        subscription.redeem(0, sender=user1)
        
        # 验证赎回成功
        assert rwa_token.balanceOf(user1.address) == 0
        assert usdt.balanceOf(user1.address) >= amount  # 收到本金+利息
        
        sub_info = subscription.getSubscription(user1.address, 0)
        assert sub_info.redeemed == True
    
    def test_subscription_and_staking(self, setup_system, user1):
        """测试认购+质押挖矿流程"""
        usdt = setup_system["usdt"]
        rwa_token = setup_system["rwa_token"]
        platform_token = setup_system["platform_token"]
        subscription = setup_system["subscription"]
        staking = setup_system["staking"]
        
        # 1. 认购
        amount = 50_000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        usdt.approve(subscription.address, amount, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount, lock_periods[2], sender=user1)  # 6个月期
        
        rwa_amount = amount * 10**12
        
        # 2. 质押
        rwa_token.approve(staking.address, rwa_amount, sender=user1)
        staking.stake(rwa_amount, 0, sender=user1)
        
        # 验证质押成功
        assert staking.totalStaked() == rwa_amount
        assert staking.stakeCount(user1.address) == 1
        
        # 3. 等待一段时间
        chain.pending_timestamp += 30 * 24 * 3600  # 30天
        chain.mine()
        
        # 4. 领取质押奖励
        initial_plt = platform_token.balanceOf(user1.address)
        staking.claimReward(0, sender=user1)
        
        # 验证收到奖励
        assert platform_token.balanceOf(user1.address) > initial_plt
        
        # 5. 再等30天
        chain.pending_timestamp += 30 * 24 * 3600
        chain.mine()
        
        # 6. 解除质押
        staking.unstake(0, sender=user1)
        
        # 验证解除质押成功
        assert rwa_token.balanceOf(user1.address) == rwa_amount
        
        stake_info = staking.getStake(user1.address, 0)
        assert stake_info.unstaked == True
        
        # 7. 验证赎回期顺延
        new_redeem_time = staking.getNewRedeemTime(user1.address, 0)
        sub_info = subscription.getSubscription(user1.address, 0)
        assert new_redeem_time > sub_info.redeemTime  # 赎回期已顺延
    
    def test_multiple_users_staking(self, setup_system, user1, user2, user3):
        """测试多用户质押挖矿"""
        usdt = setup_system["usdt"]
        rwa_token = setup_system["rwa_token"]
        platform_token = setup_system["platform_token"]
        subscription = setup_system["subscription"]
        staking = setup_system["staking"]
        
        lock_periods = subscription.getLockPeriods()
        users = [user1, user2, user3]
        amounts = [10_000 * 10**6, 20_000 * 10**6, 30_000 * 10**6]
        
        # 1. 三个用户分别认购和质押
        for user, amount in zip(users, amounts):
            usdt.mint(user.address, amount, sender=user)
            usdt.approve(subscription.address, amount, sender=user)
            subscription.subscribe(amount, lock_periods[0], sender=user)
            
            rwa_amount = amount * 10**12
            rwa_token.approve(staking.address, rwa_amount, sender=user)
            staking.stake(rwa_amount, 0, sender=user)
        
        # 2. 验证总质押量
        total_expected = sum(amounts) * 10**12
        assert staking.totalStaked() == total_expected
        
        # 3. 快进时间
        chain.pending_timestamp += 15 * 24 * 3600  # 15天
        chain.mine()
        
        # 4. 计算每个用户的奖励
        rewards = []
        for i, user in enumerate(users):
            reward = staking.calculateReward(user.address, 0)
            rewards.append(reward)
            assert reward > 0
        
        # 5. 验证奖励与质押量成正比
        # user1:user2:user3 = 1:2:3
        ratio_12 = rewards[0] / rewards[1]
        ratio_23 = rewards[1] / rewards[2]
        
        assert 0.45 < ratio_12 < 0.55  # 约 1:2
        assert 0.62 < ratio_23 < 0.72  # 约 2:3
    
    def test_liquidity_mining_flow(self, setup_system, user1):
        """测试流动性挖矿流程"""
        platform_token = setup_system["platform_token"]
        liquidity_mining = setup_system["liquidity_mining"]
        mock_lp_token = setup_system["mock_lp_token"]
        
        # 1. 获取LP Token（模拟添加流动性）
        lp_amount = 5_000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        
        # 2. 质押LP Token
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 验证质押成功
        assert liquidity_mining.totalLPStaked() == lp_amount
        
        # 3. 等待挖矿
        chain.pending_timestamp += 20 * 24 * 3600  # 20天
        chain.mine()
        
        # 4. 领取奖励
        initial_plt = platform_token.balanceOf(user1.address)
        liquidity_mining.claimLPReward(0, sender=user1)
        
        # 验证收到奖励（约20天 * 5000 PLT/天 = 100,000 PLT）
        final_plt = platform_token.balanceOf(user1.address)
        assert final_plt > initial_plt
        
        expected_reward = 20 * 5_000 * 10**18
        actual_reward = final_plt - initial_plt
        assert abs(actual_reward - expected_reward) < expected_reward * 0.01
        
        # 5. 解除质押
        liquidity_mining.unstakeLPToken(0, sender=user1)
        
        # 验证取回LP Token
        assert mock_lp_token.balanceOf(user1.address) == lp_amount
    
    def test_complete_ecosystem(self, setup_system, deployer, user1, user2):
        """测试完整生态系统"""
        usdt = setup_system["usdt"]
        rwa_token = setup_system["rwa_token"]
        platform_token = setup_system["platform_token"]
        subscription = setup_system["subscription"]
        staking = setup_system["staking"]
        liquidity_mining = setup_system["liquidity_mining"]
        mock_lp_token = setup_system["mock_lp_token"]
        
        # ===== 用户1：认购 + 质押挖矿 =====
        
        # 1. 用户1认购权益代币
        amount_1 = 30_000 * 10**6
        usdt.mint(user1.address, amount_1, sender=user1)
        usdt.approve(subscription.address, amount_1, sender=user1)
        
        lock_periods = subscription.getLockPeriods()
        subscription.subscribe(amount_1, lock_periods[1], sender=user1)
        
        # 2. 用户1质押挖矿
        rwa_amount_1 = amount_1 * 10**12
        rwa_token.approve(staking.address, rwa_amount_1, sender=user1)
        staking.stake(rwa_amount_1, 0, sender=user1)
        
        # ===== 用户2：流动性挖矿 =====
        
        # 3. 用户2提供流动性（模拟）
        lp_amount_2 = 10_000 * 10**18
        mock_lp_token.mint(user2.address, lp_amount_2, sender=user2)
        mock_lp_token.approve(liquidity_mining.address, lp_amount_2, sender=user2)
        liquidity_mining.stakeLPToken(lp_amount_2, sender=user2)
        
        # ===== 系统运行一段时间 =====
        
        # 4. 快进30天
        chain.pending_timestamp += 30 * 24 * 3600
        chain.mine()
        
        # ===== 检查奖励 =====
        
        # 5. 用户1领取质押奖励
        plt_before_1 = platform_token.balanceOf(user1.address)
        staking.claimReward(0, sender=user1)
        plt_after_1 = platform_token.balanceOf(user1.address)
        
        staking_reward = plt_after_1 - plt_before_1
        assert staking_reward > 0
        
        # 6. 用户2领取流动性挖矿奖励
        plt_before_2 = platform_token.balanceOf(user2.address)
        liquidity_mining.claimLPReward(0, sender=user2)
        plt_after_2 = platform_token.balanceOf(user2.address)
        
        lp_reward = plt_after_2 - plt_before_2
        assert lp_reward > 0
        
        # ===== 验证系统状态 =====
        
        # 7. 验证平台代币总供应量
        total_minted = staking_reward + lp_reward
        assert platform_token.totalSupply() == total_minted
        assert total_minted <= platform_token.maxSupply()
        
        # 8. 验证质押状态
        assert staking.totalStaked() == rwa_amount_1
        assert liquidity_mining.totalLPStaked() == lp_amount_2
        
        print(f"\n系统运行30天后:")
        print(f"  用户1质押奖励: {staking_reward / 10**18:.2f} PLT")
        print(f"  用户2流动性奖励: {lp_reward / 10**18:.2f} PLT")
        print(f"  平台代币总发行: {total_minted / 10**18:.2f} PLT")
    
    def test_apy_update_impact(self, setup_system, deployer, user1):
        """测试动态调整APY的影响"""
        usdt = setup_system["usdt"]
        rwa_token = setup_system["rwa_token"]
        subscription = setup_system["subscription"]
        
        lock_periods = subscription.getLockPeriods()
        lock_1_month = lock_periods[0]
        
        # 1. 记录初始APY
        initial_apy = subscription.lockPeriodAPY(lock_1_month)
        assert initial_apy == 800  # 8%
        
        # 2. 用户1以旧APY认购
        amount = 10_000 * 10**6
        usdt.mint(user1.address, amount * 2, sender=user1)
        usdt.approve(subscription.address, amount * 2, sender=user1)
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 3. 管理员调整APY
        new_apy = 1200  # 12%
        subscription.setAPY(lock_1_month, new_apy, sender=deployer)
        assert subscription.lockPeriodAPY(lock_1_month) == new_apy
        
        # 4. 用户1以新APY再次认购
        subscription.subscribe(amount, lock_1_month, sender=user1)
        
        # 5. 验证两次认购的APY不同
        sub_info_0 = subscription.getSubscription(user1.address, 0)
        sub_info_1 = subscription.getSubscription(user1.address, 1)
        
        assert sub_info_0.apy == initial_apy
        assert sub_info_1.apy == new_apy
        
        # 6. 计算利息差异
        interest_0 = subscription.getPendingReward(user1.address, 0)
        interest_1 = subscription.getPendingReward(user1.address, 1)
        
        # 新APY的利息应该更高
        assert interest_1 > interest_0

