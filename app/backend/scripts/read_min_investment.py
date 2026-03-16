#!/usr/bin/env python3
"""Read min investment from deployed VankeSubscription contract."""

from ape import project

CONTRACT_ADDRESS = "0x37dD26d18abeC2d311e82177f9fa58E9DC14b579"


def main():
    subscription = project.VankeSubscription.at(CONTRACT_ADDRESS)
    owner = subscription.owner()
    min_investment = subscription.min_investment()
    print(f"Contract: {CONTRACT_ADDRESS}")
    print(f"Owner: {owner}")
    print(f"min_investment: {min_investment}")
