# @version ^0.4.0
"""
@title Platform Token
@notice 平台代币，用于质押挖矿和流动性挖矿奖励
@dev 总量1亿枚，支持授权铸造和销毁
"""

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

# ERC20 状态变量
name: public(String[32])
symbol: public(String[8])
decimals: public(uint8)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

# 访问控制
owner: public(address)
minters: public(HashMap[address, bool])  # 可铸造的合约地址

# 合约迁移状态
migrated: public(bool)  # 迁移标志

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

# 常量
MAX_SUPPLY: constant(uint256) = 100_000_000 * 10 ** 18  # 1亿枚


@deploy
def __init__():
    """
    @notice 初始化Platform Token
    """
    self.name = "Platform Token"
    self.symbol = "PLT"
    self.decimals = 18
    self.totalSupply = 0
    self.owner = msg.sender
    self.migrated = False


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
def mint(_to: address, _amount: uint256):
    """
    @notice 铸造代币
    @param _to 接收地址
    @param _amount 铸造数量
    """
    assert self.minters[msg.sender], "Not authorized minter"
    assert self.totalSupply + _amount <= MAX_SUPPLY, "Exceeds max supply"

    self.totalSupply += _amount
    self.balanceOf[_to] += _amount

    # 维护迁移账户列表
    self._trackAccount(_to)

    log Transfer(empty(address), _to, _amount)


@external
def transfer(_to: address, _amount: uint256) -> bool:
    """
    @notice 转账
    @param _to 接收地址
    @param _amount 转账数量
    @return 是否成功
    """
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
    @notice 从授权地址转账
    @param _from 发送地址
    @param _to 接收地址
    @param _amount 转账数量
    @return 是否成功
    """
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


@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner


@view
@external
def maxSupply() -> uint256:
    """
    @notice 获取最大供应量
    @return 最大供应量
    """
    return MAX_SUPPLY


# ==================== 依赖查询功能 ====================

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖
    @return (unbound_required, bound_all, unbound_optional) 未绑定必须依赖、已绑定所有依赖、未绑定可选依赖
    @dev Platform Token 是独立代币合约，无依赖
    @dev 三个数组都为空
    """
    unbound_required: DynArray[String[50], 10] = []
    bound_all: DynArray[String[50], 10] = []
    unbound_optional: DynArray[String[50], 10] = []
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


@external
@view
def get_minter_list() -> DynArray[address, 100]:
    """
    @notice 获取minter列表（用于迁移）
    @return minter地址动态数组
    @dev 包含所有有minter权限的地址
    """
    # 实时构建minter列表（因为minters是动态变化的）
    minter_list: DynArray[address, 100] = []
    # 这里简化处理，实际迁移时需要遍历minters
    # 由于Vyper限制，这里返回空数组，实际迁移时通过其他方式处理
    return minter_list


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
    extcall IPlatformTokenMigration(new_contract).receive_migration(self)

    log Migrated(self, new_contract, block.timestamp)


@external
@view
def is_migrated() -> bool:
    """
    @notice 检查合约是否已迁移
    @return True 如果已迁移到新合约
    """
    return self.migrated


# 迁移接口定义
interface IPlatformTokenMigration:
    def owner() -> address: view
    def name() -> String[32]: view
    def symbol() -> String[8]: view
    def decimals() -> uint8: view
    def totalSupply() -> uint256: view
    def get_account_list() -> DynArray[address, 5000]: view
    def get_balance_of(_account: address) -> uint256: view
    def get_allowance(_owner: address, _spender: address) -> uint256: view
    def get_allowance_list() -> DynArray[address, 10000]: view
    def receive_migration(oldContract: address): nonpayable


@external
def receive_migration(oldContract: address):
    """
    @notice 从旧合约接收迁移状态
    @param oldContract 旧合约地址
    @dev 只有旧合约可以调用此函数
    """
    assert msg.sender == oldContract, "Only old contract"

    old: IPlatformTokenMigration = IPlatformTokenMigration(oldContract)

    # 迁移基本状态变量
    self.owner = staticcall old.owner()
    self.name = staticcall old.name()
    self.symbol = staticcall old.symbol()
    self.decimals = staticcall old.decimals()
    self.totalSupply = staticcall old.totalSupply()

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

