# @version ^0.4.0
"""
@title Mock USDT Token
@notice 用于测试的模拟USDT稳定币合约
@dev 标准ERC20实现，任何人都可以铸造（仅用于测试）
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

# ERC20 状态变量
name: public(String[32])
symbol: public(String[8])
decimals: public(uint8)
totalSupply: public(uint256)

balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])


@deploy
def __init__():
    """
    @notice 初始化Mock USDT合约
    """
    self.name = "Mock Tether USD"
    self.symbol = "USDT"
    self.decimals = 6  # USDT使用6位小数
    self.totalSupply = 0


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

