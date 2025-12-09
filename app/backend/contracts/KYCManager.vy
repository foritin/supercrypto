# @version 0.3.10
"""
@title KYC/AML Manager
@notice 管理投资者的KYC验证、白名单和合规状态
@dev STO合规的核心组件 - 符合证券法要求
"""

# 事件
event InvestorAdded:
    investor: indexed(address)
    country: String[2]
    accreditedInvestor: bool
    timestamp: uint256

event InvestorUpdated:
    investor: indexed(address)
    verified: bool
    timestamp: uint256

event InvestorRemoved:
    investor: indexed(address)
    reason: String[100]
    timestamp: uint256

event CountryBlocked:
    country: String[2]
    blocked: bool

event VerifierSet:
    verifier: indexed(address)
    enabled: bool

event InvestorFrozen:
    investor: indexed(address)
    frozen: bool
    reason: String[100]

# 投资者信息结构
struct InvestorInfo:
    verified: bool                  # KYC是否通过
    country: String[2]              # 国家代码 (ISO 3166-1 alpha-2)
    accreditedInvestor: bool        # 是否为合格投资者
    addedTime: uint256              # 添加时间
    verificationTime: uint256       # 验证时间
    expiryTime: uint256            # 过期时间（0表示永久）
    frozen: bool                    # 账户是否冻结

# 状态变量
owner: public(address)
transferAgent: public(address)      # 转让代理（监管角色）

# 投资者数据
investors: public(HashMap[address, InvestorInfo])
investorCount: public(uint256)
accreditedInvestorCount: public(uint256)

# 验证者（可执行KYC的地址）
verifiers: public(HashMap[address, bool])

# 国家黑名单
blockedCountries: public(HashMap[String[2], bool])

# 限制
maxInvestors: public(uint256)       # 最大投资者数量（Reg D限制：500人）
kycExpiryPeriod: public(uint256)   # KYC有效期（秒，0=永久）

# 常量
MAX_INVESTOR_LIMIT: constant(uint256) = 2000  # 最大投资者上限


@external
def __init__():
    """
    @notice 初始化KYC管理合约
    """
    self.owner = msg.sender
    self.transferAgent = msg.sender
    self.maxInvestors = 500  # 默认Reg D限制
    self.kycExpiryPeriod = 365 * 24 * 3600  # 默认1年有效期
    
    # 设置owner为默认验证者
    self.verifiers[msg.sender] = True
    
    # 默认阻止高风险国家（示例）
    self.blockedCountries["KP"] = True  # 朝鲜
    self.blockedCountries["IR"] = True  # 伊朗
    self.blockedCountries["SY"] = True  # 叙利亚


@external
def setVerifier(_verifier: address, _enabled: bool):
    """
    @notice 设置KYC验证者权限
    @param _verifier 验证者地址
    @param _enabled 是否启用
    """
    assert msg.sender == self.owner, "Only owner"
    self.verifiers[_verifier] = _enabled
    log VerifierSet(_verifier, _enabled)


@external
def setTransferAgent(_agent: address):
    """
    @notice 设置转让代理
    @param _agent 转让代理地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _agent != empty(address), "Invalid address"
    self.transferAgent = _agent


@external
def setMaxInvestors(_max: uint256):
    """
    @notice 设置最大投资者数量
    @param _max 最大投资者数（必须<=2000）
    """
    assert msg.sender == self.owner, "Only owner"
    assert _max > 0 and _max <= MAX_INVESTOR_LIMIT, "Invalid max investors"
    self.maxInvestors = _max


@external
def setKYCExpiryPeriod(_period: uint256):
    """
    @notice 设置KYC有效期
    @param _period 有效期（秒，0=永久）
    """
    assert msg.sender == self.owner, "Only owner"
    self.kycExpiryPeriod = _period


@external
def setBlockedCountry(_country: String[2], _blocked: bool):
    """
    @notice 设置国家黑名单
    @param _country 国家代码
    @param _blocked 是否阻止
    """
    assert msg.sender == self.owner, "Only owner"
    self.blockedCountries[_country] = _blocked
    log CountryBlocked(_country, _blocked)


@external
def addInvestor(
    _investor: address,
    _country: String[2],
    _accreditedInvestor: bool
):
    """
    @notice 添加投资者（需KYC验证）
    @param _investor 投资者地址
    @param _country 国家代码
    @param _accreditedInvestor 是否为合格投资者
    """
    assert self.verifiers[msg.sender], "Not authorized verifier"
    assert _investor != empty(address), "Invalid address"
    assert not self.blockedCountries[_country], "Country blocked"
    assert self.investorCount < self.maxInvestors, "Investor limit reached"
    
    # 检查是否已存在
    existingInvestor: InvestorInfo = self.investors[_investor]
    
    if existingInvestor.addedTime == 0:
        # 新投资者
        self.investorCount += 1
    elif existingInvestor.accreditedInvestor and not _accreditedInvestor:
        # 如果从合格降为非合格
        self.accreditedInvestorCount -= 1
    
    if _accreditedInvestor and not existingInvestor.accreditedInvestor:
        self.accreditedInvestorCount += 1
    
    # 计算过期时间
    expiryTime: uint256 = 0
    if self.kycExpiryPeriod > 0:
        expiryTime = block.timestamp + self.kycExpiryPeriod
    
    # 更新投资者信息
    self.investors[_investor] = InvestorInfo({
        verified: True,
        country: _country,
        accreditedInvestor: _accreditedInvestor,
        addedTime: block.timestamp if existingInvestor.addedTime == 0 else existingInvestor.addedTime,
        verificationTime: block.timestamp,
        expiryTime: expiryTime,
        frozen: False
    })
    
    log InvestorAdded(_investor, _country, _accreditedInvestor, block.timestamp)


@external
def updateInvestorVerification(_investor: address, _verified: bool):
    """
    @notice 更新投资者验证状态
    @param _investor 投资者地址
    @param _verified 验证状态
    """
    assert self.verifiers[msg.sender], "Not authorized verifier"
    
    investor: InvestorInfo = self.investors[_investor]
    assert investor.addedTime > 0, "Investor not found"
    
    self.investors[_investor].verified = _verified
    if _verified:
        # 重新验证，更新时间
        if self.kycExpiryPeriod > 0:
            self.investors[_investor].expiryTime = block.timestamp + self.kycExpiryPeriod
        self.investors[_investor].verificationTime = block.timestamp
    
    log InvestorUpdated(_investor, _verified, block.timestamp)


@external
def removeInvestor(_investor: address, _reason: String[100]):
    """
    @notice 移除投资者（撤销KYC）
    @param _investor 投资者地址
    @param _reason 移除原因
    """
    assert self.verifiers[msg.sender] or msg.sender == self.owner, "Not authorized"
    
    investor: InvestorInfo = self.investors[_investor]
    assert investor.addedTime > 0, "Investor not found"
    
    # 更新计数
    if investor.verified:
        self.investorCount -= 1
    if investor.accreditedInvestor:
        self.accreditedInvestorCount -= 1
    
    # 标记为未验证（不删除记录，保留审计追踪）
    self.investors[_investor].verified = False
    
    log InvestorRemoved(_investor, _reason, block.timestamp)


@external
def freezeInvestor(_investor: address, _freeze: bool, _reason: String[100]):
    """
    @notice 冻结/解冻投资者账户（监管功能）
    @param _investor 投资者地址
    @param _freeze 是否冻结
    @param _reason 原因
    """
    assert msg.sender == self.owner or msg.sender == self.transferAgent, "Not authorized"
    
    investor: InvestorInfo = self.investors[_investor]
    assert investor.addedTime > 0, "Investor not found"
    
    self.investors[_investor].frozen = _freeze
    
    log InvestorFrozen(_investor, _freeze, _reason)


@view
@external
def isVerified(_investor: address) -> bool:
    """
    @notice 检查投资者是否通过KYC验证
    @param _investor 投资者地址
    @return 是否验证
    """
    investor: InvestorInfo = self.investors[_investor]
    
    if not investor.verified:
        return False
    
    # 检查是否过期
    if investor.expiryTime > 0 and block.timestamp > investor.expiryTime:
        return False
    
    # 检查是否冻结
    if investor.frozen:
        return False
    
    return True


@view
@external
def isAccredited(_investor: address) -> bool:
    """
    @notice 检查是否为合格投资者
    @param _investor 投资者地址
    @return 是否合格投资者
    """
    return self.investors[_investor].accreditedInvestor and self.isVerified(_investor)


@view
@external
def isFrozen(_investor: address) -> bool:
    """
    @notice 检查账户是否冻结
    @param _investor 投资者地址
    @return 是否冻结
    """
    return self.investors[_investor].frozen


@view
@external
def getInvestorInfo(_investor: address) -> InvestorInfo:
    """
    @notice 获取投资者完整信息
    @param _investor 投资者地址
    @return 投资者信息
    """
    return self.investors[_investor]


@view
@external
def canInvest(_investor: address, _amount: uint256) -> bool:
    """
    @notice 检查投资者是否可以投资
    @param _investor 投资者地址
    @param _amount 投资金额（用于未来扩展，当前未使用）
    @return 是否可以投资
    """
    return self.isVerified(_investor)


@view
@external
def isCountryAllowed(_country: String[2]) -> bool:
    """
    @notice 检查国家是否允许
    @param _country 国家代码
    @return 是否允许
    """
    return not self.blockedCountries[_country]


@view
@external
def getRemainingSlots() -> uint256:
    """
    @notice 获取剩余投资者名额
    @return 剩余名额
    """
    if self.investorCount >= self.maxInvestors:
        return 0
    return self.maxInvestors - self.investorCount


@external
def transferOwnership(_newOwner: address):
    """
    @notice 转移所有权
    @param _newOwner 新所有者地址
    """
    assert msg.sender == self.owner, "Only owner"
    assert _newOwner != empty(address), "Invalid address"
    self.owner = _newOwner

