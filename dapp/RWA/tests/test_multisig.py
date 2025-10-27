"""
测试 MultiSigManager 合约
测试2-of-3多签验证机制
"""
import pytest
from ape import accounts, reverts


@pytest.fixture
def signers():
    """获取签名者账户"""
    return [accounts[0], accounts[1], accounts[2]]


@pytest.fixture
def multisig(project, signers):
    """部署MultiSigManager合约"""
    signer_addresses = [s.address for s in signers]
    return project.MultiSigManager.deploy(signer_addresses, sender=signers[0])


def test_initial_setup(multisig, signers):
    """测试初始配置"""
    assert multisig.owner() == signers[0].address
    assert multisig.signer_count() == 3
    assert multisig.required_signatures() == 2
    assert not multisig.paused()
    
    # 验证所有签名者
    for signer in signers:
        assert multisig.is_signer(signer.address)


def test_create_proposal(multisig, signers, project):
    """测试创建提案"""
    target = project.accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 签名者1创建提案
    proposal_id = multisig.create_proposal(
        target,
        data_hash,
        sender=signers[0]
    )
    
    assert proposal_id == 0
    
    # 验证提案内容
    proposal = multisig.proposals(proposal_id)
    assert proposal[0] == signers[0].address  # proposer
    assert proposal[1] == target  # target
    assert proposal[2] == data_hash  # data_hash
    assert proposal[3] == 1  # signature_count (创建者自动签名)
    assert proposal[4] == 0  # status (PENDING)
    
    # 验证签名记录
    assert multisig.has_signed(proposal_id, signers[0].address)
    assert not multisig.has_signed(proposal_id, signers[1].address)


def test_sign_proposal(multisig, signers):
    """测试签名提案"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 第二个签名者签名
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 验证签名
    assert multisig.has_signed(proposal_id, signers[1].address)
    
    # 验证签名数
    proposal = multisig.proposals(proposal_id)
    assert proposal[3] == 2  # signature_count


def test_proposal_approved(multisig, signers):
    """测试提案批准状态"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建提案（1个签名）
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 未达到阈值
    assert not multisig.is_proposal_approved(proposal_id)
    
    # 第二个签名者签名（达到2-of-3）
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 已批准
    assert multisig.is_proposal_approved(proposal_id)


def test_verify_proposal(multisig, signers):
    """测试验证提案"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建并签名提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 验证通过
    assert multisig.verify_proposal(proposal_id, target, data_hash)
    
    # 错误的target
    assert not multisig.verify_proposal(proposal_id, signers[0].address, data_hash)
    
    # 错误的data_hash
    wrong_hash = b"wrong_hash_1234567890123456789012345678"
    assert not multisig.verify_proposal(proposal_id, target, wrong_hash)


def test_cancel_proposal(multisig, signers):
    """测试取消提案"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 提案人取消
    multisig.cancel_proposal(proposal_id, sender=signers[0])
    
    # 验证状态
    proposal = multisig.proposals(proposal_id)
    assert proposal[4] == 2  # status = CANCELLED


def test_non_signer_cannot_create_proposal(multisig):
    """测试非签名者不能创建提案"""
    non_signer = accounts.test_accounts[5]
    target = accounts.test_accounts[6].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    with reverts("Only signer"):
        multisig.create_proposal(target, data_hash, sender=non_signer)


def test_cannot_sign_twice(multisig, signers):
    """测试不能重复签名"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 尝试再次签名
    with reverts("Already signed"):
        multisig.sign_proposal(proposal_id, sender=signers[0])


def test_pause_and_unpause(multisig, signers):
    """测试暂停和恢复"""
    # 暂停
    multisig.pause(sender=signers[0])
    assert multisig.paused()
    
    # 暂停后不能创建提案
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    with reverts("Contract is paused"):
        multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 恢复
    multisig.unpause(sender=signers[0])
    assert not multisig.paused()
    
    # 恢复后可以创建提案
    multisig.create_proposal(target, data_hash, sender=signers[0])


def test_get_signer_list(multisig, signers):
    """测试获取签名者列表"""
    signer_list = multisig.get_signer_list()
    
    assert len(signer_list) == 3
    for i, signer in enumerate(signers):
        assert signer_list[i] == signer.address


def test_mark_proposal_executed(multisig, signers, project):
    """测试标记提案为已执行"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建并批准提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 只有目标合约可以标记为已执行
    with reverts("Only target can execute"):
        multisig.mark_proposal_executed(proposal_id, sender=signers[0])


def test_three_signers_all_sign(multisig, signers):
    """测试3个签名者全部签名"""
    target = accounts.test_accounts[5].address
    data_hash = b"test_hash_12345678901234567890123456789012"
    
    # 创建提案
    proposal_id = multisig.create_proposal(target, data_hash, sender=signers[0])
    
    # 第二个签名
    multisig.sign_proposal(proposal_id, sender=signers[1])
    
    # 第三个签名
    multisig.sign_proposal(proposal_id, sender=signers[2])
    
    # 验证所有人都签名了
    proposal = multisig.proposals(proposal_id)
    assert proposal[3] == 3  # signature_count = 3
    
    for signer in signers:
        assert multisig.has_signed(proposal_id, signer.address)

