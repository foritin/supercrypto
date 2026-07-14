# @version ^0.4.0
"""
@title Mock USDC Token
@notice 用于测试的模拟USDC稳定币合约
@dev 标准ERC20实现，任何人都可以铸造（仅用于测试）
"""

# ============ 事件定义 ============

event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256

event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256

# ============ 存储变量 ============

name: public(String[32])
symbol: public(String[8])
decimals: public(uint8)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

# ============ 构造函数 ============

@deploy
def __init__():
    """
    @notice 初始化Mock USDC合约
    """
    self.name = "Mock USD Coin"
    self.symbol = "USDC"
    self.decimals = 6  # USDC使用6位小数
    self.totalSupply = 0

# ============ 核心业务函数 ============

@external
def mint(_to: address, _amount: uint256):
    """
    @notice 铸造代币（测试用）
    @param _to 接收地址
    @param _amount 铸造数量
    """
    self.totalSupply += _amount
    self.balanceOf[_to] += _amount
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

    log Transfer(_from, _to, _amount)
    return True


@external
def burn(_amount: uint256):
    """
    @notice 销毁代币
    @param _amount 销毁数量
    """
    assert self.balanceOf[msg.sender] >= _amount, "Insufficient balance"

    self.balanceOf[msg.sender] -= _amount
    self.totalSupply -= _amount

    log Transfer(msg.sender, empty(address), _amount)

# ============ 依赖查询功能 ============

@external
@view
def get_dependencies() -> (DynArray[String[50], 10], DynArray[String[50], 10], DynArray[String[50], 10]):
    """
    @notice 获取合约依赖
    @return (unbound_required, bound_all, unbound_optional) 未绑定必须依赖、已绑定所有依赖、未绑定可选依赖
    @dev Mock USDC 是独立测试合约，无依赖
    @dev 三个数组都为空
    """
    unbound_required: DynArray[String[50], 10] = []
    bound_all: DynArray[String[50], 10] = []
    unbound_optional: DynArray[String[50], 10] = []
    return unbound_required, bound_all, unbound_optional

# ============ 合约迁移功能 ============

@external
@view
def is_migrated() -> bool:
    """
    @notice 检查合约是否已迁移（Mock合约不支持迁移）
    @return False（Mock合约始终返回False）
    @dev 这是测试合约，不支持迁移功能
    """
    return False
