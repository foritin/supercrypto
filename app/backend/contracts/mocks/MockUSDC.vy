# MockUSDC.vy
# @version ^0.3.10

name: public(String[32])
symbol: public(String[32])
decimals: public(uint8)
totalSupply: public(uint256)
balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])

@external
def __init__():
    self.name = "Mock USDC"
    self.symbol = "USDC"
    self.decimals = 6

@external
def mint(_to: address, _amount: uint256):
    """任何人都可以 mint（仅测试用）"""
    self.balanceOf[_to] += _amount
    self.totalSupply += _amount

@external
def transfer(_to: address, _amount: uint256) -> bool:
    self.balanceOf[msg.sender] -= _amount
    self.balanceOf[_to] += _amount
    return True

@external
def approve(_spender: address, _amount: uint256) -> bool:
    self.allowance[msg.sender][_spender] = _amount
    return True

@external
def transferFrom(_from: address, _to: address, _amount: uint256) -> bool:
    self.allowance[_from][msg.sender] -= _amount
    self.balanceOf[_from] -= _amount
    self.balanceOf[_to] += _amount
    return True