# @version ^0.4.0
"""
@title RWA Security Token (STO)
@notice 符合ERC1404标准的证券型代币 - 真实世界资产代币化
@dev 基于固定资产的权益代币，价格固定为1 USD，符合证券法合规要求
"""

# 接口定义
interface IKYCManager:
    def isVerified(_investor: address) -> bool: view
    def isFrozen(_investor: address) -> bool: view
    def investorCount() -> uint256: view
    def maxInvestors() -> uint256: view

# ERC20 事件
event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256

event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256

# 访问控制事件
event MinterSet:
    minter: indexed(address)
    enabled: bool

event BurnerSet:
    burner: indexed(address)
    enabled: bool

# STO 特定事件
event KYCManagerUpdated:
    oldManager: indexed(address)
    newManager: indexed(address)

event TransferAgentUpdated:
    oldAgent: indexed(address)
    newAgent: indexed(address)

event ForcedTransfer:
    from_addr: indexed(address)
    to_addr: indexed(address)
    amount: uint256
    reason: String[100]

event DocumentUpdated:
    name: String[32]
    uri: String[256]
    documentHash: bytes32

# ERC1404 事件
event TransferRestriction:
    from_addr: indexed(address)
    to_addr: indexed(address)
    value: uint256
    restrictionCode: uint8

# ERC20 状态变量
name: public(String[32])
symbol: public(String[8])
decimals: public(uint8)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

# 访问控制
owner: public(address)
minters: public(HashMap[address, bool])
burners: public(HashMap[address, bool])

# STO 特定变量
kycManager: public(address)         # KYC管理合约地址
transferAgent: public(address)      # 转让代理（监管角色）
issuanceFinished: public(bool)      # 是否完成发行

# 文档管理（关联法律文件）
documents: public(HashMap[String[32], String[256]])  # 文档名 => URI
documentHashes: public(HashMap[String[32], bytes32]) # 文档名 => 哈希

# 转账限制代码（ERC1404标准）
# 0 = 允许
# 1 = 发送方未通过KYC
# 2 = 接收方未通过KYC
# 3 = 发送方账户冻结
# 4 = 接收方账户冻结
# 5 = 超过投资者上限
# 6 = 转账金额为零
# 7 = 余额不足
# 8 = 发行已完成，禁止铸造


@deploy
def __init__(_kycManager: address):
    """
    @notice 初始化RWA Security Token
    @param _kycManager KYC管理合约地址
    """
    self.name = "RWA Security Token"
    self.symbol = "RWASTO"
    self.decimals = 18
    self.totalSupply = 0
    self.owner = msg.sender
    self.transferAgent = msg.sender
    self.kycManager = _kycManager
    self.issuanceFinished = False


# ==================== 管理功能 ====================

@external
def setMinter(_minter: address, _enabled: bool):
    """
    @notice 设置铸造权限
    @param _minter 铸造者地址
    @param _enabled 是否启用
    """
    assert msg.sender == self.owner, "Only owner"
    self.minters[_minter] = _enabled
    log MinterSet(_minter, _enabled)


@external
def setBurner(_burner: address, _enabled: bool):
    """
    @notice 设置销毁权限
    @param _burner 销毁者地址
    @param _enabled 是否启用
    """
    assert msg.sender == self.owner, "Only owner"
    self.burners[_burner] = _enabled
    log BurnerSet(_burner, _enabled)


@external
def setKYCManager(_newManager: address):
    """
    @notice 更新KYC管理合约地址
    @param _newManager 新KYC管理合约地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newManager != empty(address), "Invalid address"
    
    oldManager: address = self.kycManager
    self.kycManager = _newManager
    
    log KYCManagerUpdated(oldManager, _newManager)


@external
def setTransferAgent(_newAgent: address):
    """
    @notice 设置转让代理
    @param _newAgent 新转让代理地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newAgent != empty(address), "Invalid address"
    
    oldAgent: address = self.transferAgent
    self.transferAgent = _newAgent
    
    log TransferAgentUpdated(oldAgent, _newAgent)


@external
def finishIssuance():
    """
    @notice 完成代币发行（之后禁止铸造）
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.issuanceFinished, "Already finished"
    self.issuanceFinished = True


@external
def setDocument(_name: String[32], _uri: String[256], _documentHash: bytes32):
    """
    @notice 设置法律文档（招股书、年报等）
    @param _name 文档名称
    @param _uri 文档URI（IPFS/HTTP）
    @param _documentHash 文档哈希（SHA256）
    """
    assert msg.sender == self.owner, "Only owner"
    
    self.documents[_name] = _uri
    self.documentHashes[_name] = _documentHash
    
    log DocumentUpdated(_name, _uri, _documentHash)


# ==================== ERC1404 合规检查 ====================

@view
@internal
def _detectTransferRestriction(
    _from: address,
    _to: address,
    _value: uint256
) -> uint8:
    """
    @notice 内部函数：检测转账限制（ERC1404核心功能）
    @param _from 发送方地址
    @param _to 接收方地址
    @param _value 转账金额
    @return 限制代码（0=允许，其他=限制原因）
    """
    # 0. 铸造（from = zero address）- 只检查接收方
    if _from == empty(address):
        if not staticcall IKYCManager(self.kycManager).isVerified(_to):
            return 2  # 接收方未通过KYC
        if staticcall IKYCManager(self.kycManager).isFrozen(_to):
            return 4  # 接收方账户冻结
        return 0
    
    # 1. 销毁（to = zero address）- 只检查发送方
    if _to == empty(address):
        if not staticcall IKYCManager(self.kycManager).isVerified(_from):
            return 1  # 发送方未通过KYC
        if staticcall IKYCManager(self.kycManager).isFrozen(_from):
            return 3  # 发送方账户冻结
        if self.balanceOf[_from] < _value:
            return 7  # 余额不足
        return 0
    
    # 2. 检查金额
    if _value == 0:
        return 6  # 转账金额为零
    
    # 3. 检查发送方KYC
    if not staticcall IKYCManager(self.kycManager).isVerified(_from):
        return 1  # 发送方未通过KYC
    
    # 4. 检查接收方KYC
    if not staticcall IKYCManager(self.kycManager).isVerified(_to):
        return 2  # 接收方未通过KYC
    
    # 5. 检查发送方是否冻结
    if staticcall IKYCManager(self.kycManager).isFrozen(_from):
        return 3  # 发送方账户冻结
    
    # 6. 检查接收方是否冻结
    if staticcall IKYCManager(self.kycManager).isFrozen(_to):
        return 4  # 接收方账户冻结
    
    # 7. 检查余额
    if self.balanceOf[_from] < _value:
        return 7  # 余额不足
    
    # 8. 检查投资者上限（仅当接收方首次接收时）
    if self.balanceOf[_to] == 0:
        investorCount: uint256 = staticcall IKYCManager(self.kycManager).investorCount()
        maxInvestors: uint256 = staticcall IKYCManager(self.kycManager).maxInvestors()
        if investorCount >= maxInvestors:
            return 5  # 超过投资者上限
    
    # 允许转账
    return 0


@view
@external
def detectTransferRestriction(
    _from: address,
    _to: address,
    _value: uint256
) -> uint8:
    """
    @notice 检测转账限制（ERC1404核心功能）
    @param _from 发送方地址
    @param _to 接收方地址
    @param _value 转账金额
    @return 限制代码（0=允许，其他=限制原因）
    """
    return self._detectTransferRestriction(_from, _to, _value)


@view
@external
def messageForTransferRestriction(_restrictionCode: uint8) -> String[100]:
    """
    @notice 获取限制代码的说明信息
    @param _restrictionCode 限制代码
    @return 说明信息
    """
    if _restrictionCode == 0:
        return "Transfer allowed"
    elif _restrictionCode == 1:
        return "Sender not KYC verified"
    elif _restrictionCode == 2:
        return "Recipient not KYC verified"
    elif _restrictionCode == 3:
        return "Sender account frozen"
    elif _restrictionCode == 4:
        return "Recipient account frozen"
    elif _restrictionCode == 5:
        return "Investor limit reached"
    elif _restrictionCode == 6:
        return "Transfer amount is zero"
    elif _restrictionCode == 7:
        return "Insufficient balance"
    elif _restrictionCode == 8:
        return "Issuance finished, minting disabled"
    else:
        return "Unknown restriction"


# ==================== 内部转账检查 ====================

@internal
def _checkTransferRestriction(_from: address, _to: address, _value: uint256):
    """
    @notice 内部转账限制检查
    @param _from 发送方
    @param _to 接收方
    @param _value 金额
    """
    restrictionCode: uint8 = self._detectTransferRestriction(_from, _to, _value)
    assert restrictionCode == 0, "Transfer restricted"
    
    if restrictionCode != 0:
        log TransferRestriction(_from, _to, _value, restrictionCode)


# ==================== ERC20 核心功能（带合规检查）====================

@external
def mint(_to: address, _amount: uint256):
    """
    @notice 铸造代币（仅授权合约）
    @param _to 接收地址
    @param _amount 铸造数量
    """
    assert self.minters[msg.sender], "Not authorized minter"
    assert not self.issuanceFinished, "Issuance finished"
    
    # STO合规检查
    self._checkTransferRestriction(empty(address), _to, _amount)
    
    self.totalSupply += _amount
    self.balanceOf[_to] += _amount
    
    log Transfer(empty(address), _to, _amount)


@external
def burn(_from: address, _amount: uint256):
    """
    @notice 销毁代币（仅授权合约）
    @param _from 销毁地址
    @param _amount 销毁数量
    """
    assert self.burners[msg.sender], "Not authorized burner"
    
    # STO合规检查
    self._checkTransferRestriction(_from, empty(address), _amount)
    
    assert self.balanceOf[_from] >= _amount, "Insufficient balance"
    
    self.balanceOf[_from] -= _amount
    self.totalSupply -= _amount
    
    log Transfer(_from, empty(address), _amount)


@external
def transfer(_to: address, _amount: uint256) -> bool:
    """
    @notice 转账（带STO合规检查）
    @param _to 接收地址
    @param _amount 转账数量
    @return 是否成功
    """
    # STO合规检查
    self._checkTransferRestriction(msg.sender, _to, _amount)
    
    assert self.balanceOf[msg.sender] >= _amount, "Insufficient balance"
    
    self.balanceOf[msg.sender] -= _amount
    self.balanceOf[_to] += _amount
    
    log Transfer(msg.sender, _to, _amount)
    return True


@external
def approve(_spender: address, _amount: uint256) -> bool:
    """
    @notice 授权
    @param _spender 被授权地址
    @param _amount 授权数量
    @return 是否成功
    """
    self.allowance[msg.sender][_spender] = _amount
    log Approval(msg.sender, _spender, _amount)
    return True


@external
def transferFrom(_from: address, _to: address, _amount: uint256) -> bool:
    """
    @notice 从授权地址转账（带STO合规检查）
    @param _from 发送地址
    @param _to 接收地址
    @param _amount 转账数量
    @return 是否成功
    """
    # STO合规检查
    self._checkTransferRestriction(_from, _to, _amount)
    
    assert self.balanceOf[_from] >= _amount, "Insufficient balance"
    assert self.allowance[_from][msg.sender] >= _amount, "Insufficient allowance"
    
    self.balanceOf[_from] -= _amount
    self.balanceOf[_to] += _amount
    self.allowance[_from][msg.sender] -= _amount
    
    log Transfer(_from, _to, _amount)
    return True


# ==================== 监管功能 ====================

@external
def forceTransfer(
    _from: address,
    _to: address,
    _amount: uint256,
    _reason: String[100]
):
    """
    @notice 强制转账（监管机构/转让代理专用）
    @param _from 发送方
    @param _to 接收方
    @param _amount 金额
    @param _reason 原因
    @dev 用于法院命令、监管没收等场景
    """
    assert msg.sender == self.transferAgent, "Only transfer agent"
    assert self.balanceOf[_from] >= _amount, "Insufficient balance"
    
    self.balanceOf[_from] -= _amount
    self.balanceOf[_to] += _amount
    
    log Transfer(_from, _to, _amount)
    log ForcedTransfer(_from, _to, _amount, _reason)


@external
def forceBurn(_from: address, _amount: uint256, _reason: String[100]):
    """
    @notice 强制销毁（监管机构专用）
    @param _from 地址
    @param _amount 金额
    @param _reason 原因
    """
    assert msg.sender == self.transferAgent, "Only transfer agent"
    assert self.balanceOf[_from] >= _amount, "Insufficient balance"
    
    self.balanceOf[_from] -= _amount
    self.totalSupply -= _amount
    
    log Transfer(_from, empty(address), _amount)
    log ForcedTransfer(_from, empty(address), _amount, _reason)


# ==================== 查询功能 ====================

@view
@external
def getDocument(_name: String[32]) -> (String[256], bytes32):
    """
    @notice 获取文档信息
    @param _name 文档名称
    @return (URI, 哈希)
    """
    return (self.documents[_name], self.documentHashes[_name])


@view
@external
def canTransfer(_from: address, _to: address, _value: uint256) -> bool:
    """
    @notice 检查是否可以转账
    @param _from 发送方
    @param _to 接收方
    @param _value 金额
    @return 是否可以转账
    """
    return self._detectTransferRestriction(_from, _to, _value) == 0


# ==================== 所有权管理 ====================

@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner

