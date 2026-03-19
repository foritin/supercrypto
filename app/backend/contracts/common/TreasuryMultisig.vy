# @version ^0.4.0
"""
@title TreasuryMultisig - Treasury Multisig Redemption Contract
@notice Treasury multisig redemption with 2/3 threshold
@dev User redemption requires multisig approval
"""

# ============ Interfaces ============

interface IERC20:
    def transfer(_to: address, _amount: uint256) -> bool: nonpayable
    def transferFrom(_from: address, _to: address, _amount: uint256) -> bool: nonpayable
    def balanceOf(_account: address) -> uint256: view
    def decimals() -> uint8: view

interface IVankeSubscription:
    def execute_redemption(_subscription_id: uint256, _user: address): nonpayable

interface IAddressProvider:
    def get_vanke_subscription() -> address: view

interface IMigration:
    def owner() -> address: view
    def required_signatures() -> uint256: view
    def get_signers() -> DynArray[address, 10]: view
    def get_proposal(_proposal_id: uint256) -> Proposal: view
    def proposal_count() -> uint256: view
    def paused() -> bool: view
    def is_migrated() -> bool: view
    def receive_migration(old_contract: address): nonpayable

# ============ Events ============

event ProposalCreated:
    proposal_id: indexed(uint256)
    recipient: indexed(address)
    token: address
    amount: uint256
    description: String[256]

event ProposalSigned:
    proposal_id: indexed(uint256)
    signer: indexed(address)
    signature_count: uint256

event ProposalExecuted:
    proposal_id: indexed(uint256)
    recipient: indexed(address)
    token: address
    amount: uint256
    executed_at: uint256

event SignerAdded:
    signer: indexed(address)
    added_by: indexed(address)

event SignerRemoved:
    signer: indexed(address)
    removed_by: indexed(address)

event RequiredSignaturesChanged:
    old_required: uint256
    new_required: uint256

event SignersConfigured:
    signers: DynArray[address, 10]
    required_signatures: uint256
    configured_by: indexed(address)

event RedemptionCompleted:
    proposal_id: indexed(uint256)
    subscription_id: indexed(uint256)
    user: indexed(address)
    principal: uint256
    interest: uint256

event EmergencyWithdraw:
    token: indexed(address)
    recipient: indexed(address)
    amount: uint256

event MigrationCompleted:
    old_contract: indexed(address)
    new_contract: indexed(address)
    migrated_at: uint256

# ============ Structs ============

struct Proposal:
    id: uint256
    recipient: address
    token: address
    amount: uint256
    description: String[256]
    signature_count: uint256
    executed: bool
    executed_at: uint256
    created_at: uint256
    is_issuance: bool
    subscription_id: uint256
    user: address

# ============ State Variables ============

owner: public(address)
required_signatures: public(uint256)
proposal_count: public(uint256)
signers: public(DynArray[address, 10])
is_signer: public(HashMap[address, bool])
proposals: public(HashMap[uint256, Proposal])
has_signed: public(HashMap[uint256, HashMap[address, bool]])
address_provider: public(address)
paused: public(bool)
migrated: public(bool)
is_configured: public(bool)

# ============ Constructor ============

@deploy
def __init__(_signers: DynArray[address, 10], _required_signatures: uint256, _address_provider: address):
    """
    @notice Initialize treasury multisig
    @dev Support zero signer deployment, configure later via owner_configure_signers
    @param _signers Initial signers (can be empty)
    @param _required_signatures Required sigs (0 if _signers empty)
    @param _address_provider AddressProvider address
    """
    assert _address_provider != empty(address), "Invalid address provider"
    
    self.owner = msg.sender
    self.address_provider = _address_provider
    self.proposal_count = 0
    self.paused = False
    self.migrated = False
    
    if len(_signers) > 0:
        assert len(_signers) >= 3, "Need at least 3 signers"
        assert _required_signatures >= 2, "Need at least 2 required signatures"
        assert _required_signatures <= len(_signers), "Required signatures exceeds signer count"
        
        self.required_signatures = _required_signatures
        self.is_configured = True
        
        for signer: address in _signers:
            assert signer != empty(address), "Invalid signer address"
            assert not self.is_signer[signer], "Duplicate signer"
            self.signers.append(signer)
            self.is_signer[signer] = True
            log SignerAdded(signer, msg.sender)
        
        log SignersConfigured(_signers, _required_signatures, msg.sender)
    else:
        self.required_signatures = 0
        self.is_configured = False

# ============ Internal Functions ============

@internal
@view
def _only_owner():
    assert msg.sender == self.owner, "Only owner"

@internal
@view
def _only_signer():
    assert self.is_signer[msg.sender], "Only signer"

@internal
@view
def _when_not_paused():
    assert not self.paused, "Contract is paused"

@internal
@view
def _when_not_migrated():
    assert not self.migrated, "Contract migrated"

# ============ Owner Functions ============

@external
def owner_pause():
    self._only_owner()
    self.paused = True

@external
def owner_unpause():
    self._only_owner()
    self.paused = False

@external
def owner_renounce_ownership():
    self._only_owner()
    self.owner = empty(address)

@external
def owner_add_signer(_signer: address):
    self._only_owner()
    assert len(self.signers) < 10, "Max signers reached"
    assert _signer != empty(address), "Invalid signer"
    assert not self.is_signer[_signer], "Already a signer"
    self.signers.append(_signer)
    self.is_signer[_signer] = True
    log SignerAdded(_signer, msg.sender)

@external
def owner_remove_signer(_signer: address):
    self._only_owner()
    assert self.is_signer[_signer], "Not a signer"
    assert len(self.signers) > self.required_signatures, "Would break threshold"
    
    new_signers: DynArray[address, 10] = []
    for signer: address in self.signers:
        if signer != _signer:
            new_signers.append(signer)
    self.signers = new_signers
    self.is_signer[_signer] = False
    log SignerRemoved(_signer, msg.sender)

@external
def owner_configure_signers(_signers: DynArray[address, 10], _required_signatures: uint256):
    """
    @notice Configure signers (owner only, only once if not configured)
    """
    self._only_owner()
    assert len(_signers) >= 3, "Need at least 3 signers"
    assert _required_signatures >= 2, "Need at least 2 required signatures"
    
    # Clear old signers if any
    if self.is_configured:
        for old_signer: address in self.signers:
            self.is_signer[old_signer] = False
        self.signers = []
    
    # Add new signers
    for signer: address in _signers:
        assert signer != empty(address), "Invalid signer address"
        assert not self.is_signer[signer], "Duplicate signer"
        self.signers.append(signer)
        self.is_signer[signer] = True
        log SignerAdded(signer, msg.sender)
    
    self.required_signatures = _required_signatures
    self.is_configured = True
    log SignersConfigured(_signers, _required_signatures, msg.sender)

# ============ Proposal Functions ============

@external
def create_proposal(_recipient: address, _token: address, _amount: uint256, _description: String[256]) -> uint256:
    """
    @notice Create withdrawal proposal
    """
    assert self.is_configured, "Contract not configured: signers not set"
    self._only_signer()
    self._when_not_paused()
    
    assert _recipient != empty(address), "Invalid recipient"
    assert _token != empty(address), "Invalid token"
    assert _amount > 0, "Amount must be positive"
    
    self.proposal_count += 1
    proposal_id: uint256 = self.proposal_count
    
    self.proposals[proposal_id] = Proposal(
        id=proposal_id,
        recipient=_recipient,
        token=_token,
        amount=_amount,
        description=_description,
        signature_count=0,
        executed=False,
        executed_at=0,
        created_at=block.timestamp,
        is_issuance=False,
        subscription_id=0,
        user=empty(address)
    )
    
    log ProposalCreated(proposal_id, _recipient, _token, _amount, _description)
    return proposal_id

@external
def sign_proposal(_proposal_id: uint256):
    """
    @notice Sign proposal
    """
    self._only_signer()
    self._when_not_paused()
    
    assert _proposal_id > 0 and _proposal_id <= self.proposal_count, "Invalid proposal"
    assert not self.proposals[_proposal_id].executed, "Already executed"
    assert not self.has_signed[_proposal_id][msg.sender], "Already signed"
    
    self.has_signed[_proposal_id][msg.sender] = True
    self.proposals[_proposal_id].signature_count += 1
    
    log ProposalSigned(_proposal_id, msg.sender, self.proposals[_proposal_id].signature_count)

@external
def execute_proposal(_proposal_id: uint256):
    """
    @notice Execute proposal
    """
    self._only_signer()
    self._when_not_paused()
    self._when_not_migrated()
    
    assert _proposal_id > 0 and _proposal_id <= self.proposal_count, "Invalid proposal"
    assert not self.proposals[_proposal_id].executed, "Already executed"
    assert self.proposals[_proposal_id].signature_count >= self.required_signatures, "Threshold not met"
    
    proposal: Proposal = self.proposals[_proposal_id]
    
    # Execute token transfer
    success: bool = extcall IERC20(proposal.token).transfer(proposal.recipient, proposal.amount)
    assert success, "Transfer failed"
    
    self.proposals[_proposal_id].executed = True
    self.proposals[_proposal_id].executed_at = block.timestamp
    
    log ProposalExecuted(_proposal_id, proposal.recipient, proposal.token, proposal.amount, block.timestamp)

# ============ View Functions ============

@external
@view
def get_signers() -> DynArray[address, 10]:
    return self.signers

@external
@view
def get_proposal(_proposal_id: uint256) -> Proposal:
    return self.proposals[_proposal_id]

@external
@view
def get_contract_status() -> (bool, bool, bool, uint256, uint256):
    return (self.paused, self.migrated, self.is_configured, self.proposal_count, len(self.signers))

# ============ Migration Functions ============

@external
def migrate_to_new_contract(_new_contract: address):
    """
    @notice Migrate to new contract
    """
    self._only_owner()
    self._when_not_paused()
    self._when_not_migrated()
    assert _new_contract != empty(address), "Invalid address"
    assert _new_contract != self, "Cannot migrate to self"
    
    self.migrated = True
    extcall IMigration(_new_contract).receive_migration(self)
    log MigrationCompleted(self, _new_contract, block.timestamp)

@external
def receive_migration(_old_contract: address):
    """
    @notice Receive migration (from old contract)
    """
    assert msg.sender == _old_contract, "Only old contract"
    assert not self.is_configured, "Already configured"
    
    old: IMigration = IMigration(_old_contract)
    
    self.owner = staticcall old.owner()
    self.required_signatures = staticcall old.required_signatures()
    self.proposal_count = staticcall old.proposal_count()
    self.paused = staticcall old.paused()
    
    old_signers: DynArray[address, 10] = staticcall old.get_signers()
    for signer: address in old_signers:
        self.signers.append(signer)
        self.is_signer[signer] = True
    
    self.is_configured = True
    log MigrationCompleted(_old_contract, self, block.timestamp)

# ============ Emergency Functions ============

@external
def emergency_withdraw(_token: address, _to: address, _amount: uint256):
    """
    @notice Emergency withdraw (owner only, for migration)
    """
    self._only_owner()
    success: bool = extcall IERC20(_token).transfer(_to, _amount)
    assert success, "Transfer failed"
    log EmergencyWithdraw(_token, _to, _amount)
