const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TreasuryMultisig - Zero Signer Deployment", function () {
  let TreasuryMultisig;
  let treasury;
  let AddressProvider;
  let provider;
  let owner;
  let signer1, signer2, signer3;

  beforeEach(async function () {
    [owner, signer1, signer2, signer3] = await ethers.getSigners();
    
    // Deploy AddressProvider
    const AddressProviderFactory = await ethers.getContractFactory("AddressProvider");
    provider = await AddressProviderFactory.deploy();
    await provider.waitForDeployment();
    
    // Deploy TreasuryMultisig with empty signers
    TreasuryMultisig = await ethers.getContractFactory("TreasuryMultisig");
    treasury = await TreasuryMultisig.deploy([], 0, await provider.getAddress());
    await treasury.waitForDeployment();
  });

  it("should deploy with zero signers", async function () {
    expect(await treasury.is_configured()).to.be.false;
    expect(await treasury.required_signatures()).to.equal(0);
    expect(await treasury.proposal_count()).to.equal(0);
    
    const signers = await treasury.get_signers();
    expect(signers.length).to.equal(0);
  });

  it("should allow owner to configure signers after deployment", async function () {
    // Configure signers
    const signers = [signer1.address, signer2.address, signer3.address];
    await treasury.owner_configure_signers(signers, 2);
    
    // Verify configuration
    expect(await treasury.is_configured()).to.be.true;
    expect(await treasury.required_signatures()).to.equal(2);
    
    const configuredSigners = await treasury.get_signers();
    expect(configuredSigners.length).to.equal(3);
    expect(configuredSigners).to.include(signer1.address);
    expect(configuredSigners).to.include(signer2.address);
    expect(configuredSigners).to.include(signer3.address);
  });

  it("should not allow operations before configuration", async function () {
    // Try to create proposal before configuration
    await expect(
      treasury.connect(signer1).create_proposal(
        signer1.address,
        "0x0000000000000000000000000000000000000001",
        1000,
        "Test proposal"
      )
    ).to.be.revertedWith("Contract not configured: signers not set");
  });

  it("should allow operations after configuration", async function () {
    // Configure signers first
    const signers = [signer1.address, signer2.address, signer3.address];
    await treasury.owner_configure_signers(signers, 2);
    
    // Now create proposal should work
    await expect(
      treasury.connect(signer1).create_proposal(
        signer1.address,
        "0x0000000000000000000000000000000000000001",
        1000,
        "Test proposal"
      )
    ).not.to.be.reverted;
  });
});
