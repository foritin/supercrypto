"""
流动性挖矿测试
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
def mock_lp_token(deployer):
    """创建一个模拟的LP Token（使用MockUSDT）"""
    return project.MockUSDT.deploy(sender=deployer)


@pytest.fixture
def platform_token(deployer):
    return project.PlatformToken.deploy(sender=deployer)


@pytest.fixture
def liquidity_mining(deployer, mock_lp_token, platform_token):
    lm = project.LiquidityMining.deploy(
        mock_lp_token.address,
        platform_token.address,
        sender=deployer
    )
    platform_token.setMinter(lm.address, True, sender=deployer)
    return lm


class TestLiquidityMining:
    """流动性挖矿测试"""
    
    def test_initial_state(self, liquidity_mining, mock_lp_token, platform_token, deployer):
        """测试初始状态"""
        assert liquidity_mining.owner() == deployer.address
        assert liquidity_mining.lpToken() == mock_lp_token.address
        assert liquidity_mining.platformToken() == platform_token.address
        assert liquidity_mining.paused() == False
        assert liquidity_mining.dailyEmission() == 5_000 * 10**18
        assert liquidity_mining.totalLPStaked() == 0
    
    def test_stake_lp_token(self, liquidity_mining, mock_lp_token, user1):
        """测试质押LP Token"""
        # 给用户铸造LP Token
        lp_amount = 1000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        
        # 授权并质押
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 验证
        assert mock_lp_token.balanceOf(liquidity_mining.address) == lp_amount
        assert liquidity_mining.totalLPStaked() == lp_amount
        assert liquidity_mining.lpStakeCount(user1.address) == 1
        
        stake_info = liquidity_mining.getLPStake(user1.address, 0)
        assert stake_info.amount == lp_amount
        assert stake_info.unstaked == False
    
    def test_unstake_lp_token(self, liquidity_mining, mock_lp_token, platform_token, user1):
        """测试解除LP Token质押"""
        # 质押
        lp_amount = 1000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 快进时间
        chain.pending_timestamp += 7 * 24 * 3600  # 7天
        chain.mine()
        
        # 解除质押
        initial_plt_balance = platform_token.balanceOf(user1.address)
        liquidity_mining.unstakeLPToken(0, sender=user1)
        
        # 验证
        assert mock_lp_token.balanceOf(user1.address) == lp_amount
        assert liquidity_mining.totalLPStaked() == 0
        
        stake_info = liquidity_mining.getLPStake(user1.address, 0)
        assert stake_info.unstaked == True
        
        # 应该收到奖励
        assert platform_token.balanceOf(user1.address) > initial_plt_balance
    
    def test_claim_lp_reward(self, liquidity_mining, mock_lp_token, platform_token, user1):
        """测试领取LP挖矿奖励"""
        # 质押
        lp_amount = 1000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 快进时间
        chain.pending_timestamp += 10 * 24 * 3600  # 10天
        chain.mine()
        
        # 查看待领取奖励
        pending_reward = liquidity_mining.calculateLPReward(user1.address, 0)
        assert pending_reward > 0
        
        # 领取奖励
        initial_balance = platform_token.balanceOf(user1.address)
        liquidity_mining.claimLPReward(0, sender=user1)
        
        # 验证
        final_balance = platform_token.balanceOf(user1.address)
        assert final_balance > initial_balance
        assert final_balance - initial_balance == pending_reward
        
        # 再次领取应该没有奖励（时间未过）
        pending_reward_2 = liquidity_mining.calculateLPReward(user1.address, 0)
        assert pending_reward_2 == 0
    
    def test_calculate_reward_by_share(self, liquidity_mining, mock_lp_token, user1, user2):
        """测试按质押占比分配奖励"""
        # 用户1质押75%
        lp_amount_1 = 750 * 10**18
        mock_lp_token.mint(user1.address, lp_amount_1, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount_1, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount_1, sender=user1)
        
        # 用户2质押25%
        lp_amount_2 = 250 * 10**18
        mock_lp_token.mint(user2.address, lp_amount_2, sender=user2)
        mock_lp_token.approve(liquidity_mining.address, lp_amount_2, sender=user2)
        liquidity_mining.stakeLPToken(lp_amount_2, sender=user2)
        
        # 快进1天
        chain.pending_timestamp += 24 * 3600
        chain.mine()
        
        # 计算奖励
        reward_1 = liquidity_mining.calculateLPReward(user1.address, 0)
        reward_2 = liquidity_mining.calculateLPReward(user2.address, 0)
        
        # 验证奖励比例大约是 3:1
        assert reward_1 > 0
        assert reward_2 > 0
        ratio = reward_1 / reward_2
        assert 2.5 < ratio < 3.5  # 允许一些误差
    
    def test_set_daily_emission(self, liquidity_mining, deployer):
        """测试设置每日释放量"""
        new_emission = 10_000 * 10**18
        liquidity_mining.setDailyEmission(new_emission, sender=deployer)
        assert liquidity_mining.dailyEmission() == new_emission
    
    def test_set_lp_token(self, liquidity_mining, deployer, mock_lp_token):
        """测试设置LP Token地址"""
        new_lp_token = accounts.test_accounts[5].address
        liquidity_mining.setLPToken(new_lp_token, sender=deployer)
        assert liquidity_mining.lpToken() == new_lp_token
    
    def test_pause(self, liquidity_mining, deployer, mock_lp_token, user1):
        """测试暂停功能"""
        # 暂停合约
        liquidity_mining.setPaused(True, sender=deployer)
        assert liquidity_mining.paused() == True
        
        # 尝试质押（应失败）
        lp_amount = 1000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        
        with pytest.raises(Exception):
            liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 恢复合约
        liquidity_mining.setPaused(False, sender=deployer)
        assert liquidity_mining.paused() == False
    
    def test_multiple_lp_stakes(self, liquidity_mining, mock_lp_token, platform_token, user1):
        """测试多次LP质押"""
        # 第一次质押
        lp_amount_1 = 1000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount_1, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount_1, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount_1, sender=user1)
        
        # 快进5天
        chain.pending_timestamp += 5 * 24 * 3600
        chain.mine()
        
        # 第二次质押
        lp_amount_2 = 2000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount_2, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount_2, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount_2, sender=user1)
        
        # 验证
        assert liquidity_mining.lpStakeCount(user1.address) == 2
        assert liquidity_mining.totalLPStaked() == lp_amount_1 + lp_amount_2
        
        # 第一次质押应该有奖励
        reward_1 = liquidity_mining.calculateLPReward(user1.address, 0)
        assert reward_1 > 0
        
        # 第二次质押刚开始，奖励为0
        reward_2 = liquidity_mining.calculateLPReward(user1.address, 1)
        assert reward_2 == 0
    
    def test_long_term_mining(self, liquidity_mining, mock_lp_token, platform_token, user1):
        """测试长期挖矿"""
        # 质押
        lp_amount = 10_000 * 10**18
        mock_lp_token.mint(user1.address, lp_amount, sender=user1)
        mock_lp_token.approve(liquidity_mining.address, lp_amount, sender=user1)
        liquidity_mining.stakeLPToken(lp_amount, sender=user1)
        
        # 快进30天
        chain.pending_timestamp += 30 * 24 * 3600
        chain.mine()
        
        # 计算奖励（应该是 30天 * 5000 PLT/天 = 150,000 PLT）
        reward = liquidity_mining.calculateLPReward(user1.address, 0)
        expected_reward = 30 * 5_000 * 10**18
        
        # 允许一些误差
        assert abs(reward - expected_reward) < expected_reward * 0.01  # 1%误差

