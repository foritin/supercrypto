# @version ^0.4.0
"""
@title RWA Security Token (STO)
@notice 符合ERC1404标准的证券型代币 - 真实世界资产代币化
@dev 基于固定资产的权益代币，价格固定为1 USD，符合证券法合规要求
     使用 AddressProvider 模式获取依赖地址
"""

# 接口定义
interface IKYCManager:
    def isVerified(_investor: address) -> bool: view
    def isFrozen(_investor: address) -> bool: view
    def investorCount() -> uint256: view
    def maxInvestors() -> uint256: view

interface IAddressProvider:
    def get_kyc_manager() -> address: view

# 合约迁移接口
interface IMigration:
    def owner() -> address: view
    def name() -> String[32]: view
    def symbol() -> String[8]: view
    def decimals() -> uint8: view
    def totalSupply() -> uint256: view
    def ADDRESS_PROVIDER() -> address: view  # 纯 Provider 模式
    def transfer_agent() -> address: view
    def issuance_finished() -> bool: view
    def get_minter_list() -> DynArray[address, 100]: view
    def get_burner_list() -> DynArray[address, 100]: view
    def get_document_list() -> DynArray[String[32], 50]: view
    def get_document(name: String[32]) -> (String[256], bytes32): view
    def get_account_list() -> DynArray[address, 5000]: view
    def get_allowance_list() -> DynArray[address, 10000]: view
    def get_balance_of(_account: address) -> uint256: view
    def get_allowance(_owner: address, _spender: address) -> uint256: view
    def receive_migration(oldContract: address): nonpayable
    def is_migrated() -> bool: view

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

event OracleUpdated:
    oldOracle: indexed(address)
    newOracle: indexed(address)

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

# AddressProvider (immutable) - 纯 Provider 模式
ADDRESS_PROVIDER: public(immutable(address))

# STO 特定变量
transfer_agent: public(address)      # 转让代理（监管角色）
issuance_finished: public(bool)      # 是否完成发行
oracle: public(address)              # 可选：CapitalOracle合约地址（用于价格获取）

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


# ==================== 合约迁移功能 ====================

# 迁移状态
migrated: public(bool)

# 为迁移添加的账户列表（追踪所有有余额或授权的账户）
accountList: public(DynArray[address, 5000])

# 为迁移添加的授权对列表（追踪所有有授权的账户对）
# 结构: [owner1, spender1, owner2, spender2, ...]
allowanceList: public(DynArray[address, 10000])

# 迁移事件
event Migrated:
    oldContract: indexed(address)
    newContract: indexed(address)
    timestamp: uint256


# ==================== 内部辅助函数 ====================

@internal
def _trackAccount(_account: address):
    """
    @notice 内部：将账户添加到追踪列表（如果尚未存在）
    @param _account 账户地址
    @dev 用于迁移时追踪所有活跃账户
    """
    # 检查账户是否已在列表中
    for account: address in self.accountList:
        if account == _account:
            return

    # 如果余额非零或有授权记录，添加到列表
    if self.balanceOf[_account] > 0:
        self.accountList.append(_account)


@internal
def _trackAllowance(_owner: address, _spender: address):
    """
    @notice 内部：追踪授权对（用于迁移）
    @param _owner 所有者地址
    @param _spender 授权者地址
    @dev 用于迁移时追踪所有活跃授权
    """
    # 检查授权对是否已在列表中
    found: bool = False
    idx: uint256 = 0
    for account: address in self.allowanceList:
        if idx % 2 == 0 and idx + 1 < len(self.allowanceList):
            # 这是一个owner位置，检查下一个是否是spender
            if account == _owner and self.allowanceList[idx + 1] == _spender:
                found = True
                break
        idx += 1

    # 如果未找到，添加新的授权对
    if not found:
        self.allowanceList.append(_owner)
        self.allowanceList.append(_spender)


@deploy
def __init__(_address_provider: address):
    """
    @notice 初始化RWA Security Token (纯 Provider 模式)
    @param _address_provider AddressProvider 合约地址
    """
    ADDRESS_PROVIDER = _address_provider
    self.name = "RWA Security Token"
    self.symbol = "RWASTO"
    self.decimals = 18
    self.totalSupply = 0
    self.owner = msg.sender
    self.transfer_agent = msg.sender
    self.issuance_finished = False


# ==================== Provider 查询 ====================

@view
@internal
def _get_kyc_manager() -> address:
    """
    @notice 从 AddressProvider 获取 KYC 管理合约地址
    @return KYC 管理合约地址
    """
    return staticcall IAddressProvider(ADDRESS_PROVIDER).get_kyc_manager()


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

    # 维护迁移列表
    if _enabled:
        # 检查是否已在列表中
        found: bool = False
        for minter: address in self.minterList:
            if minter == _minter:
                found = True
                break
        if not found:
            self.minterList.append(_minter)


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

    # 维护迁移列表
    if _enabled:
        # 检查是否已在列表中
        found: bool = False
        for burner: address in self.burnerList:
            if burner == _burner:
                found = True
                break
        if not found:
            self.burnerList.append(_burner)


# 注意: set_kyc_manager 已移除 - 纯 Provider 模式下通过 AddressProvider 管理


@external
def set_transfer_agent(_new_agent: address):
    """
    @notice 设置转让代理
    @param _new_agent 新转让代理地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_agent != empty(address), "Invalid address"

    old_agent: address = self.transfer_agent
    self.transfer_agent = _new_agent

    log TransferAgentUpdated(old_agent, _new_agent)


@external
def set_oracle(_oracle: address):
    """
    @notice 设置CapitalOracle合约（可选）
    @param _oracle CapitalOracle合约地址（可为零地址）
    """
    assert msg.sender == self.owner, "Only owner"

    old_oracle: address = self.oracle
    self.oracle = _oracle

    log OracleUpdated(old_oracle, _oracle)


@external
def finish_issuance():
    """
    @notice 完成代币发行（之后禁止铸造）
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.issuance_finished, "Already finished"
    self.issuance_finished = True


@external
def set_document(_name: String[32], _uri: String[256], _document_hash: bytes32):
    """
    @notice 设置法律文档（招股书、年报等）
    @param _name 文档名称
    @param _uri 文档URI（IPFS/HTTP）
    @param _document_hash 文档哈希（SHA256）
    """
    assert msg.sender == self.owner, "Only owner"

    self.documents[_name] = _uri
    self.documentHashes[_name] = _document_hash

    # 维护迁移列表
    # 检查是否已在列表中
    found: bool = False
    for doc_name: String[32] in self.documentList:
        if doc_name == _name:
            found = True
            break
    if not found:
        self.documentList.append(_name)

    log DocumentUpdated(_name, _uri, _document_hash)


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
    # 从 Provider 获取 KYC 管理合约地址（缓存避免重复调用）
    kyc: address = self._get_kyc_manager()

    # 0. 铸造（from = zero address）- 只检查接收方
    if _from == empty(address):
        if not staticcall IKYCManager(kyc).isVerified(_to):
            return 2  # 接收方未通过KYC
        if staticcall IKYCManager(kyc).isFrozen(_to):
            return 4  # 接收方账户冻结
        return 0

    # 1. 销毁（to = zero address）- 只检查发送方
    if _to == empty(address):
        if not staticcall IKYCManager(kyc).isVerified(_from):
            return 1  # 发送方未通过KYC
        if staticcall IKYCManager(kyc).isFrozen(_from):
            return 3  # 发送方账户冻结
        if self.balanceOf[_from] < _value:
            return 7  # 余额不足
        return 0
    
    # 2. 检查金额
    if _value == 0:
        return 6  # 转账金额为零

    # 3. 检查发送方KYC
    if not staticcall IKYCManager(kyc).isVerified(_from):
        return 1  # 发送方未通过KYC

    # 4. 检查接收方KYC
    if not staticcall IKYCManager(kyc).isVerified(_to):
        return 2  # 接收方未通过KYC

    # 5. 检查发送方是否冻结
    if staticcall IKYCManager(kyc).isFrozen(_from):
        return 3  # 发送方账户冻结

    # 6. 检查接收方是否冻结
    if staticcall IKYCManager(kyc).isFrozen(_to):
        return 4  # 接收方账户冻结

    # 7. 检查余额
    if self.balanceOf[_from] < _value:
        return 7  # 余额不足

    # 8. 检查投资者上限（仅当接收方首次接收时）
    if self.balanceOf[_to] == 0:
        investorCount: uint256 = staticcall IKYCManager(kyc).investorCount()
        maxInvestors: uint256 = staticcall IKYCManager(kyc).maxInvestors()
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
    assert not self.issuance_finished, "Issuance finished"

    # STO合规检查
    self._checkTransferRestriction(empty(address), _to, _amount)

    self.totalSupply += _amount
    self.balanceOf[_to] += _amount

    # 维护迁移账户列表
    self._trackAccount(_to)

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

    # 维护迁移账户列表
    self._trackAccount(_to)
    self._trackAccount(msg.sender)

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

    # 维护迁移列表
    self._trackAccount(msg.sender)
    self._trackAccount(_spender)
    if _amount > 0:
        self._trackAllowance(msg.sender, _spender)

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

    # 维护迁移账户列表
    self._trackAccount(_from)
    self._trackAccount(_to)
    self._trackAccount(msg.sender)

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
    assert msg.sender == self.transfer_agent, "Only transfer agent"
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
    assert msg.sender == self.transfer_agent, "Only transfer agent"
    assert self.balanceOf[_from] >= _amount, "Insufficient balance"
    
    self.balanceOf[_from] -= _amount
    self.totalSupply -= _amount
    
    log Transfer(_from, empty(address), _amount)
    log ForcedTransfer(_from, empty(address), _amount, _reason)


# ==================== 查询功能 ====================

@view
@external
def get_document(_name: String[32]) -> (String[256], bytes32):
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


@view
@external
def get_kyc_manager() -> (address, bool):
    """
    @notice 获取KYC管理合约地址及配置状态（纯 Provider 模式）
    @return (KYC管理合约地址, 是否已配置)
    @dev 从 AddressProvider 获取，零地址表示未在 Provider 中注册
    """
    kyc: address = self._get_kyc_manager()
    is_configured: bool = kyc != empty(address)
    return (kyc, is_configured)


@view
@external
def get_address_provider() -> address:
    """
    @notice 获取 AddressProvider 地址
    @return AddressProvider 合约地址
    """
    return ADDRESS_PROVIDER


# ==================== 依赖查询功能 ====================

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖（纯 Provider 模式）
    @return (unbound_required, bound_all, unbound_optional) 未绑定必须依赖、已绑定所有依赖、未绑定可选依赖
    @dev 必须依赖: KYC (通过 AddressProvider)
    @dev 可选依赖: CapitalOracle (预言机，仍通过 setter)
    """
    unbound_required: DynArray[String[50], 10] = []
    bound_all: DynArray[String[50], 10] = []
    unbound_optional: DynArray[String[50], 10] = []

    # 检查必须依赖（从 Provider 获取）
    kyc: address = self._get_kyc_manager()
    if kyc == empty(address):
        unbound_required.append("KYC")
    else:
        bound_all.append("KYC")

    # 检查可选依赖（仍用 setter 模式）
    if self.oracle == empty(address):
        unbound_optional.append("CapitalOracle")
    else:
        bound_all.append("CapitalOracle")

    return unbound_required, bound_all, unbound_optional


# ==================== 迁移辅助getter函数 ====================

@external
@view
def get_account_list() -> DynArray[address, 5000]:
    """
    @notice 获取账户列表（用于迁移）
    @return 账户地址动态数组
    @dev 包含所有有余额或授权的账户
    """
    return self.accountList


@external
@view
def get_balance_of(_account: address) -> uint256:
    """
    @notice 获取账户余额（用于迁移）
    @param _account 账户地址
    @return 余额
    """
    return self.balanceOf[_account]


@external
@view
def get_allowance(_owner: address, _spender: address) -> uint256:
    """
    @notice 获取授权额度（用于迁移）
    @param _owner 所有者地址
    @param _spender 授权者地址
    @return 授权额度
    """
    return self.allowance[_owner][_spender]


@external
@view
def get_allowance_list() -> DynArray[address, 10000]:
    """
    @notice 获取授权对列表（用于迁移）
    @return 授权对地址动态数组 [owner1, spender1, owner2, spender2, ...]
    @dev 包含所有有授权的账户对
    """
    return self.allowanceList


# ==================== 所有权管理 ====================

@external
def transfer_ownership(_new_owner: address):
    """
    @notice 转移所有权
    @param _new_owner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    self.owner = _new_owner


# ==================== 合约迁移功能 ====================

@external
def migrate(new_contract: address):
    """
    @notice 迁移所有状态到新合约
    @param new_contract 新合约地址（必须实现 receive_migration 接口）
    @dev 迁移后设置 migrated 标志，不自动暂停
    """
    assert msg.sender == self.owner, "Only owner"
    assert not self.migrated, "Already migrated"
    assert new_contract != empty(address), "Invalid address"

    # CRITICAL FIX: 先设置迁移标志，防止重入攻击
    self.migrated = True

    # 调用新合约的接收函数，传入 self（旧合约地址）
    extcall IMigration(new_contract).receive_migration(self)

    log Migrated(self, new_contract, block.timestamp)


@external
@view
def is_migrated() -> bool:
    """
    @notice 检查合约是否已迁移
    @return True 如果已迁移到新合约
    """
    return self.migrated


@external
def receive_migration(old_contract: address):
    """
    @notice 从旧合约接收迁移状态（纯 Provider 模式）
    @param old_contract 旧合约地址
    @dev 只有旧合约可以调用此函数
    @dev 注意：KYC Manager 通过 AddressProvider 获取，不需要迁移
    """
    assert msg.sender == old_contract, "Only old contract"

    old: IMigration = IMigration(old_contract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    self.name = staticcall old.name()
    self.symbol = staticcall old.symbol()
    self.decimals = staticcall old.decimals()
    self.totalSupply = staticcall old.totalSupply()
    # 注意: kyc_manager 通过 AddressProvider 获取，不需要迁移
    self.transfer_agent = staticcall old.transfer_agent()
    self.issuance_finished = staticcall old.issuance_finished()

    # 迁移用户余额
    accounts: DynArray[address, 5000] = staticcall old.get_account_list()
    for account: address in accounts:
        balance: uint256 = staticcall old.get_balance_of(account)
        if balance > 0:
            self.balanceOf[account] = balance
            self.accountList.append(account)

    # 迁移授权（通过allowanceList追踪 - O(n)复杂度）
    allowance_pairs: DynArray[address, 10000] = staticcall old.get_allowance_list()
    idx: uint256 = 0
    for addr: address in allowance_pairs:
        if idx % 2 == 0 and idx + 1 < len(allowance_pairs):
            owner: address = addr
            spender: address = allowance_pairs[idx + 1]
            allowance_amount: uint256 = staticcall old.get_allowance(owner, spender)
            if allowance_amount > 0:
                self.allowance[owner][spender] = allowance_amount
                self.allowanceList.append(owner)
                self.allowanceList.append(spender)
        idx += 1

    # 迁移 minters
    minters_list: DynArray[address, 100] = staticcall old.get_minter_list()
    for minter: address in minters_list:
        self.minters[minter] = True

    # 迁移 burners
    burners_list: DynArray[address, 100] = staticcall old.get_burner_list()
    for burner: address in burners_list:
        self.burners[burner] = True

    # 迁移文档
    doc_names: DynArray[String[32], 50] = staticcall old.get_document_list()
    for doc_name: String[32] in doc_names:
        uri: String[256] = empty(String[256])
        doc_hash: bytes32 = empty(bytes32)
        uri, doc_hash = staticcall old.get_document(doc_name)
        self.documents[doc_name] = uri
        self.documentHashes[doc_name] = doc_hash


# ==================== 迁移 getter 函数 ====================

# 为迁移添加的状态列表（自动生成 public getter）
minterList: public(DynArray[address, 100])
burnerList: public(DynArray[address, 100])
documentList: public(DynArray[String[32], 50])
