"""
代币合约测试
"""
import pytest
from ape import accounts, project


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


class TestMockUSDT:
    """MockUSDT 测试"""
    
    def test_initial_state(self, usdt):
        """测试初始状态"""
        assert usdt.name() == "Mock Tether USD"
        assert usdt.symbol() == "USDT"
        assert usdt.decimals() == 6
        assert usdt.totalSupply() == 0
    
    def test_mint(self, usdt, user1):
        """测试铸造"""
        amount = 1000 * 10**6  # 1000 USDT
        usdt.mint(user1.address, amount, sender=user1)
        assert usdt.balanceOf(user1.address) == amount
        assert usdt.totalSupply() == amount
    
    def test_transfer(self, usdt, user1, user2):
        """测试转账"""
        amount = 1000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        
        transfer_amount = 300 * 10**6
        usdt.transfer(user2.address, transfer_amount, sender=user1)
        
        assert usdt.balanceOf(user1.address) == amount - transfer_amount
        assert usdt.balanceOf(user2.address) == transfer_amount
    
    def test_approve_and_transfer_from(self, usdt, user1, user2):
        """测试授权和授权转账"""
        amount = 1000 * 10**6
        usdt.mint(user1.address, amount, sender=user1)
        
        approve_amount = 500 * 10**6
        usdt.approve(user2.address, approve_amount, sender=user1)
        assert usdt.allowance(user1.address, user2.address) == approve_amount
        
        transfer_amount = 300 * 10**6
        usdt.transferFrom(user1.address, user2.address, transfer_amount, sender=user2)
        
        assert usdt.balanceOf(user2.address) == transfer_amount
        assert usdt.allowance(user1.address, user2.address) == approve_amount - transfer_amount


class TestRWAToken:
    """RWAToken 测试"""
    
    def test_initial_state(self, rwa_token, deployer):
        """测试初始状态"""
        assert rwa_token.name() == "RWA Token"
        assert rwa_token.symbol() == "RWA"
        assert rwa_token.decimals() == 18
        assert rwa_token.totalSupply() == 0
        assert rwa_token.owner() == deployer.address
    
    def test_set_minter(self, rwa_token, deployer, user1):
        """测试设置铸造权限"""
        rwa_token.setMinter(user1.address, True, sender=deployer)
        assert rwa_token.minters(user1.address) == True
        
        rwa_token.setMinter(user1.address, False, sender=deployer)
        assert rwa_token.minters(user1.address) == False
    
    def test_mint(self, rwa_token, deployer, user1):
        """测试铸造"""
        # 设置铸造权限
        rwa_token.setMinter(deployer.address, True, sender=deployer)
        
        amount = 1000 * 10**18
        rwa_token.mint(user1.address, amount, sender=deployer)
        
        assert rwa_token.balanceOf(user1.address) == amount
        assert rwa_token.totalSupply() == amount
    
    def test_mint_unauthorized(self, rwa_token, user1, user2):
        """测试未授权铸造（应失败）"""
        amount = 1000 * 10**18
        with pytest.raises(Exception):
            rwa_token.mint(user2.address, amount, sender=user1)
    
    def test_burn(self, rwa_token, deployer, user1):
        """测试销毁"""
        # 设置铸造和销毁权限
        rwa_token.setMinter(deployer.address, True, sender=deployer)
        rwa_token.setBurner(deployer.address, True, sender=deployer)
        
        amount = 1000 * 10**18
        rwa_token.mint(user1.address, amount, sender=deployer)
        
        burn_amount = 300 * 10**18
        rwa_token.burn(user1.address, burn_amount, sender=deployer)
        
        assert rwa_token.balanceOf(user1.address) == amount - burn_amount
        assert rwa_token.totalSupply() == amount - burn_amount
    
    def test_transfer(self, rwa_token, deployer, user1, user2):
        """测试转账"""
        rwa_token.setMinter(deployer.address, True, sender=deployer)
        
        amount = 1000 * 10**18
        rwa_token.mint(user1.address, amount, sender=deployer)
        
        transfer_amount = 300 * 10**18
        rwa_token.transfer(user2.address, transfer_amount, sender=user1)
        
        assert rwa_token.balanceOf(user1.address) == amount - transfer_amount
        assert rwa_token.balanceOf(user2.address) == transfer_amount


class TestPlatformToken:
    """PlatformToken 测试"""
    
    def test_initial_state(self, platform_token, deployer):
        """测试初始状态"""
        assert platform_token.name() == "Platform Token"
        assert platform_token.symbol() == "PLT"
        assert platform_token.decimals() == 18
        assert platform_token.totalSupply() == 0
        assert platform_token.owner() == deployer.address
        assert platform_token.maxSupply() == 100_000_000 * 10**18
    
    def test_mint(self, platform_token, deployer, user1):
        """测试铸造"""
        platform_token.setMinter(deployer.address, True, sender=deployer)
        
        amount = 1_000_000 * 10**18
        platform_token.mint(user1.address, amount, sender=deployer)
        
        assert platform_token.balanceOf(user1.address) == amount
        assert platform_token.totalSupply() == amount
    
    def test_mint_exceeds_max_supply(self, platform_token, deployer, user1):
        """测试铸造超过最大供应量（应失败）"""
        platform_token.setMinter(deployer.address, True, sender=deployer)
        
        # 尝试铸造超过最大供应量
        amount = 100_000_001 * 10**18
        with pytest.raises(Exception):
            platform_token.mint(user1.address, amount, sender=deployer)
    
    def test_transfer(self, platform_token, deployer, user1, user2):
        """测试转账"""
        platform_token.setMinter(deployer.address, True, sender=deployer)
        
        amount = 1000 * 10**18
        platform_token.mint(user1.address, amount, sender=deployer)
        
        transfer_amount = 300 * 10**18
        platform_token.transfer(user2.address, transfer_amount, sender=user1)
        
        assert platform_token.balanceOf(user1.address) == amount - transfer_amount
        assert platform_token.balanceOf(user2.address) == transfer_amount

