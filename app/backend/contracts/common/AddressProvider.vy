# @version ^0.4.0
"""
@title AddressProvider
@notice 公共合约地址注册表，支持热更新
@dev 参考 Aave V3 PoolAddressesProvider 设计
     所有项目合约通过此合约获取公共依赖（KYC、USDT等）
     更新公共合约只需 1 次交易，所有依赖合约自动生效
"""

# ============ 事件定义 ============

event AddressUpdated:
    id: indexed(bytes32)
    old_address: address
    new_address: address

event OwnershipTransferStarted:
    previous_owner: indexed(address)
    new_owner: indexed(address)

event OwnershipTransferred:
    previous_owner: indexed(address)
    new_owner: indexed(address)

# ============ 常量定义 ============

# 公共合约 Key
KYC_MANAGER: constant(bytes32) = keccak256("KYC_MANAGER")
USDT: constant(bytes32) = keccak256("USDT")
USDC: constant(bytes32) = keccak256("USDC")
TIMELOCK: constant(bytes32) = keccak256("TIMELOCK")
MULTI_SIG: constant(bytes32) = keccak256("MULTI_SIG")

# Vanke 项目合约 Key
VANKE_RWA_TOKEN: constant(bytes32) = keccak256("VANKE_RWA_TOKEN")
VANKE_PLATFORM_TOKEN: constant(bytes32) = keccak256("VANKE_PLATFORM_TOKEN")
VANKE_SUBSCRIPTION: constant(bytes32) = keccak256("VANKE_SUBSCRIPTION")
VANKE_STAKING: constant(bytes32) = keccak256("VANKE_STAKING")
VANKE_LIQUIDITY_MINING: constant(bytes32) = keccak256("VANKE_LIQUIDITY_MINING")

# 国库地址 Key
TREASURY: constant(bytes32) = keccak256("TREASURY")

# 国库多签合约 Key
TREASURY_MULTISIG: constant(bytes32) = keccak256("TREASURY_MULTISIG")

# ============ 存储变量 ============

owner: public(address)
pending_owner: public(address)
addresses: HashMap[bytes32, address]  # 类型标识 => 合约地址

# 注册的合约类型列表（用于遍历）
registered_types: DynArray[bytes32, 50]
type_registered: HashMap[bytes32, bool]

# ============ 构造函数 ============

@deploy
def __init__():
    """
    @notice 初始化 AddressProvider
    @dev owner 设为部署者，后续可转移给多签钱包
    """
    self.owner = msg.sender

# ============ Owner 函数 ============

@external
def owner_transfer_ownership(_new_owner: address):
    """
    @notice 开始所有权转移（两步转移）
    @param _new_owner 新 owner 地址
    @dev 需要新 owner 调用 owner_accept_ownership 确认
    """
    assert msg.sender == self.owner, "Only owner"
    assert _new_owner != empty(address), "Invalid address"
    
    self.pending_owner = _new_owner
    log OwnershipTransferStarted(self.owner, _new_owner)

@external
def owner_accept_ownership():
    """
    @notice 接受所有权转移
    @dev 仅 pending_owner 可调用
    """
    assert msg.sender == self.pending_owner, "Only pending owner"
    
    old_owner: address = self.owner
    self.owner = self.pending_owner
    self.pending_owner = empty(address)
    
    log OwnershipTransferred(old_owner, self.owner)

@external
def owner_renounce_ownership():
    """
    @notice 放弃所有权
    @dev 危险操作，将使合约不可更新
    """
    assert msg.sender == self.owner, "Only owner"
    
    log OwnershipTransferred(self.owner, empty(address))
    self.owner = empty(address)

# ============ Admin 函数 ============

@external
def admin_set_address(_id: bytes32, _addr: address):
    """
    @notice 设置或更新合约地址
    @param _id 合约类型标识 (KYC_MANAGER, USDT, etc.)
    @param _addr 新地址
    @dev 仅 owner 可调用
    """
    assert msg.sender == self.owner, "Only owner"
    
    old_addr: address = self.addresses[_id]
    self.addresses[_id] = _addr
    
    # 记录新类型
    if not self.type_registered[_id]:
        self.registered_types.append(_id)
        self.type_registered[_id] = True
    
    log AddressUpdated(_id, old_addr, _addr)

@external
def admin_batch_set_addresses(_ids: DynArray[bytes32, 20], _addrs: DynArray[address, 20]):
    """
    @notice 批量设置合约地址
    @param _ids 合约类型标识数组
    @param _addrs 地址数组
    @dev 数组长度必须相等
    """
    assert msg.sender == self.owner, "Only owner"
    assert len(_ids) == len(_addrs), "Length mismatch"
    
    for i: uint256 in range(20):
        if i >= len(_ids):
            break
        
        old_addr: address = self.addresses[_ids[i]]
        self.addresses[_ids[i]] = _addrs[i]
        
        if not self.type_registered[_ids[i]]:
            self.registered_types.append(_ids[i])
            self.type_registered[_ids[i]] = True
        
        log AddressUpdated(_ids[i], old_addr, _addrs[i])

# ============ 查询函数 ============

@view
@external
def get_address(_id: bytes32) -> address:
    """
    @notice 通用地址查询
    @param _id 合约类型标识
    @return 注册的合约地址
    """
    return self.addresses[_id]

@view
@external
def get_kyc_manager() -> address:
    """@notice 获取 KYC 管理合约地址"""
    return self.addresses[KYC_MANAGER]

@view
@external
def get_usdt() -> address:
    """@notice 获取 USDT 代币地址"""
    return self.addresses[USDT]

@view
@external
def get_usdc() -> address:
    """@notice 获取 USDC 代币地址"""
    return self.addresses[USDC]

@view
@external
def get_timelock() -> address:
    """@notice 获取 Timelock 合约地址"""
    return self.addresses[TIMELOCK]

@view
@external
def get_multi_sig() -> address:
    """@notice 获取多签钱包地址"""
    return self.addresses[MULTI_SIG]

@view
@external
def get_vanke_rwa_token() -> address:
    """@notice 获取 Vanke RWA Token 地址"""
    return self.addresses[VANKE_RWA_TOKEN]

@view
@external
def get_vanke_platform_token() -> address:
    """@notice 获取 Vanke Platform Token 地址"""
    return self.addresses[VANKE_PLATFORM_TOKEN]

@view
@external
def get_vanke_subscription() -> address:
    """@notice 获取 Vanke Subscription 地址"""
    return self.addresses[VANKE_SUBSCRIPTION]

@view
@external
def get_vanke_staking() -> address:
    """@notice 获取 Vanke Staking 地址"""
    return self.addresses[VANKE_STAKING]

@view
@external
def get_vanke_liquidity_mining() -> address:
    """@notice 获取 Vanke LiquidityMining 地址"""
    return self.addresses[VANKE_LIQUIDITY_MINING]


@view
@external
def get_treasury() -> address:
    """@notice 获取国库地址"""
    return self.addresses[TREASURY]


@view
@external
def get_treasury_multisig() -> address:
    """@notice 获取国库多签合约地址"""
    return self.addresses[TREASURY_MULTISIG]


@external
def set_treasury_multisig(_address: address):
    """
    @notice 设置国库多签合约地址
    @param _address TreasuryMultisig合约地址
    @dev 仅owner可调用
    """
    assert msg.sender == self.owner, "Only owner"
    
    old_addr: address = self.addresses[TREASURY_MULTISIG]
    self.addresses[TREASURY_MULTISIG] = _address
    
    # 如果是新类型，添加到注册列表
    if old_addr == empty(address):
        self.registered_types.append(TREASURY_MULTISIG)
    
    log AddressUpdated(TREASURY_MULTISIG, old_addr, _address)


@view
@external
def get_registered_types() -> DynArray[bytes32, 50]:
    """
    @notice 获取所有已注册的合约类型
    @return 类型标识数组
    """
    return self.registered_types

@view
@external
def get_all_addresses() -> (DynArray[bytes32, 50], DynArray[address, 50]):
    """
    @notice 获取所有注册的合约类型和地址
    @return (类型数组, 地址数组)
    """
    addrs: DynArray[address, 50] = []
    for t: bytes32 in self.registered_types:
        addrs.append(self.addresses[t])
    return (self.registered_types, addrs)
