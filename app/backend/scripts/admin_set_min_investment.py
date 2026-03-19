#!/usr/bin/env python3
"""Set VankeSubscription min investment by owner account.

Usage:
  ape run admin_set_min_investment --network ethereum:hardhat:node
"""

from ape import accounts, project

CONTRACT_ADDRESS = "0x37dD26d18abeC2d311e82177f9fa58E9DC14b579"
NEW_MIN_INVESTMENT = 1 * 10**6


def main():
    subscription = project.VankeSubscription.at(CONTRACT_ADDRESS)

    owner = subscription.owner()
    before = subscription.min_investment()

    print(f"Contract: {CONTRACT_ADDRESS}")
    print(f"Owner: {owner}")
    print(f"Before min_investment: {before}")

    sender = None
    for account in accounts.test_accounts:
        if account.address.lower() == owner.lower():
            sender = account
            break

    if sender is None:
        raise RuntimeError(
            f"Owner {owner} not found in local test accounts; cannot send admin tx"
        )

    tx = subscription.admin_set_min_investment(NEW_MIN_INVESTMENT, sender=sender)

    after = subscription.min_investment()
    print(f"Tx hash: {tx.txn_hash}")
    print(f"After min_investment: {after}")

    if after != NEW_MIN_INVESTMENT:
        raise RuntimeError(f"Update failed: expected {NEW_MIN_INVESTMENT}, got {after}")

    print("✅ admin_set_min_investment succeeded")
