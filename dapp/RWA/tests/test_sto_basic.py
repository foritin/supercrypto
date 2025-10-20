"""
STO 基础功能测试
测试KYC验证、转账限制等STO合规功能
"""
import pytest
import ape


@pytest.fixture
def owner(accounts):
    return accounts[0]


@pytest.fixture
def investor1(accounts):
    return accounts[1]


@pytest.fixture
def investor2(accounts):
    return accounts[2]


@pytest.fixture
def non_kyc_user(accounts):
    return accounts[3]


@pytest.fixture
def kyc_manager(project, owner):
    """部署KYC管理合约"""
    return project.KYCManager.deploy(sender=owner)


@pytest.fixture
def rwa_token_sto(project, owner, kyc_manager):
    """部署RWA STO代币"""
    return project.RWATokenSTO.deploy(kyc_manager.address, sender=owner)


@pytest.fixture
def usdt(project, owner):
    """部署Mock USDT"""
    return project.MockUSDT.deploy(sender=owner)


@pytest.fixture
def subscription(project, owner, usdt, rwa_token_sto, kyc_manager):
    """部署认购合约"""
    sub = project.Subscription.deploy(
        usdt.address,
        rwa_token_sto.address,
        kyc_manager.address,
        sender=owner
    )
    
    # 设置铸造和销毁权限
    rwa_token_sto.setMinter(sub.address, True, sender=owner)
    rwa_token_sto.setBurner(sub.address, True, sender=owner)
    
    return sub


# ==================== KYC Manager 测试 ====================

def test_kyc_manager_deployment(kyc_manager, owner):
    """测试KYC管理合约部署"""
    assert kyc_manager.owner() == owner.address
    assert kyc_manager.maxInvestors() == 500  # 默认Reg D限制
    assert kyc_manager.investorCount() == 0


def test_add_investor(kyc_manager, owner, investor1):
    """测试添加KYC认证的投资者"""
    # 添加投资者
    kyc_manager.addInvestor(
        investor1.address,
        "US",
        True,  # 合格投资者
        sender=owner
    )
    
    # 验证
    assert kyc_manager.isVerified(investor1.address)
    assert kyc_manager.isAccredited(investor1.address)
    assert kyc_manager.investorCount() == 1


def test_non_verified_investor_rejected(kyc_manager, non_kyc_user):
    """测试未验证的投资者被拒绝"""
    assert not kyc_manager.isVerified(non_kyc_user.address)
    assert not kyc_manager.isAccredited(non_kyc_user.address)


def test_freeze_investor(kyc_manager, owner, investor1):
    """测试冻结投资者账户"""
    # 先添加投资者
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    assert kyc_manager.isVerified(investor1.address)
    
    # 冻结
    kyc_manager.freezeInvestor(
        investor1.address,
        True,
        "Regulatory investigation",
        sender=owner
    )
    
    # 冻结后无法通过验证
    assert not kyc_manager.isVerified(investor1.address)
    assert kyc_manager.isFrozen(investor1.address)


def test_investor_limit(kyc_manager, owner):
    """测试投资者上限"""
    # 设置较小的上限用于测试
    kyc_manager.setMaxInvestors(3, sender=owner)
    
    # 添加3个投资者
    for i in range(3):
        investor = ape.accounts.test_accounts[i + 1]
        kyc_manager.addInvestor(investor.address, "US", False, sender=owner)
    
    assert kyc_manager.investorCount() == 3
    assert kyc_manager.getRemainingSlots() == 0
    
    # 尝试添加第4个应该失败
    investor4 = ape.accounts.test_accounts[4]
    with ape.reverts("Investor limit reached"):
        kyc_manager.addInvestor(investor4.address, "US", False, sender=owner)


def test_blocked_country(kyc_manager, owner, investor1):
    """测试国家黑名单"""
    # IR（伊朗）默认被阻止
    with ape.reverts("Country blocked"):
        kyc_manager.addInvestor(investor1.address, "IR", False, sender=owner)
    
    # 解除阻止
    kyc_manager.setBlockedCountry("IR", False, sender=owner)
    
    # 现在可以添加
    kyc_manager.addInvestor(investor1.address, "IR", False, sender=owner)
    assert kyc_manager.isVerified(investor1.address)


# ==================== RWA Token STO 测试 ====================

def test_rwa_token_sto_deployment(rwa_token_sto, owner, kyc_manager):
    """测试RWA STO代币部署"""
    assert rwa_token_sto.name() == "RWA Security Token"
    assert rwa_token_sto.symbol() == "RWASTO"
    assert rwa_token_sto.decimals() == 18
    assert rwa_token_sto.owner() == owner.address
    assert rwa_token_sto.kycManager() == kyc_manager.address


def test_transfer_restriction_no_kyc(rwa_token_sto, owner, non_kyc_user, investor1):
    """测试未KYC用户的转账限制"""
    # 发送方未KYC
    code = rwa_token_sto.detectTransferRestriction(
        non_kyc_user.address,
        investor1.address,
        1000
    )
    assert code == 1  # 发送方未通过KYC
    
    message = rwa_token_sto.messageForTransferRestriction(code)
    assert "Sender not KYC verified" in message


def test_transfer_restriction_frozen_account(
    rwa_token_sto,
    kyc_manager,
    owner,
    investor1,
    investor2
):
    """测试冻结账户的转账限制"""
    # 添加两个投资者
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    kyc_manager.addInvestor(investor2.address, "US", False, sender=owner)
    
    # 冻结investor1
    kyc_manager.freezeInvestor(investor1.address, True, "Test", sender=owner)
    
    # 检测转账限制
    code = rwa_token_sto.detectTransferRestriction(
        investor1.address,
        investor2.address,
        1000
    )
    assert code == 3  # 发送方账户冻结


def test_transfer_with_kyc(
    rwa_token_sto,
    kyc_manager,
    subscription,
    usdt,
    owner,
    investor1,
    investor2
):
    """测试KYC认证用户的正常转账"""
    # 添加投资者
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    kyc_manager.addInvestor(investor2.address, "US", False, sender=owner)
    
    # 给investor1铸造代币
    amount = 1000 * 10**18
    rwa_token_sto.setMinter(owner.address, True, sender=owner)
    rwa_token_sto.mint(investor1.address, amount, sender=owner)
    
    # 检查可以转账
    assert rwa_token_sto.canTransfer(investor1.address, investor2.address, amount)
    
    # 执行转账
    rwa_token_sto.transfer(investor2.address, amount, sender=investor1)
    
    # 验证余额
    assert rwa_token_sto.balanceOf(investor1.address) == 0
    assert rwa_token_sto.balanceOf(investor2.address) == amount


def test_force_transfer(rwa_token_sto, kyc_manager, owner, investor1, investor2):
    """测试监管强制转账"""
    # 添加投资者
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    kyc_manager.addInvestor(investor2.address, "US", False, sender=owner)
    
    # 铸造代币
    amount = 1000 * 10**18
    rwa_token_sto.setMinter(owner.address, True, sender=owner)
    rwa_token_sto.mint(investor1.address, amount, sender=owner)
    
    # 转让代理执行强制转账
    rwa_token_sto.forceTransfer(
        investor1.address,
        investor2.address,
        amount,
        "Court Order #12345",
        sender=owner  # owner默认是transfer agent
    )
    
    # 验证余额
    assert rwa_token_sto.balanceOf(investor1.address) == 0
    assert rwa_token_sto.balanceOf(investor2.address) == amount


def test_set_document(rwa_token_sto, owner):
    """测试设置法律文档"""
    doc_hash = b'\x12\x34\x56\x78' + b'\x00' * 28
    
    rwa_token_sto.setDocument(
        "Prospectus",
        "ipfs://QmExample123",
        doc_hash,
        sender=owner
    )
    
    # 查询文档
    uri, hash_value = rwa_token_sto.getDocument("Prospectus")
    assert uri == "ipfs://QmExample123"
    assert hash_value == doc_hash


# ==================== Subscription STO 测试 ====================

def test_subscription_requires_kyc(
    subscription,
    usdt,
    owner,
    non_kyc_user
):
    """测试认购需要KYC验证"""
    # 给用户铸造USDT
    amount = 10_000 * 10**6  # $10,000
    usdt.mint(non_kyc_user.address, amount, sender=owner)
    
    # 批准
    usdt.approve(subscription.address, amount, sender=non_kyc_user)
    
    # 尝试认购（应该失败 - 未KYC）
    lock_period = 90 * 24 * 3600  # 3个月
    with ape.reverts("KYC verification required"):
        subscription.subscribe(amount, lock_period, sender=non_kyc_user)


def test_subscription_with_kyc(
    subscription,
    usdt,
    rwa_token_sto,
    kyc_manager,
    owner,
    investor1
):
    """测试KYC认证用户的正常认购"""
    # 添加KYC
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    
    # 给用户铸造USDT
    amount = 10_000 * 10**6  # $10,000
    usdt.mint(investor1.address, amount, sender=owner)
    
    # 批准
    usdt.approve(subscription.address, amount, sender=investor1)
    
    # 认购
    lock_period = 90 * 24 * 3600  # 3个月
    subscription.subscribe(amount, lock_period, sender=investor1)
    
    # 验证
    assert subscription.subscriptionCount(investor1.address) == 1
    
    # 验证RWA代币余额
    expected_rwa = amount * 10**12  # USDT 6位 -> RWA 18位
    assert rwa_token_sto.balanceOf(investor1.address) == expected_rwa


def test_subscription_min_investment(
    subscription,
    usdt,
    kyc_manager,
    owner,
    investor1
):
    """测试最小投资额限制"""
    # 添加KYC
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    
    # 尝试低于最小投资额
    amount = 500 * 10**6  # $500 < $1,000最低
    usdt.mint(investor1.address, amount, sender=owner)
    usdt.approve(subscription.address, amount, sender=investor1)
    
    lock_period = 30 * 24 * 3600
    with ape.reverts("Below minimum investment"):
        subscription.subscribe(amount, lock_period, sender=investor1)


def test_subscription_accredited_requirement(
    subscription,
    usdt,
    kyc_manager,
    owner,
    investor1,
    investor2
):
    """测试合格投资者要求"""
    # 设置需要合格投资者
    subscription.setRequireAccredited(True, sender=owner)
    
    # 添加非合格投资者
    kyc_manager.addInvestor(investor1.address, "US", False, sender=owner)
    
    # 添加合格投资者
    kyc_manager.addInvestor(investor2.address, "US", True, sender=owner)
    
    amount = 10_000 * 10**6
    lock_period = 90 * 24 * 3600
    
    # 非合格投资者应该被拒绝
    usdt.mint(investor1.address, amount, sender=owner)
    usdt.approve(subscription.address, amount, sender=investor1)
    with ape.reverts("Accredited investor required"):
        subscription.subscribe(amount, lock_period, sender=investor1)
    
    # 合格投资者应该成功
    usdt.mint(investor2.address, amount, sender=owner)
    usdt.approve(subscription.address, amount, sender=investor2)
    subscription.subscribe(amount, lock_period, sender=investor2)
    
    assert subscription.subscriptionCount(investor2.address) == 1


# ==================== 集成测试 ====================

def test_full_sto_flow(
    kyc_manager,
    rwa_token_sto,
    subscription,
    usdt,
    owner,
    investor1
):
    """测试完整的STO流程"""
    # 1. KYC认证
    kyc_manager.addInvestor(investor1.address, "US", True, sender=owner)
    assert kyc_manager.isVerified(investor1.address)
    
    # 2. 认购
    amount = 10_000 * 10**6
    usdt.mint(investor1.address, amount, sender=owner)
    usdt.approve(subscription.address, amount, sender=investor1)
    
    lock_period = 90 * 24 * 3600
    subscription.subscribe(amount, lock_period, sender=investor1)
    
    # 3. 验证代币余额
    rwa_balance = rwa_token_sto.balanceOf(investor1.address)
    assert rwa_balance == amount * 10**12
    
    # 4. 验证认购记录
    sub_info = subscription.getSubscription(investor1.address, 0)
    assert sub_info[0] == amount  # principal
    assert not sub_info[5]  # not redeemed
    
    print("\n✅ 完整STO流程测试通过!")
    print(f"   投资者: {investor1.address}")
    print(f"   投资额: ${amount / 10**6:,.0f}")
    print(f"   RWA代币: {rwa_balance / 10**18:,.0f}")


# ==================== 运行测试 ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

