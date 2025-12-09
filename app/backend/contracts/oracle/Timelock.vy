# @version ^0.4.0

"""
@title Timelock - 时间锁合约
@author SuperCrypto Team
@notice 24小时延迟保护机制，防止预言机数据被快速恶意更新
@dev 支持紧急快速通道（需3-of-3签名）、队列管理、取消机制
"""

# ============================================
# 接口定义
# ============================================

interface IMultiSigManager:
    def verify_proposal(proposal_id: uint256, target: address, data_hash: bytes32) -> bool: view
    def is_proposal_approved(proposal_id: uint256) -> bool: view
    def mark_proposal_executed(proposal_id: uint256): nonpayable
    def signer_count() -> uint256: view
    def has_signed(proposal_id: uint256, signer: address) -> bool: view
    def get_signer_list() -> DynArray[address, 20]: view

# ============================================
# 事件定义
# ============================================

event OperationQueued:
    operation_id: indexed(bytes32)
    target: indexed(address)
    data_hash: bytes32
    execute_time: uint256

event OperationExecuted:
    operation_id: indexed(bytes32)
    executor: indexed(address)

event OperationCancelled:
    operation_id: indexed(bytes32)
    canceller: indexed(address)

event EmergencyExecuted:
    operation_id: indexed(bytes32)
    executor: indexed(address)

event DelayChanged:
    old_delay: uint256
    new_delay: uint256

# ============================================
# 数据结构
# ============================================

enum OperationStatus:
    NONE         # 不存在
    QUEUED       # 已排队
    EXECUTED     # 已执行
    CANCELLED    # 已取消

struct Operation:
    target: address             # 目标合约
    data_hash: bytes32          # 数据哈希
    proposal_id: uint256        # 多签提案ID
    queued_at: uint256         # 排队时间
    execute_time: uint256      # 可执行时间
    status: OperationStatus    # 状态

# ============================================
# 状态变量
# ============================================

# 合约所有者
owner: public(address)

# 多签管理合约
multi_sig_manager: public(IMultiSigManager)

# 延迟时间（24小时 = 86400秒）
delay: public(uint256)

# 操作队列 operation_id => Operation
operations: public(HashMap[bytes32, Operation])

# 紧急操作签名记录 operation_id => signer => has_signed
emergency_signatures: public(HashMap[bytes32, HashMap[address, bool]])

# 紧急操作签名计数 operation_id => count
emergency_signature_count: public(HashMap[bytes32, uint256])

# 合约暂停状态
paused: public(bool)

# ============================================
# 常量
# ============================================

# 24小时（秒）
MIN_DELAY: constant(uint256) = 86400
# 7天（秒）
MAX_DELAY: constant(uint256) = 604800

# ============================================
# 构造函数
# ============================================

@deploy
def __init__(multi_sig_manager_addr: address):
    """
    @notice 初始化时间锁合约
    @param multi_sig_manager_addr 多签管理合约地址
    """
    assert multi_sig_manager_addr != empty(address), "Invalid multisig"
    
    self.owner = msg.sender
    self.multi_sig_manager = IMultiSigManager(multi_sig_manager_addr)
    self.delay = MIN_DELAY  # 默认24小时
    self.paused = False

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
def _when_not_paused():
    """仅在未暂停时可调用"""
    assert not self.paused, "Contract is paused"

# ============================================
# 核心功能
# ============================================

@external
def queue_operation(
    target: address,
    data_hash: bytes32,
    proposal_id: uint256
) -> bytes32:
    """
    @notice 将操作加入队列（需要多签批准的提案）
    @param target 目标合约地址
    @param data_hash 数据哈希
    @param proposal_id 多签提案ID
    @return operation_id 操作ID
    """
    self._when_not_paused()
    
    # 验证提案已获批准
    assert self.multi_sig_manager.is_proposal_approved(proposal_id), "Proposal not approved"
    assert self.multi_sig_manager.verify_proposal(proposal_id, target, data_hash), "Invalid proposal"
    
    # 生成操作ID
    operation_id: bytes32 = keccak256(
        concat(
            convert(target, bytes32),
            data_hash,
            convert(proposal_id, bytes32),
            convert(block.timestamp, bytes32)
        )
    )
    
    # 确保不重复
    assert self.operations[operation_id].status == OperationStatus.NONE, "Operation exists"
    
    # 计算执行时间
    execute_time: uint256 = block.timestamp + self.delay
    
    # 加入队列
    self.operations[operation_id] = Operation(
        target=target,
        data_hash=data_hash,
        proposal_id=proposal_id,
        queued_at=block.timestamp,
        execute_time=execute_time,
        status=OperationStatus.QUEUED
    )
    
    log OperationQueued(operation_id, target, data_hash, execute_time)
    
    return operation_id

@external
def execute_operation(operation_id: bytes32):
    """
    @notice 执行已到期的操作
    @param operation_id 操作ID
    """
    self._when_not_paused()
    
    operation: Operation = self.operations[operation_id]
    assert operation.status == OperationStatus.QUEUED, "Not queued"
    assert block.timestamp >= operation.execute_time, "Too early"
    
    # 再次验证多签提案（防止提案被取消）
    assert self.multi_sig_manager.verify_proposal(
        operation.proposal_id,
        operation.target,
        operation.data_hash
    ), "Proposal no longer valid"
    
    # 标记为已执行
    self.operations[operation_id].status = OperationStatus.EXECUTED
    
    # 通知多签管理器
    self.multi_sig_manager.mark_proposal_executed(operation.proposal_id)
    
    log OperationExecuted(operation_id, msg.sender)

@external
def cancel_operation(operation_id: bytes32, proposal_id: uint256):
    """
    @notice 取消排队的操作（需要新的多签批准）
    @param operation_id 要取消的操作ID
    @param proposal_id 取消提案的ID
    """
    self._when_not_paused()
    
    operation: Operation = self.operations[operation_id]
    assert operation.status == OperationStatus.QUEUED, "Not queued"
    
    # 验证取消提案
    cancel_data_hash: bytes32 = keccak256(
        concat(
            convert(operation_id, bytes32),
            convert(convert("CANCEL", bytes32), bytes32)
        )
    )
    
    assert self.multi_sig_manager.is_proposal_approved(proposal_id), "Cancel not approved"
    assert self.multi_sig_manager.verify_proposal(
        proposal_id,
        self,
        cancel_data_hash
    ), "Invalid cancel proposal"
    
    # 取消操作
    self.operations[operation_id].status = OperationStatus.CANCELLED
    
    log OperationCancelled(operation_id, msg.sender)

# ============================================
# 紧急快速通道（3-of-3签名）
# ============================================

@external
def emergency_sign(operation_id: bytes32):
    """
    @notice 为紧急操作签名（需要所有签名者同意）
    @param operation_id 操作ID
    """
    self._when_not_paused()
    
    operation: Operation = self.operations[operation_id]
    assert operation.status == OperationStatus.QUEUED, "Not queued"
    
    # 检查是否为签名者（通过多签管理器）
    signers: DynArray[address, 20] = self.multi_sig_manager.get_signer_list()
    is_signer: bool = False
    for signer: address in signers:
        if signer == msg.sender:
            is_signer = True
            break
    assert is_signer, "Not a signer"
    
    # 检查是否已签名
    assert not self.emergency_signatures[operation_id][msg.sender], "Already signed"
    
    # 记录签名
    self.emergency_signatures[operation_id][msg.sender] = True
    self.emergency_signature_count[operation_id] += 1

@external
def emergency_execute(operation_id: bytes32):
    """
    @notice 紧急执行（需要所有签名者签名）
    @param operation_id 操作ID
    """
    self._when_not_paused()
    
    operation: Operation = self.operations[operation_id]
    assert operation.status == OperationStatus.QUEUED, "Not queued"
    
    # 检查是否所有签名者都已签名
    signer_count: uint256 = self.multi_sig_manager.signer_count()
    assert self.emergency_signature_count[operation_id] == signer_count, "Need all signatures"
    
    # 验证所有签名者确实都签了
    signers: DynArray[address, 20] = self.multi_sig_manager.get_signer_list()
    for signer: address in signers:
        assert self.emergency_signatures[operation_id][signer], "Missing signature"
    
    # 标记为已执行
    self.operations[operation_id].status = OperationStatus.EXECUTED
    
    # 通知多签管理器
    self.multi_sig_manager.mark_proposal_executed(operation.proposal_id)
    
    log EmergencyExecuted(operation_id, msg.sender)

# ============================================
# 查询函数
# ============================================

@external
@view
def is_operation_ready(operation_id: bytes32) -> bool:
    """
    @notice 检查操作是否可执行
    @param operation_id 操作ID
    @return 是否可执行
    """
    operation: Operation = self.operations[operation_id]
    
    if operation.status != OperationStatus.QUEUED:
        return False
    
    if block.timestamp < operation.execute_time:
        return False
    
    return True

@external
@view
def get_operation(operation_id: bytes32) -> Operation:
    """
    @notice 获取操作详情
    @param operation_id 操作ID
    @return 操作信息
    """
    return self.operations[operation_id]

@external
@view
def time_until_ready(operation_id: bytes32) -> uint256:
    """
    @notice 获取操作距离可执行还有多久
    @param operation_id 操作ID
    @return 剩余秒数（0表示已可执行）
    """
    operation: Operation = self.operations[operation_id]
    
    if operation.status != OperationStatus.QUEUED:
        return 0
    
    if block.timestamp >= operation.execute_time:
        return 0
    
    return operation.execute_time - block.timestamp

@external
@view
def get_emergency_signature_count(operation_id: bytes32) -> uint256:
    """
    @notice 获取紧急操作的签名数
    @param operation_id 操作ID
    @return 签名数
    """
    return self.emergency_signature_count[operation_id]

@external
@view
def has_emergency_signed(operation_id: bytes32, signer: address) -> bool:
    """
    @notice 检查是否已为紧急操作签名
    @param operation_id 操作ID
    @param signer 签名者地址
    @return 是否已签名
    """
    return self.emergency_signatures[operation_id][signer]

# ============================================
# 管理函数
# ============================================

@external
def set_delay(new_delay: uint256, proposal_id: uint256):
    """
    @notice 设置新的延迟时间（需要多签批准）
    @param new_delay 新延迟时间（秒）
    @param proposal_id 多签提案ID
    """
    self._only_owner()
    
    assert new_delay >= MIN_DELAY, "Delay too short"
    assert new_delay <= MAX_DELAY, "Delay too long"
    
    # 验证提案
    delay_data_hash: bytes32 = keccak256(
        concat(
            convert(new_delay, bytes32),
            convert(convert("SET_DELAY", bytes32), bytes32)
        )
    )
    
    assert self.multi_sig_manager.is_proposal_approved(proposal_id), "Not approved"
    assert self.multi_sig_manager.verify_proposal(
        proposal_id,
        self,
        delay_data_hash
    ), "Invalid proposal"
    
    old_delay: uint256 = self.delay
    self.delay = new_delay
    
    log DelayChanged(old_delay, new_delay)

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

