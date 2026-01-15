# @version ^0.4.0
"""
@title IAddressProvider Interface
@notice AddressProvider 接口定义
@dev 项目合约通过此接口查询依赖地址
"""

# ============ 通用查询 ============

@view
@external
def get_address(_id: bytes32) -> address:
    """
    @notice 通用地址查询
    @param _id 合约类型标识 (keccak256 of key string)
    @return 注册的合约地址
    """
    ...

# ============ 公共合约 Getter ============

@view
@external
def get_kyc_manager() -> address:
    """@notice 获取 KYC 管理合约地址"""
    ...

@view
@external
def get_usdt() -> address:
    """@notice 获取 USDT 代币地址"""
    ...

@view
@external
def get_usdc() -> address:
    """@notice 获取 USDC 代币地址"""
    ...

@view
@external
def get_timelock() -> address:
    """@notice 获取 Timelock 合约地址"""
    ...

@view
@external
def get_multi_sig() -> address:
    """@notice 获取多签钱包地址"""
    ...

# ============ Vanke 项目合约 Getter ============

@view
@external
def get_vanke_rwa_token() -> address:
    """@notice 获取 Vanke RWA Token 地址"""
    ...

@view
@external
def get_vanke_platform_token() -> address:
    """@notice 获取 Vanke Platform Token 地址"""
    ...

@view
@external
def get_vanke_subscription() -> address:
    """@notice 获取 Vanke Subscription 地址"""
    ...

@view
@external
def get_vanke_staking() -> address:
    """@notice 获取 Vanke Staking 地址"""
    ...

@view
@external
def get_vanke_liquidity_mining() -> address:
    """@notice 获取 Vanke LiquidityMining 地址"""
    ...

# ============ 注册信息查询 ============

@view
@external
def get_registered_types() -> DynArray[bytes32, 50]:
    """
    @notice 获取所有已注册的合约类型
    @return 类型标识数组
    """
    ...

@view
@external
def get_all_addresses() -> (DynArray[bytes32, 50], DynArray[address, 50]):
    """
    @notice 获取所有注册的合约类型和地址
    @return (类型数组, 地址数组)
    """
    ...

# ============ 所有权信息 ============

@view
@external
def owner() -> address:
    """@notice 获取 owner 地址"""
    ...

@view
@external
def pending_owner() -> address:
    """@notice 获取 pending owner 地址"""
    ...
