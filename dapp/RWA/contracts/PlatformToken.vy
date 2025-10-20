# @version 0.3.10
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

# 常量
MAX_SUPPLY: constant(uint256) = 100_000_000 * 10 ** 18  # 1亿枚


@external
def __init__():
    """
    @notice 初始化Platform Token
    """
    self.name = "Platform Token"
    self.symbol = "PLT"
    self.decimals = 18
    self.totalSupply = 0
    self.owner = msg.sender


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

