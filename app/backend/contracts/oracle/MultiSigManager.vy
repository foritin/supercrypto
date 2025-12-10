# @version ^0.4.0

"""
@title MultiSigManager - 多签管理合约
@author SuperCrypto Team
@notice 2-of-3多签验证系统，用于预言机数据更新的安全控制
@dev 支持签名者管理、提案投票、执行验证
"""

# ============================================
# 事件定义
# ============================================

event SignerAdded:
    signer: indexed(address)
    added_by: indexed(address)

event SignerRemoved:
    signer: indexed(address)
    removed_by: indexed(address)

event ProposalCreated:
    proposal_id: indexed(uint256)
    proposer: indexed(address)
    target: address
    data_hash: bytes32

event ProposalSigned:
    proposal_id: indexed(uint256)
    signer: indexed(address)
    signature_count: uint256

event ProposalExecuted:
    proposal_id: indexed(uint256)
    executor: indexed(address)

event ProposalCancelled:
    proposal_id: indexed(uint256)
    canceller: indexed(address)

event RequiredSignaturesChanged:
    old_required: uint256
    new_required: uint256

# ============================================
# 数据结构
# ============================================

flag ProposalStatus:
    PENDING      # 待签名
    EXECUTED     # 已执行
    CANCELLED    # 已取消

struct Proposal:
    proposer: address           # 提案人
    target: address             # 目标合约地址
    data_hash: bytes32          # 数据哈希
    signature_count: uint256    # 签名数量
    status: ProposalStatus      # 提案状态
    created_at: uint256         # 创建时间
    executed_at: uint256        # 执行时间

# ============================================
# 状态变量
# ============================================

# 合约所有者
owner: public(address)

# 签名者列表
signers: public(HashMap[address, bool])
signer_list: public(DynArray[address, 20])  # 最多20个签名者
signer_count: public(uint256)

# 所需签名数（2-of-3）
required_signatures: public(uint256)

# 提案
proposals: public(HashMap[uint256, Proposal])
proposal_counter: public(uint256)

# 提案签名记录 proposal_id => signer => has_signed
proposal_signatures: public(HashMap[uint256, HashMap[address, bool]])

# 合约暂停状态
paused: public(bool)

# ============================================
# 构造函数
# ============================================

@deploy
def __init__(initial_signers: DynArray[address, 20]):
    """
    @notice 初始化多签管理合约
    @param initial_signers 初始签名者列表（至少3个）
    """
    assert len(initial_signers) >= 3, "Need at least 3 signers"
    
    self.owner = msg.sender
    self.required_signatures = 2  # 2-of-3
    self.paused = False
    self.proposal_counter = 0
    self.signer_count = 0
    
    # 添加初始签名者
    for signer: address in initial_signers:
        assert signer != empty(address), "Invalid signer"
        assert not self.signers[signer], "Duplicate signer"
        
        self.signers[signer] = True
        self.signer_list.append(signer)
        self.signer_count += 1
        
        log SignerAdded(signer, msg.sender)

# ============================================
# 修饰器辅助函数
# ============================================

@internal
@view
def _only_owner():
    """仅所有者可调用"""
    assert msg.sender == self.owner, "Only owner"

@internal
@view
def _only_signer():
    """仅签名者可调用"""
    assert self.signers[msg.sender], "Only signer"

@internal
@view
def _when_not_paused():
    """仅在未暂停时可调用"""
    assert not self.paused, "Contract is paused"

# ============================================
# 签名者管理
# ============================================

@external
def add_signer(new_signer: address, proposal_id: uint256):
    """
    @notice 添加新签名者（需要现有多签批准）
    @param new_signer 新签名者地址
    @param proposal_id 提案ID（需要预先创建并通过）
    """
    self._only_owner()
    self._when_not_paused()
    
    assert new_signer != empty(address), "Invalid signer"
    assert not self.signers[new_signer], "Already a signer"
    assert len(self.signer_list) < 20, "Max signers reached"
    
    # 验证提案
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Invalid proposal"
    assert proposal.signature_count >= self.required_signatures, "Not enough signatures"
    
    # 添加签名者
    self.signers[new_signer] = True
    self.signer_list.append(new_signer)
    self.signer_count += 1
    
    # 标记提案已执行
    self.proposals[proposal_id].status = ProposalStatus.EXECUTED
    self.proposals[proposal_id].executed_at = block.timestamp
    
    log SignerAdded(new_signer, msg.sender)
    log ProposalExecuted(proposal_id, msg.sender)

@external
def remove_signer(signer: address, proposal_id: uint256):
    """
    @notice 移除签名者（需要多签批准）
    @param signer 要移除的签名者地址
    @param proposal_id 提案ID
    """
    self._only_owner()
    self._when_not_paused()
    
    assert self.signers[signer], "Not a signer"
    assert self.signer_count > 3, "Cannot remove, min 3 signers required"
    
    # 验证提案
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Invalid proposal"
    assert proposal.signature_count >= self.required_signatures, "Not enough signatures"
    
    # 移除签名者
    self.signers[signer] = False
    self.signer_count -= 1
    
    # 从列表中移除（通过重建列表）
    new_list: DynArray[address, 20] = []
    for s: address in self.signer_list:
        if s != signer:
            new_list.append(s)
    self.signer_list = new_list
    
    # 标记提案已执行
    self.proposals[proposal_id].status = ProposalStatus.EXECUTED
    self.proposals[proposal_id].executed_at = block.timestamp
    
    log SignerRemoved(signer, msg.sender)
    log ProposalExecuted(proposal_id, msg.sender)

# ============================================
# 提案管理
# ============================================

@external
def create_proposal(target: address, data_hash: bytes32) -> uint256:
    """
    @notice 创建新提案
    @param target 目标合约地址
    @param data_hash 数据哈希（用于验证数据一致性）
    @return proposal_id 提案ID
    """
    self._only_signer()
    self._when_not_paused()
    
    assert target != empty(address), "Invalid target"
    
    # 创建提案
    proposal_id: uint256 = self.proposal_counter
    self.proposals[proposal_id] = Proposal(
        proposer=msg.sender,
        target=target,
        data_hash=data_hash,
        signature_count=1,  # 创建者自动签名
        status=ProposalStatus.PENDING,
        created_at=block.timestamp,
        executed_at=0
    )
    
    # 记录创建者签名
    self.proposal_signatures[proposal_id][msg.sender] = True
    
    self.proposal_counter += 1
    
    log ProposalCreated(proposal_id, msg.sender, target, data_hash)
    log ProposalSigned(proposal_id, msg.sender, 1)
    
    return proposal_id

@external
def sign_proposal(proposal_id: uint256):
    """
    @notice 签名提案
    @param proposal_id 提案ID
    """
    self._only_signer()
    self._when_not_paused()
    
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Proposal not pending"
    assert not self.proposal_signatures[proposal_id][msg.sender], "Already signed"
    
    # 记录签名
    self.proposal_signatures[proposal_id][msg.sender] = True
    self.proposals[proposal_id].signature_count += 1
    
    log ProposalSigned(proposal_id, msg.sender, self.proposals[proposal_id].signature_count)

@external
def cancel_proposal(proposal_id: uint256):
    """
    @notice 取消提案（仅提案人或所有者）
    @param proposal_id 提案ID
    """
    self._when_not_paused()
    
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Proposal not pending"
    assert msg.sender == proposal.proposer or msg.sender == self.owner, "Not authorized"
    
    self.proposals[proposal_id].status = ProposalStatus.CANCELLED
    
    log ProposalCancelled(proposal_id, msg.sender)

# ============================================
# 验证函数
# ============================================

@external
@view
def verify_proposal(proposal_id: uint256, target: address, data_hash: bytes32) -> bool:
    """
    @notice 验证提案是否通过且数据一致
    @param proposal_id 提案ID
    @param target 目标地址
    @param data_hash 数据哈希
    @return 是否通过验证
    """
    proposal: Proposal = self.proposals[proposal_id]
    
    if proposal.status != ProposalStatus.PENDING:
        return False
    
    if proposal.target != target:
        return False
    
    if proposal.data_hash != data_hash:
        return False
    
    if proposal.signature_count < self.required_signatures:
        return False
    
    return True

@external
@view
def is_proposal_approved(proposal_id: uint256) -> bool:
    """
    @notice 检查提案是否已获得足够签名
    @param proposal_id 提案ID
    @return 是否已批准
    """
    proposal: Proposal = self.proposals[proposal_id]
    return (
        proposal.status == ProposalStatus.PENDING and 
        proposal.signature_count >= self.required_signatures
    )

@external
@view
def has_signed(proposal_id: uint256, signer: address) -> bool:
    """
    @notice 检查地址是否已签名
    @param proposal_id 提案ID
    @param signer 签名者地址
    @return 是否已签名
    """
    return self.proposal_signatures[proposal_id][signer]

@external
@view
def is_signer(addr: address) -> bool:
    """
    @notice 检查地址是否为签名者
    @param addr 地址
    @return 是否为签名者
    """
    return self.signers[addr]

@external
@view
def get_signer_list() -> DynArray[address, 20]:
    """
    @notice 获取所有签名者列表
    @return 签名者地址数组
    """
    return self.signer_list

# ============================================
# 管理函数
# ============================================

@external
def mark_proposal_executed(proposal_id: uint256):
    """
    @notice 标记提案为已执行（由目标合约调用）
    @param proposal_id 提案ID
    """
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Not pending"
    assert msg.sender == proposal.target, "Only target can execute"
    
    self.proposals[proposal_id].status = ProposalStatus.EXECUTED
    self.proposals[proposal_id].executed_at = block.timestamp
    
    log ProposalExecuted(proposal_id, msg.sender)

@external
def set_required_signatures(new_required: uint256, proposal_id: uint256):
    """
    @notice 修改所需签名数（需要多签批准）
    @param new_required 新的所需签名数
    @param proposal_id 提案ID
    """
    self._only_owner()
    
    assert new_required >= 2, "Min 2 signatures required"
    assert new_required <= self.signer_count, "Required exceeds signer count"
    
    # 验证提案
    proposal: Proposal = self.proposals[proposal_id]
    assert proposal.status == ProposalStatus.PENDING, "Invalid proposal"
    assert proposal.signature_count >= self.required_signatures, "Not enough signatures"
    
    old_required: uint256 = self.required_signatures
    self.required_signatures = new_required
    
    # 标记提案已执行
    self.proposals[proposal_id].status = ProposalStatus.EXECUTED
    self.proposals[proposal_id].executed_at = block.timestamp
    
    log RequiredSignaturesChanged(old_required, new_required)
    log ProposalExecuted(proposal_id, msg.sender)

@external
def pause():
    """
    @notice 暂停合约（仅所有者）
    """
    self._only_owner()
    self.paused = True

@external
def unpause():
    """
    @notice 恢复合约（仅所有者）
    """
    self._only_owner()
    self.paused = False

@external
def transfer_ownership(new_owner: address):
    """
    @notice 转移所有权
    @param new_owner 新所有者地址
    """
    self._only_owner()
    assert new_owner != empty(address), "Invalid owner"
    self.owner = new_owner

